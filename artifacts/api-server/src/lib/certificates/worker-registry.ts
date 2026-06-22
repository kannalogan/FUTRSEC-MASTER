import { getRedisClient, isRedisAvailable } from "../redis";
import { logger } from "../logger";

// Lightweight worker registry for the bulk certificate pipeline. Each in-process
// worker replica records a heartbeat in a Redis hash so the admin dashboard can
// show live worker status / utilization. A worker whose heartbeat is older than
// STALE_MS is considered down (e.g. the process was killed mid-job).
const KEY = "cert:workers";
const STALE_MS = 20000;
const PRUNE_MS = 5 * 60 * 1000;

export interface WorkerHeartbeat {
  workerId: string;
  partition: number;
  replica: number;
  pid: number;
  status: "idle" | "busy";
  // Number of shards this instance is processing concurrently. A worker is only
  // "idle" when this reaches 0 (CERT_WORKER_CONCURRENCY may keep several active).
  activeJobs: number;
  currentJobId: number | null;
  processed: number;
  startedAt: number;
  updatedAt: number;
}

export async function recordHeartbeat(
  hb: Omit<WorkerHeartbeat, "updatedAt">,
): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await getRedisClient().hset(
      KEY,
      hb.workerId,
      JSON.stringify({ ...hb, updatedAt: Date.now() }),
    );
  } catch {
    // Heartbeats are best-effort; the DB rows remain the source of truth.
  }
}

export async function removeWorker(workerId: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await getRedisClient().hdel(KEY, workerId);
  } catch {
    // ignore
  }
}

export async function listWorkers(): Promise<
  (WorkerHeartbeat & { alive: boolean })[]
> {
  if (!isRedisAvailable()) return [];
  let raw: Record<string, string> = {};
  try {
    raw = await getRedisClient().hgetall(KEY);
  } catch {
    return [];
  }
  const now = Date.now();
  const out: (WorkerHeartbeat & { alive: boolean })[] = [];
  const stale: string[] = [];
  for (const [id, json] of Object.entries(raw)) {
    try {
      const hb = JSON.parse(json) as WorkerHeartbeat;
      const age = now - hb.updatedAt;
      // Prune heartbeats that have been dead for a long time so a restarted
      // process with new worker ids doesn't accumulate ghost rows forever.
      if (age > PRUNE_MS) {
        stale.push(id);
        continue;
      }
      out.push({ ...hb, alive: age < STALE_MS });
    } catch {
      stale.push(id);
    }
  }
  if (stale.length > 0) {
    try {
      await getRedisClient().hdel(KEY, ...stale);
    } catch {
      // ignore
    }
  }
  out.sort((a, b) => a.workerId.localeCompare(b.workerId));
  return out;
}

export function logRegistryError(err: unknown): void {
  logger.warn({ err: (err as Error).message }, "cert worker registry error");
}
