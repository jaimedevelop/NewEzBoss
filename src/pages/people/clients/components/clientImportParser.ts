// src/pages/people/clients/components/clientImportParser.ts

import * as XLSX from 'xlsx';
import type { Client } from '../../../../services/clients';
import { isClientComplete } from '../../../../services/clients';

export interface ParsedClientRow {
  rowNumber: number; // 1-based row number in the source file (for error display)
  client: Partial<Client>;
  isComplete: boolean;
  missingFields: string[];
}

// Maps recognized header variants (lowercased, punctuation-stripped) to Client fields.
const HEADER_ALIASES: Record<string, keyof Client> = {
  name: 'name',
  fullname: 'name',
  clientname: 'name',
  email: 'email',
  emailaddress: 'email',
  phone: 'phoneMobile',
  phonemobile: 'phoneMobile',
  mobile: 'phoneMobile',
  mobilephone: 'phoneMobile',
  cellphone: 'phoneMobile',
  phoneother: 'phoneOther',
  otherphone: 'phoneOther',
  secondaryphone: 'phoneOther',
  company: 'companyName',
  companyname: 'companyName',
  clienttype: 'clientType',
  type: 'clientType',
  notes: 'notes',
  note: 'notes',
  billingaddress: 'billingAddress',
  address: 'billingAddress',
  billingaddress2: 'billingAddress2',
  addressline2: 'billingAddress2',
  billingcity: 'billingCity',
  city: 'billingCity',
  billingstate: 'billingState',
  state: 'billingState',
  billingzip: 'billingZipCode',
  billingzipcode: 'billingZipCode',
  zip: 'billingZipCode',
  zipcode: 'billingZipCode',
  serviceaddress: 'serviceAddress',
  serviceaddress2: 'serviceAddress2',
  servicecity: 'serviceCity',
  servicestate: 'serviceState',
  servicezip: 'serviceZipCode',
  servicezipcode: 'serviceZipCode',
};

const REQUIRED_FOR_COMPLETE: Array<{ field: keyof Client; label: string }> = [
  { field: 'name', label: 'Name' },
  { field: 'email', label: 'Email' },
  { field: 'phoneMobile', label: 'Mobile phone' },
  { field: 'billingAddress', label: 'Billing address' },
  { field: 'billingCity', label: 'Billing city' },
  { field: 'billingState', label: 'Billing state' },
  { field: 'billingZipCode', label: 'Billing zip code' },
];

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCell(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str === '' ? undefined : str;
}

export function computeMissingFields(client: Partial<Client>): string[] {
  return REQUIRED_FOR_COMPLETE.filter(({ field }) => !client[field]?.toString().trim()).map(
    ({ label }) => label
  );
}

function rowsToClients(rows: unknown[][]): ParsedClientRow[] {
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const fieldByColumn: Array<keyof Client | undefined> = headerRow.map((h) => {
    const normalized = normalizeHeader(normalizeCell(h) ?? '');
    return HEADER_ALIASES[normalized];
  });

  const parsed: ParsedClientRow[] = [];

  dataRows.forEach((row, idx) => {
    const isBlankRow = row.every((cell) => normalizeCell(cell) === undefined);
    if (isBlankRow) return;

    const client: Partial<Client> = {};
    fieldByColumn.forEach((field, colIdx) => {
      if (!field) return;
      const value = normalizeCell(row[colIdx]);
      if (value !== undefined) {
        (client as Record<string, unknown>)[field] = value;
      }
    });

    const missingFields = computeMissingFields(client);
    parsed.push({
      rowNumber: idx + 2, // +1 for header row, +1 for 1-based indexing
      client,
      isComplete: isClientComplete(client) && missingFields.length === 0,
      missingFields,
    });
  });

  return parsed;
}

function parseDelimitedText(text: string): unknown[][] {
  const delimiter = text.includes('\t') ? '\t' : ',';
  return text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => line.split(delimiter).map((cell) => cell.trim()));
}

export async function parseClientImportFile(file: File): Promise<ParsedClientRow[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || extension === 'txt') {
    const text = await file.text();
    const rows = parseDelimitedText(text);
    return rowsToClients(rows);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  return rowsToClients(rows);
}

export const SUPPORTED_IMPORT_EXTENSIONS = ['.csv', '.txt', '.xlsx', '.xls'];
