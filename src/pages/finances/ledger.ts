import * as XLSX from 'xlsx';

export const columns = [
  ['date', 'Date', ['fecha']],
  ['estimate', 'Estimate', ['estimado', 'estimacion', 'presupuesto', 'cotizacion']],
  ['poNumber', 'P.O. Number', ['po', 'numero po', 'orden de compra', 'numero de orden']],
  ['invoice', 'Invoice', ['factura', 'facturacion']],
  ['payment', 'Payment', ['pago', 'abono']],
  ['paymentMethod', 'Payment Method', ['metodo de pago', 'forma de pago']],
  ['paymentDate', 'Payment Date', ['fecha de pago']],
  ['serviceAddress', 'Service Address', ['direccion', 'direccion de servicio']],
  ['jobCompletionDate', 'Job Completion Date', ['fecha de finalizacion', 'fecha de terminacion', 'fecha de completado']],
  ['completedFor', 'Completed for', ['completado para', 'realizado para', 'cliente']],
  ['agent', 'Agent', ['agente']],
] as const;
export type Field = typeof columns[number][0];
export type RowData = Record<Field, string>;
export interface LedgerRow { id: string; data: RowData; version: number }
export const emptyData = (): RowData => Object.fromEntries(columns.map(([key]) => [key, ''])) as RowData;
export interface ImportSheet { name: string; headers: string[]; rows: string[][] }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function matchColumns(headers: string[]): Record<Field, string> {
  const used = new Set<number>();
  return Object.fromEntries(columns.map(([key, label, aliases]) => {
    const names = [key, label, ...aliases].map(normalize);
    const index = headers.findIndex((header, i) => !used.has(i) && names.includes(normalize(header)));
    if (index >= 0) used.add(index);
    return [key, index < 0 ? '' : String(index)];
  })) as Record<Field, string>;
}
function fromMatrix(name: string, matrix: unknown[][]): ImportSheet {
  const filled = matrix.filter(row => row.some(value => value !== null && value !== undefined && String(value).trim() !== ''));
  const cell = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : value == null ? '' : String(value);
  return { name, headers: (filled[0] ?? []).map((value, i) => cell(value) || `Column ${i + 1}`), rows: filled.slice(1).map(row => row.map(cell)) };
}
export async function readImport(file: File): Promise<ImportSheet[]> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB.');
  if (/\.json$/i.test(file.name)) {
    const value: unknown = JSON.parse(await file.text());
    if (!Array.isArray(value) || !value.length || value.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('JSON must contain an array of row objects.');
    const rows = value as Record<string, unknown>[];
    if (rows.some(row => Object.values(row).some(cell => cell !== null && typeof cell === 'object'))) throw new Error('JSON cells must be text, numbers, booleans, or null.');
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    return [fromMatrix(file.name, [headers, ...rows.map(row => headers.map(key => row[key]))])];
  }
  if (!/\.(xlsx?|csv)$/i.test(file.name)) throw new Error('Choose an Excel, CSV, or JSON file.');
  const book = /\.csv$/i.test(file.name)
    ? XLSX.read(await file.text(), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  return book.SheetNames.map(name => fromMatrix(name, XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, raw: false, defval: '' })));
}
export function mapRows(sheet: ImportSheet, mapping: Record<Field, string>): RowData[] {
  return sheet.rows.map(row => Object.fromEntries(columns.map(([key]) => [key, mapping[key] === '' ? '' : row[Number(mapping[key])] ?? ''])) as RowData)
    .filter(row => Object.values(row).some(value => value.trim()));
}
