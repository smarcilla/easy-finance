import { NextResponse } from 'next/server';
import { getSpreadsheetInfo, verifySheetStructure, readGastos } from '@/lib/googleSheets';

/**
 * Endpoint para probar la conexión con Google Sheets
 * @returns Información sobre la hoja, estructura y gastos
 */
export async function GET() {
  try {
    // Obtener información básica del spreadsheet
    const info = await getSpreadsheetInfo();
    
    // Verificar estructura de la hoja
    const structureValid = await verifySheetStructure();
    
    // Leer gastos (limitados a 5 para pruebas)
    const gastos = await readGastos(5);

    return NextResponse.json({
      success: true,
      data: {
        spreadsheetInfo: info,
        structureValid,
        gastos
      }
    });
  } catch (error: unknown) {
    console.error('Error en la prueba:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Error desconocido',
          type: error instanceof Error ? error.constructor.name : 'Error desconocido'
        }
      },
      { status: 500 }
    );
  }
}
