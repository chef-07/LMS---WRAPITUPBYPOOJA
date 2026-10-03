/**
 * CSV for Excel and Google Sheets. Cells are quoted when needed, and a cell
 * that starts like a formula (= + - @, tab, CR) gets a leading apostrophe so
 * a name like "=HYPERLINK(...)" can't run when the file is opened.
 */
export type Cell = string | number | boolean | null | undefined;

export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Header row plus data rows, CRLF line ends, with a BOM so Excel reads UTF-8 (₹, emoji, Hindi names). */
export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
