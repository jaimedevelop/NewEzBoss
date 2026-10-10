import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { matchColumns, mapRows, readImport } from '../src/pages/finances/ledger';

function file(name: string, content: string | Uint8Array): File {
  return { name, size: content.length, text: async () => String(content), arrayBuffer: async () => typeof content === 'string' ? new TextEncoder().encode(content).buffer : content.buffer } as File;
}
test('Spanish accented headers match without reusing columns and manual overrides work', () => {
  const headers = ['Fecha', 'Cotización', 'Factura', 'Pago', 'Método de pago', 'Dirección de servicio', 'Agente'];
  const mapping = matchColumns(headers);
  assert.equal(mapping.estimate, '1'); assert.equal(mapping.paymentMethod, '4'); assert.equal(mapping.serviceAddress, '5');
  const rows = mapRows({ name: 'Sheet', headers, rows: [['10/09/2026', '0012', 'F-003', '$1,200.50', 'Cheque', '123 Main', 'Ana'], ['', '', '', '', '', '', '']] }, mapping);
  assert.equal(rows.length, 1); assert.equal(rows[0].estimate, '0012'); assert.equal(rows[0].payment, '$1,200.50');
  assert.equal(mapRows({ name: 'Sheet', headers, rows: [['custom']] }, { ...matchColumns([]), invoice: '0' })[0].invoice, 'custom');
});
test('CSV preserves quoted commas, multiline addresses, and leading-zero document IDs', async () => {
  const [sheet] = await readImport(file('ledger.csv', 'Factura,Dirección,Pago\n"0012","123 Main, Apt 2\nMiami",0\n'));
  const [row] = mapRows(sheet, matchColumns(sheet.headers));
  assert.equal(row.invoice, '0012'); assert.equal(row.serviceAddress, '123 Main, Apt 2\nMiami'); assert.equal(row.payment, '0');
});
test('Excel supports multiple worksheets and formatted dates and amounts', async () => {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['Fecha', 'Pago'], [new Date('2026-10-09T00:00:00Z'), 1200.5]]);
  sheet.B2.z = '$#,##0.00';
  XLSX.utils.book_append_sheet(book, sheet, 'Finanzas'); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Agent'], ['Ana']]), 'Other');
  const data = await readImport(file('ledger.xlsx', XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })));
  assert.equal(data.length, 2); assert.equal(mapRows(data[0], matchColumns(data[0].headers))[0].payment, '$1,200.50');
});
test('JSON collects sparse headers, preserves zero, and rejects nested cells', async () => {
  const [sheet] = await readImport(file('ledger.json', '[{"Factura":"0012"},{"Pago":0}]'));
  assert.deepEqual(sheet.headers, ['Factura', 'Pago']);
  assert.equal(mapRows(sheet, matchColumns(sheet.headers))[1].payment, '0');
  await assert.rejects(readImport(file('ledger.json', '[{"Pago":{"amount":1}}]')), /JSON cells/);
  await assert.rejects(readImport(file('ledger.json', '{}')), /array/);
});
