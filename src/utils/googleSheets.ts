import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { getAuth } from './auth';
import { GastoRow } from '../types/excel';

export async function getSheetsClient() {
  const auth = await getAuth();
  return google.sheets({ version: 'v4', auth });
}

export async function readGastos(limit: number = 100) {
  const sheets = await getSheetsClient();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Gastos!A2:E',
    majorDimension: 'ROWS',
    valueRenderOption: 'FORMATTED_VALUE'
  });

  return (result.data.values || []).slice(0, limit);
}

export async function appendGasto(row: GastoRow) {
  const sheets = await getSheetsClient();
  const values = [[
    row.fecha,
    row.monto,
    row.categoria,
    row.detalle,
    row.hash
  ]];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Gastos!A:E',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });
}

export async function readAllHashes(): Promise<Set<string>> {
  const sheets = await getSheetsClient();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Gastos!E2:E'
  });

  const values = result.data.values || [];
  return new Set(values.map(row => row[0] as string));
}

export async function filterAndAppend(rows: GastoRow[]): Promise<number> {
  const existingHashes = await readAllHashes();
  const newRows = rows.filter(row => !existingHashes.has(row.hash));

  if (newRows.length === 0) return 0;

  const sheets = await getSheetsClient();
  const values = newRows.map(row => [
    row.fecha,
    row.monto,
    row.categoria,
    row.detalle,
    row.hash
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Gastos!A:E',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });

  return newRows.length;
}

export async function appendGastosBatch(rows: GastoRow[]) {
  const sheets = await getSheetsClient();
  const values = rows.map(row => [
    row.fecha,
    row.monto,
    row.categoria,
    row.detalle,
    row.hash
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Gastos!A:E',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: { values }
  });
}
