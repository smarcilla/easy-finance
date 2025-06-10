const XLSX = require('xlsx');

// Crear un nuevo libro de trabajo
const workbook = XLSX.utils.book_new();

// Crear datos con formato alterado
const data = [
    // Encabezados alterados
    ['Fecha', 'Concepto', 'Importe', 'Movimiento', 'Divisa', 'Disponible'], // Falta F.Valor y Observaciones
    // Datos de prueba
    ['01/06/2025', 'Pago de luz', -50.00, 'Gastos', 'EUR', 10000.00], // Falta F.Valor y Observaciones
    ['02/06/2025', 'Salario', 2000.00, 'Ingresos', 'EUR', 12000.00], // Falta F.Valor y Observaciones
    // Fila con formato incorrecto
    ['Fecha incorrecta', 'Concepto', 'Importe', 'Movimiento', 'Divisa', 'Disponible'],
    // Fila con monto no numérico
    ['03/06/2025', 'Compra', 'no es número', 'Gastos', 'EUR', 9500.00]
];

// Crear la hoja
const worksheet = XLSX.utils.aoa_to_sheet(data);

// Agregar la hoja al libro
XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');

// Guardar el archivo
XLSX.writeFile(workbook, './tests/fixtures/altered-format.xlsx');
