/**
 * Dependency-free report export. Opens a print-optimised window with the given
 * HTML so the user can save it as a PDF via the browser's print dialog.
 */
export function printReport(title: string, bodyHtml: string): void {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    alert("Please allow pop-ups to download your report.");
    return;
  }
  const now = new Date().toLocaleString("en-IN");
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; line-height: 1.5; }
  .brand { display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #2563EB; padding-bottom: 16px; margin-bottom: 24px; }
  .brand .logo { width: 32px; height: 32px; border-radius: 8px; background: #2563EB; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .brand h1 { font-size: 18px; margin: 0; }
  .brand .meta { margin-left: auto; font-size: 11px; color: #64748b; text-align: right; }
  h2 { font-size: 15px; margin: 24px 0 8px; color: #1e293b; }
  h3 { font-size: 13px; margin: 16px 0 6px; color: #334155; }
  p, li { font-size: 12px; }
  ul { margin: 4px 0 8px; padding-left: 18px; }
  .grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0; }
  .stat { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; min-width: 120px; }
  .stat .label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  .stat .value { font-size: 20px; font-weight: 700; color: #2563EB; }
  .pill { display: inline-block; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 2px 10px; font-size: 11px; margin: 2px 4px 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  th { color: #64748b; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
  .footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #94a3b8; }
  @media print { body { padding: 24px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="brand">
    <div class="logo">F</div>
    <h1>FUTRSEC</h1>
    <div class="meta">${escapeHtml(title)}<br/>Generated ${escapeHtml(now)}</div>
  </div>
  ${bodyHtml}
  <div class="footer">FUTRSEC — Cybersecurity Learning &amp; Placement Platform. This report is generated for the account holder and is confidential.</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };</script>
</body>
</html>`);
  win.document.close();
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
