import { google, Auth } from 'googleapis';
import { Gasto, GoogleSheetsConfig } from '@/types/googleSheets';
import { GoogleAuth } from 'google-auth-library';

// Configuración de Google Sheets
const SHEETS_CONFIG: GoogleSheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
  range: 'Gastos!A2:E',
};

// Validación de entorno
if (!process.env.GOOGLE_SHEETS_ID) {
  throw new Error('GOOGLE_SHEETS_ID environment variable is required');
}

// Client configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const KEY_FILE = process.cwd() + '/credentials.json';

/**
 * Obtiene un cliente autenticado para Google Sheets
 */
export async function getSheetsClient(): Promise<typeof google.sheets_v4.Sheets> {
  const auth = new GoogleAuth({
    scopes: SCOPES,
    keyFile: KEY_FILE
  });
  return google.sheets({ version: 'v4', auth });
}

/**
 * Obtiene información básica del spreadsheet
 */
export async function getSpreadsheetInfo(): Promise<any> {
  try {
    const sheets = await getSheetsClient();
    return (await sheets.spreadsheets.get({
      spreadsheetId: SHEETS_CONFIG.spreadsheetId,
      includeGridData: false,
    })).data;
  } catch (error) {
    console.error('Error getting spreadsheet info:', error);
    throw error;
  }
}

/**
 * Verifica que la estructura de la hoja "Gastos" sea correcta
 */
export async function verifySheetStructure(): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SHEETS_CONFIG.spreadsheetId,
      includeGridData: true,
      ranges: ['Gastos!A1:E1']
    });

    const values = response.data.values || [];
    const headers = values[0] || [];
    
    const expectedHeaders = ['Fecha', 'Monto', 'Categoria', 'Detalle', 'Hash'];
    return headers.every((header: string | undefined, index: number) => 
      header?.toString().toLowerCase() === expectedHeaders[index].toLowerCase()
    );
  } catch (error) {
    console.error('Error verifying sheet structure:', error);
    return false;
  }
}

/**
 * Lee gastos de la hoja de Google Sheets
 */
export async function readGastos(limit?: number): Promise<Gasto[]> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.spreadsheetId,
      range: SHEETS_CONFIG.range,
    });

    const values = response.data.values || [];
    return (limit ? values.slice(0, limit) : values)
      .map(row => ({
        fecha: row[0]?.toString() || '',
        monto: Number(row[1]) || 0,
        categoria: row[2]?.toString() || '',
        detalle: row[3]?.toString() || '',
        hash: row[4]?.toString() || '',
      }));
  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    return [];
  }
}
