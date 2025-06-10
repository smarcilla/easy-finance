import { getSheetsClient } from './googleSheets';

export interface ProcessedFile {
  fileId: string;
  filename: string;
  timestamp: string;
}

export async function readProcessedFiles(): Promise<Set<string>> {
  const sheets = await getSheetsClient();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Procesados!A2:C'
  });

  const values = result.data.values || [];
  return new Set(values.map(row => row[1] as string));
}

export async function appendProcessedFile(file: ProcessedFile): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: 'Procesados!A:C',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [[file.fileId, file.filename, file.timestamp]]
    }
  });
}
