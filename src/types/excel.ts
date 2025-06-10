export interface ExcelRow {
    fecha: string;
    monto: number;
    categoria: string;
    detalle: string;
}

export interface ExcelError {
    type: 'invalid_format' | 'invalid_date' | 'invalid_amount' | 'missing_columns';
    message: string;
    row?: number;
    data?: any;
}

export interface ExcelColumnMap {
    fecha: number;
    movimiento: number;
    concepto: number;
    importe: number;
}

export interface ExcelFormat {
    name: string;
    columnMap: ExcelColumnMap;
    validateRow: (row: any[], indices: ExcelColumnMap) => boolean;
    parseDate: (dateStr: string) => string | null;
    parseAmount: (amount: any) => number | null;
}
