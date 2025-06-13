const XLSX = require('xlsx');

// Crear un nuevo libro de trabajo
const workbook = XLSX.utils.book_new();

// Crear datos de prueba
const data = [
    // Encabezados
    ['F.Valor', 'Fecha', 'Concepto', 'Movimiento', 'Importe', 'Divisa', 'Disponible', 'Divisa', 'Observaciones'],
    // Datos de prueba
    ['01/06/2025', '01/06/2025', 'Pago de luz', 'Gastos', -50.00, 'EUR', 10000.00, 'EUR', 'Factura de luz'],
    ['02/06/2025', '02/06/2025', 'Salario', 'Ingresos', 2000.00, 'EUR', 12000.00, 'EUR', 'Salario mensual']
];

// Crear la hoja
const worksheet = XLSX.utils.aoa_to_sheet(data);

// Agregar la hoja al libro
XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');

// Guardar el archivo
XLSX.writeFile(workbook, './tests/api/fixtures/test.xlsx');
