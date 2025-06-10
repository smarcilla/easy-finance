const XLSX = require('xlsx');

// Ruta al archivo Excel
const workbook = XLSX.readFile('2025Y-06M-04D-17_32_56-Últimos movimientos.xlsx');

// Obtener la primera hoja
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convertir a JSON
const data = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // Obtener las cabeceras como primera fila
    raw: true  // Mantener los valores originales
});

// Mostrar estructura
console.log('Estructura de la hoja Excel:', data[0]); // Cabeceras
console.log('\nPrimeras 5 filas de datos:');
for (let i = 1; i < 6 && i < data.length; i++) {
    console.log(data[i]);
}

// Contar filas y columnas
console.log('\nNúmero de filas:', data.length - 1); // Restamos 1 para no contar la cabecera
console.log('Número de columnas:', data[0].length);
