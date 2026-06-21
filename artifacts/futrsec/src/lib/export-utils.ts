export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number;
}

function cellValue<T>(row: T, col: ExportColumn<T>): string {
  const raw = col.format
    ? col.format(row)
    : (row as Record<string, unknown>)[col.key as string];
  if (raw == null) return "";
  return String(raw);
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV<T>(
  filename: string,
  columns: ExportColumn<T>[],
  rows: T[]
): void {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns.map((c) => escapeCsv(cellValue(row, c))).join(",")
    )
    .join("\n");
  const csv = `${header}\n${body}`;
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPDF<T>(
  title: string,
  columns: ExportColumn<T>[],
  rows: T[]
): void {
  const win = window.open("", "_blank");
  if (!win) return;
  const head = columns.map((c) => `<th>${c.label}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${cellValue(row, c)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  const generated = new Date().toLocaleString("en-IN");
  win.document.write(`<!doctype html><html><head><title>${title}</title>
  <style>
    * { font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
    body { padding: 32px; color: #0f172a; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #f1f5f9; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .brand { color: #2563EB; font-weight: 700; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <h1><span class="brand">FUTRSEC</span> — ${title}</h1>
  <div class="meta">Generated ${generated} · ${rows.length} records</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <script>window.onload = () => { window.print(); };</script>
  </body></html>`);
  win.document.close();
}
