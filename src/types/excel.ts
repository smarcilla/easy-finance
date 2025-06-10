export interface ExcelRow {
    fecha: string;
    monto: number;
    categoria: string;
    detalle: string;
}

export interface ExcelError {
    type: 'invalid_format' | 'invalid_date' | 'invalid_amount' | 'missing_columns' | 'file_not_found';
    message: string;
    row?: number;
    data?: any;
}

export interface ExcelColumnMap {
    fecha: number;
    concepto: number;
    movimiento: number;
    importe: number;
}

export interface GastoRow extends ExcelRow {
    hash: string;
}

export interface ExcelFormat {
    name: string;
    columnMap: ExcelColumnMap;
    validateRow: (row: unknown[], indices: ExcelColumnMap) => boolean;
    parseDate: (dateStr: string) => string | null;
    parseAmount: (amount: unknown) => number | null;
    parseRow: (row: unknown[], indices: ExcelColumnMap) => ExcelRow | null;
}
