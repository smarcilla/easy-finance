const XLSX = require('xlsx');

// Crear un nuevo libro de trabajo
const workbook = XLSX.utils.book_new();

// Crear una hoja vacía
const worksheet = XLSX.utils.json_to_sheet([]);

// Agregar la hoja al libro
XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');

// Guardar el archivo
XLSX.writeFile(workbook, './tests/fixtures/empty.xlsx');
