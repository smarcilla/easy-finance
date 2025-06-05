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
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];
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
 * Lee todos los hashes de la hoja de Google Sheets
 * @returns Set de strings con todos los hashes existentes
 */
export async function readAllHashes(): Promise<Set<string>> {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_CONFIG.spreadsheetId,
      range: 'Gastos!E2:E',
    });

    const values = response.data.values || [];
    return new Set(values.map(row => row[0]?.toString() || ''));
  } catch (error) {
    console.error('Error reading hashes:', error);
    throw error;
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
      .map((row: any[]) => {
        // Parse monto, handling both string and number inputs
        let monto = 0;
        if (row[1] !== undefined && row[1] !== null && row[1] !== '') {
          // Convert to number, handling both . and , as decimal separators
          const montoStr = row[1].toString().replace(',', '.');
          monto = parseFloat(montoStr) || 0;
        }
        
        return {
          fecha: row[0]?.toString() || '',
          monto,
          categoria: row[2]?.toString() || '',
          detalle: row[3]?.toString() || '',
          hash: row[4]?.toString() || '',
        };
      });
  } catch (error) {
    console.error('Error reading from Google Sheets:', error);
    return [];
  }
}

/**
 * Agrega un nuevo gasto a la hoja de Google Sheets
 * @param gasto Objeto que contiene los datos del gasto a agregar
 * @throws {Error} Si falta algún campo requerido o hay un error en la operación
 */
export async function appendGasto(gasto: Gasto): Promise<void> {
  try {
    // Validar que el gasto tenga todos los campos requeridos
    if (!gasto.fecha || !gasto.categoria || !gasto.detalle || !gasto.hash) {
      throw new Error('Todos los campos del gasto son requeridos');
    }

    const sheets = await getSheetsClient();
    
    // Convertir el objeto gasto a un array de valores en el orden correcto
    // Asegurarse de que el monto sea un número
    const monto = typeof gasto.monto === 'string' ? parseFloat(gasto.monto) : gasto.monto;
    
    const values = [
      [
        gasto.fecha,
        monto, // Usar el valor numérico
        gasto.categoria,
        gasto.detalle,
        gasto.hash
      ]
    ];
    
    console.log('Appending values:', values); // Para depuración

    // Realizar la operación de append
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEETS_CONFIG.spreadsheetId,
      range: 'Gastos!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    
    console.log('Gasto agregado correctamente');
  } catch (error) {
    console.error('Error al agregar gasto:', error);
    throw error; // Relanzar el error para que el llamador pueda manejarlo
  }
}
