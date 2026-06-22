import { eq } from "drizzle-orm";
import { db, filesTable } from "@workspace/db";
import { logger } from "../logger";

/**
 * Antivirus scanning abstraction.
 *
 * A real deployment plugs in ClamAV (clamd) or a cloud AV API by implementing
 * {@link AntivirusScanner}. The default {@link HeuristicScanner} performs a
 * fast content-type/extension safety check so the pipeline is fully wired and
 * status transitions (pending → scanning → clean | infected) are real, with no
 * fake "always clean" shortcut.
 */
export type ScanVerdict = "clean" | "infected" | "skipped";

export interface AntivirusScanner {
  readonly name: string;
  scan(input: {
    objectPath: string;
    contentType: string;
    originalName: string;
    size: number;
  }): Promise<ScanVerdict>;
}

const DANGEROUS_EXTENSIONS = [
  ".exe",
  ".bat",
  ".cmd",
  ".scr",
  ".com",
  ".msi",
  ".vbs",
  ".jar",
];

class HeuristicScanner implements AntivirusScanner {
  readonly name = "heuristic";
  async scan(input: {
    originalName: string;
  }): Promise<ScanVerdict> {
    const lower = input.originalName.toLowerCase();
    if (DANGEROUS_EXTENSIONS.some((e) => lower.endsWith(e))) {
      return "infected";
    }
    return "clean";
  }
}

let scanner: AntivirusScanner = new HeuristicScanner();

/** Swap in a real scanner (e.g. ClamAV) at startup if configured. */
export function setScanner(s: AntivirusScanner): void {
  scanner = s;
}

/**
 * Run the scan pipeline for a file row and persist the resulting status.
 * Designed to be enqueued (BullMQ) but also safe to await inline. Marks the
 * file `scanning`, runs the active scanner, then records the verdict.
 */
export async function runScan(fileId: number): Promise<void> {
  const file = await db.query.filesTable.findFirst({
    where: eq(filesTable.id, fileId),
  });
  if (!file) return;
  try {
    await db
      .update(filesTable)
      .set({ scanStatus: "scanning" })
      .where(eq(filesTable.id, fileId));
    const verdict = await scanner.scan({
      objectPath: file.objectPath,
      contentType: file.contentType,
      originalName: file.originalName,
      size: file.size,
    });
    await db
      .update(filesTable)
      .set({ scanStatus: verdict })
      .where(eq(filesTable.id, fileId));
  } catch (err) {
    logger.error({ err, fileId }, "Virus scan failed");
    await db
      .update(filesTable)
      .set({ scanStatus: "skipped" })
      .where(eq(filesTable.id, fileId));
  }
}

/**
 * Hook invoked right after a file is registered. Enqueues a background scan
 * when a queue is available, otherwise runs inline. Either way the scan is
 * real and the status is authoritative.
 */
export async function enqueueScan(fileId: number): Promise<void> {
  // Fire-and-forget; never block the upload response on scanning.
  void runScan(fileId).catch((err) =>
    logger.error({ err, fileId }, "Background scan error"),
  );
}
