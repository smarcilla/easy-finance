export interface Gasto {
  fecha: string;
  monto: number;
  categoria: string;
  detalle: string;
  hash: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
}
