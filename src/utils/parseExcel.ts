import { promises as fs } from 'fs';
import * as XLSX from 'xlsx';
import { ExcelRow, ExcelError, ExcelColumnMap, ExcelFormat } from '../types/excel';
import { format } from 'date-fns';

// Definir diferentes formatos de Excel que podemos manejar
const EXCEL_FORMATS: ExcelFormat[] = [
    {
        name: 'formato_bbva',
        columnMap: {
            fecha: 1, // Columna B
            concepto: 2, // Columna C
            movimiento: 3, // Columna D
            importe: 4 // Columna E
        },
        validateRow: (row: any[], indices: ExcelColumnMap) => {
            // Verificar que las columnas necesarias existen y no están vacías
            return Object.entries(indices).every(([key, idx]) => {
                const value = row[idx]?.toString().trim();
                return value && value !== '' && value !== 'null' && value !== 'undefined';
            });
        },
        parseDate: (dateStr: string) => {
            // La fecha puede estar en formato DD/MM/YYYY o DD/MM/YY
            const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
            if (!match) return null;
            const [day, month, year] = match.slice(1);
            const fullYear = year.length === 2 ? `20${year}` : year;
            return format(new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day)), 'yyyy-MM-dd');
        },
        parseAmount: (amount: any) => {
            // Intentar convertir a número, ignorar si no es posible
            const num = Number(amount);
            if (isNaN(num) || amount === null || amount === undefined) return null;
            return num;
        }
    },
    {
        name: 'formato_bbva_minimo',
        columnMap: {
            fecha: 0, // Columna A
            concepto: 1, // Columna B
            importe: 2, // Columna C
            movimiento: 3 // Columna D
        },
        validateRow: (row: any[], indices: ExcelColumnMap) => {
            // Verificar que las columnas necesarias existen y no están vacías
            return Object.entries(indices).every(([key, idx]) => {
                const value = row[idx]?.toString().trim();
                return value && value !== '' && value !== 'null' && value !== 'undefined';
            });
        },
        parseDate: (dateStr: string) => {
            // La fecha puede estar en formato DD/MM/YYYY o DD/MM/YY
            const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
            if (!match) return null;
            const [day, month, year] = match.slice(1);
            const fullYear = year.length === 2 ? `20${year}` : year;
            return format(new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day)), 'yyyy-MM-dd');
        },
        parseAmount: (amount: any) => {
            // Intentar convertir a número, ignorar si no es posible
            const num = Number(amount);
            if (isNaN(num) || amount === null || amount === undefined) return null;
            return num;
        }
    }
];

/**
 * Detectar el formato del Excel basado en las cabeceras
 */
function detectExcelFormat(headers: string[]): ExcelFormat | null {
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
        const fs = require('fs').promises;
        try {
            await fs.access(filePath);
        } catch (err: any) {
            if (err.code === 'ENOENT') {
                throw new Error('No such file or directory');
            }
            throw err;
        }
        
        // Leer el archivo Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
        
        // Si el archivo está vacío, retornar un array vacío
        if (!Array.isArray(data) || data.length === 0) {
            return [];
        }

        // Detectar el formato del Excel
        let headers: string[] = [];
        let format: ExcelFormat | null = null;
        
        // Buscar las cabeceras en las primeras filas
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i];
            if (Array.isArray(row)) {
                const stringRow = row.map(cell => cell?.toString() ?? '');
                if (stringRow.some(cell => cell.toLowerCase().includes('fecha'))) {
                    headers = stringRow;
                    format = detectExcelFormat(headers);
                    if (format) break;
                }
            }
        }

        // Si no encontramos formato válido, intentar con la fila 4 por defecto
        if (!format) {
            const defaultHeaders = data[4];
            if (Array.isArray(defaultHeaders)) {
                headers = defaultHeaders.map(cell => cell?.toString() ?? '');
                format = detectExcelFormat(headers);
            }
        }

        if (!format) {
            throw new Error('El archivo no tiene el formato esperado');
        }

        // Procesar cada fila de datos
        const result: ExcelRow[] = [];
        
        // Saltar las primeras filas que son encabezados
        let skipRows = true;
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            // Si encontramos la fila de encabezados, marcamos para empezar a procesar
            if (row && Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('fecha'))) {
                skipRows = false;
                continue;
            }
            
            // Si estamos en la sección de datos, procesamos la fila
            if (!skipRows) {
                const parsedRow = parseRow(row, format);
                if (parsedRow) {
                    result.push(parsedRow);
                }
            }
        }
        return result;
    } catch (error) {
        // Re-lanzar errores de archivo no encontrado
        if (error instanceof Error && error.message.includes('No such file or directory')) {
            throw error;
        }
        // Para errores de formato
        if (error instanceof Error && error.message.includes('El archivo no tiene el formato esperado')) {
            throw new Error(`Error al procesar el archivo Excel: ${error.message}`);
        }
        // Para otros errores, lanzar un error más específico
        if (error instanceof Error) {
            throw new Error(`Error al procesar el archivo Excel: ${error.message}`);
        }
        throw new Error('Error al procesar el archivo Excel: Error desconocido');
    }
}
