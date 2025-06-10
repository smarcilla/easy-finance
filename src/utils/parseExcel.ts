import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import { ExcelRow, ExcelError, ExcelColumnMap, ExcelFormat } from '../types/excel';
import { EXCEL_FORMATS } from './excel-formats';

/**
 * Detectar el formato del Excel basado en las cabeceras
 */
function detectExcelFormat(headers: unknown[]): ExcelFormat | null {
    // Verificar que es un array antes de continuar
    if (!Array.isArray(headers)) return null;
    
    // Convertir a minúsculas y normalizar para comparación
    const normalizedHeaders = headers.map(header => header?.toString().toLowerCase().trim() ?? '');

    // Verificar cada formato
    for (const format of EXCEL_FORMATS) {
        const requiredHeaders = Object.entries(format.columnMap).map(([key, idx]) => {
            const header = normalizedHeaders[idx];
            // Verificar si la cabecera coincide con el nombre esperado
            switch (key) {
                case 'fecha':
                    return header.includes('fecha') || header.includes('f. valor');
                case 'concepto':
                    return header.includes('concepto') || header.includes('descripcion') || header.includes('concepto/descripción');
                case 'movimiento':
                    return header.includes('movimiento') || header.includes('tipo') || header.includes('movimiento/tipo');
                case 'importe':
                    return header.includes('importe') || header.includes('monto') || header.includes('cantidad') || header.includes('importe/monto');
                default:
                    return false;
            }
        });

        if (requiredHeaders.every(Boolean)) {
            return format;
        }
    }
    return null;
}

/**
 * Parsear una fila según el formato detectado
 */
function parseRow(row: unknown, format: ExcelFormat): ExcelRow | null {
    if (!Array.isArray(row)) return null;

    try {
        // Convertir todas las celdas a string para validación
        const stringRow = row.map(cell => cell?.toString() ?? '');
        
        // Validar la fila
        if (!format.validateRow(stringRow, format.columnMap)) {
            return null;
        }

        // Extraer valores
        const fechaStr = stringRow[format.columnMap.fecha];
        const movimiento = stringRow[format.columnMap.movimiento];
        const concepto = stringRow[format.columnMap.concepto];
        const importe = row[format.columnMap.importe]; // Mantener el valor original para el importe

        // Parsear fecha
        const fecha = format.parseDate(fechaStr);
        if (!fecha) return null;

        // Parsear monto
        const monto = format.parseAmount(importe);
        if (monto === null) return null;

        return {
            fecha,
            monto,
            categoria: movimiento,
            detalle: concepto
        };
    } catch (error) {
        return null;
    }
}

/**
 * Parsea un archivo Excel y extrae los datos de gastos/ingresos
 * @param filePath Ruta al archivo Excel
 * @returns Promesa que resuelve a un array de objetos con la estructura:
 * {
 *   fecha: string;     // YYYY-MM-DD
 *   monto: number;     // número con decimales
 *   categoria: string; // texto de la columna Movimiento
 *   detalle: string;   // texto de la columna Concepto
 * }
 */
export async function parseExcel(filePath: string): Promise<ExcelRow[]> {
    try {
        // Verificar que el archivo existe usando fs.promises
        try {
            await fs.access(filePath);
        } catch (err: any) {
            throw {
                type: 'file_not_found' as const,
                message: 'No such file or directory',
                data: { filePath }
            };
        }
        
        // Leer el archivo Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
        
        if (!Array.isArray(data)) {
            throw {
                type: 'invalid_format' as const,
                message: 'El archivo no contiene datos válidos',
                data: { sheetName }
            };
        }

        // Detectar el formato del Excel
        const format = detectExcelFormat(data[0]);
        if (!format) {
            throw {
                type: 'invalid_format' as const,
                message: 'No se pudo detectar el formato del archivo Excel',
                data: { headers: data[0] }
            };
        }

        // Procesar cada fila de datos
        const result: ExcelRow[] = [];
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row)) continue;
            
            const parsedRow = format.parseRow(row, format.columnMap);
            if (parsedRow) {
                result.push(parsedRow);
            }
        }
        return result;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw error;
        }
        if (typeof error === 'object' && error !== null && 'type' in error && 'message' in error) {
            throw error;
        }
        throw new Error('Error al procesar el archivo Excel: Error desconocido');
    }
}
