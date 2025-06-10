import { ExcelFormat, ExcelColumnMap, ExcelRow } from '../types/excel';
import { format } from 'date-fns';

/**
 * Función utilitaria para parsear fechas en formato DD/MM/YYYY o DD/MM/YY
 */
function parseDate(dateStr: string): string | null {
    const match = dateStr.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2,4})$/);
    if (!match) return null;
    const [_, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return format(new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day)), 'yyyy-MM-dd');
}

/**
 * Función utilitaria para parsear montos
 */
function parseAmount(amount: unknown): number | null {
    if (amount === null || amount === undefined) return null;
    const num = Number(amount);
    return isNaN(num) ? null : num;
}

/**
 * Función utilitaria para validar filas
 */
function validateRow(row: unknown[], indices: ExcelColumnMap): boolean {
    return Object.entries(indices).every(([key, idx]) => {
        const value = row[idx]?.toString().trim();
        return value && value !== '' && value !== 'null' && value !== 'undefined';
    });
}

/**
 * Función utilitaria para parsear filas
 */
function parseRow(row: unknown[], indices: ExcelColumnMap): ExcelRow | null {
    const fecha = parseDate(row[indices.fecha]?.toString() ?? '');
    const monto = parseAmount(row[indices.importe]);
    const categoria = row[indices.movimiento]?.toString().trim() ?? '';
    const detalle = row[indices.concepto]?.toString().trim() ?? '';

    if (!fecha || monto === null) return null;
    return { fecha, monto, categoria, detalle };
}

/**
 * Definir diferentes formatos de Excel que podemos manejar
 */
export const EXCEL_FORMATS: ExcelFormat[] = [
    {
        name: 'formato_bbva',
        columnMap: {
            fecha: 1, // Columna B
            concepto: 2, // Columna C
            movimiento: 3, // Columna D
            importe: 4 // Columna E
        },
        validateRow,
        parseDate,
        parseAmount,
        parseRow
    },
    {
        name: 'formato_bbva_minimo',
        columnMap: {
            fecha: 0, // Columna A
            concepto: 1, // Columna B
            importe: 2, // Columna C
            movimiento: 3 // Columna D
        },
        validateRow,
        parseDate,
        parseAmount,
        parseRow
    }
];
