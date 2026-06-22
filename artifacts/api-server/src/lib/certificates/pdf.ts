import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { Certificate, CertificateTemplate } from "@workspace/db";

/**
 * Data needed to render a certificate PDF. Pulled from the issued certificate
 * row plus the holder name and (optional) template branding.
 */
export interface CertificateRenderData {
  certificate: Pick<
    Certificate,
    | "certificateCode"
    | "title"
    | "type"
    | "careerTrack"
    | "courseName"
    | "internshipName"
    | "achievementLabel"
    | "durationText"
    | "issuedDate"
    | "expiresDate"
    | "verifyToken"
    | "status"
  >;
  holderName: string;
  template?: Pick<
    CertificateTemplate,
    "signatureName" | "bodyTemplate"
  > | null;
  /** Public verification URL encoded into the QR code. */
  verifyUrl: string;
}

const TRACK_LABELS: Record<string, string> = {
  soc: "Security Operations (SOC)",
  vapt: "Vulnerability Assessment & Penetration Testing",
  grc: "Governance, Risk & Compliance",
};

const TYPE_LABELS: Record<string, string> = {
  course_completion: "Certificate of Completion",
  internship: "Internship Certificate",
  achievement: "Certificate of Achievement",
};

const NAVY = "#0B1F3A";
const ACCENT = "#1FB6A6";
const GOLD = "#C9A227";
const MUTED = "#5B6B7F";

/** Replace {{placeholders}} in a body template with real values. */
function applyPlaceholders(
  template: string,
  data: CertificateRenderData,
): string {
  const c = data.certificate;
  const map: Record<string, string> = {
    holderName: data.holderName,
    title: c.title,
    certificateCode: c.certificateCode,
    courseName: c.courseName ?? "",
    internshipName: c.internshipName ?? "",
    achievementLabel: c.achievementLabel ?? "",
    durationText: c.durationText ?? "",
    issuedDate: formatDate(c.issuedDate),
    careerTrack: c.careerTrack ? TRACK_LABELS[c.careerTrack] ?? c.careerTrack : "",
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    key in map ? map[key] : "",
  );
}

function formatDate(d: string): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Render a certificate to a PDF Buffer. Landscape A4 with branded border,
 * dynamic body, embedded QR code linking to the public verification page, and
 * a status watermark for revoked / expired certificates.
 */
export async function renderCertificatePdf(
  data: CertificateRenderData,
): Promise<Buffer> {
  const c = data.certificate;
  const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
    margin: 1,
    width: 240,
    color: { dark: NAVY, light: "#FFFFFF" },
  });
  const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const W = doc.page.width;
  const H = doc.page.height;

  // Background + border frame.
  doc.rect(0, 0, W, H).fill("#FFFFFF");
  doc.lineWidth(6).strokeColor(NAVY).rect(24, 24, W - 48, H - 48).stroke();
  doc
    .lineWidth(1.5)
    .strokeColor(GOLD)
    .rect(34, 34, W - 68, H - 68)
    .stroke();

  // Header band.
  doc.rect(34, 34, W - 68, 70).fill(NAVY);
  doc
    .fillColor("#FFFFFF")
    .fontSize(26)
    .font("Helvetica-Bold")
    .text("FUTRSEC", 0, 56, { align: "center" });
  doc
    .fillColor(ACCENT)
    .fontSize(11)
    .font("Helvetica")
    .text("Cybersecurity Learning · Mentorship · Placement", 0, 86, {
      align: "center",
    });

  // Certificate type heading.
  const typeLabel = TYPE_LABELS[c.type] ?? "Certificate";
  doc
    .fillColor(NAVY)
    .fontSize(30)
    .font("Helvetica-Bold")
    .text(typeLabel.toUpperCase(), 0, 150, { align: "center", characterSpacing: 2 });

  doc
    .fillColor(MUTED)
    .fontSize(13)
    .font("Helvetica")
    .text("This is proudly presented to", 0, 196, { align: "center" });

  // Holder name.
  doc
    .fillColor(NAVY)
    .fontSize(40)
    .font("Helvetica-Bold")
    .text(data.holderName, 0, 222, { align: "center" });
  doc
    .moveTo(W / 2 - 160, 282)
    .lineTo(W / 2 + 160, 282)
    .lineWidth(1)
    .strokeColor(GOLD)
    .stroke();

  // Body.
  let body: string;
  if (data.template?.bodyTemplate) {
    body = applyPlaceholders(data.template.bodyTemplate, data);
  } else {
    const what =
      c.courseName || c.internshipName || c.achievementLabel || c.title;
    const trackPart = c.careerTrack
      ? ` in ${TRACK_LABELS[c.careerTrack] ?? c.careerTrack}`
      : "";
    const durationPart = c.durationText ? ` over ${c.durationText}` : "";
    body = `for successfully completing ${what}${trackPart}${durationPart}.`;
  }
  doc
    .fillColor("#22303F")
    .fontSize(14)
    .font("Helvetica")
    .text(body, W / 2 - 280, 298, { width: 560, align: "center" });

  // QR code + verification text (bottom-left).
  const qrSize = 96;
  const qrX = 70;
  const qrY = H - qrSize - 70;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text("Scan to verify authenticity", qrX - 6, qrY + qrSize + 4, {
      width: qrSize + 12,
      align: "center",
    });

  // Certificate metadata (bottom-center).
  doc
    .fillColor(NAVY)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(`Certificate ID: ${c.certificateCode}`, 0, H - 110, {
      align: "center",
    });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font("Helvetica")
    .text(`Issued: ${formatDate(c.issuedDate)}`, 0, H - 94, {
      align: "center",
    });
  if (c.expiresDate) {
    doc.text(`Valid until: ${formatDate(c.expiresDate)}`, 0, H - 82, {
      align: "center",
    });
  }

  // Signature (bottom-right).
  const sigName = data.template?.signatureName ?? "Authorized Signatory";
  const sigX = W - 240;
  const sigY = H - 96;
  doc
    .moveTo(sigX, sigY)
    .lineTo(sigX + 170, sigY)
    .lineWidth(1)
    .strokeColor(NAVY)
    .stroke();
  doc
    .fillColor(NAVY)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(sigName, sigX, sigY + 6, { width: 170, align: "center" });
  doc
    .fillColor(MUTED)
    .fontSize(8)
    .font("Helvetica")
    .text("FUTRSEC", sigX, sigY + 22, { width: 170, align: "center" });

  // Status watermark for non-active certificates.
  if (c.status === "revoked" || c.status === "expired") {
    doc.save();
    doc.rotate(-30, { origin: [W / 2, H / 2] });
    doc
      .fillColor(c.status === "revoked" ? "#D14343" : "#B0792B")
      .opacity(0.18)
      .fontSize(120)
      .font("Helvetica-Bold")
      .text(c.status.toUpperCase(), 0, H / 2 - 70, {
        align: "center",
        width: W,
      });
    doc.opacity(1).restore();
  }

  doc.end();
  return done;
}
