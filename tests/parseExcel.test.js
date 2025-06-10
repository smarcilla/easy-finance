const { parseExcel } = require('../src/utils/parseExcel');
const path = require('path');

describe('parseExcel', () => {
    const testFilePath = path.join(__dirname, 'fixtures', 'test.xlsx');
    const alteredFormatPath = path.join(__dirname, 'fixtures', 'altered-format.xlsx');

    it('should parse Excel file with real data correctly', async () => {
        const result = await parseExcel(testFilePath);
        
        // Verificar que hay dos filas parseadas
        expect(result).toHaveLength(2);
        
        // Verificar que ambas filas tienen la estructura correcta
        result.forEach(row => {
            expect(row).toHaveProperty('fecha');
            expect(row).toHaveProperty('monto');
            expect(row).toHaveProperty('categoria');
            expect(row).toHaveProperty('detalle');
            
            // Verificar que los valores son del tipo correcto
            expect(typeof row.fecha).toBe('string');
            expect(typeof row.monto).toBe('number');
            expect(typeof row.categoria).toBe('string');
            expect(typeof row.detalle).toBe('string');
        });
    });

    it('should handle altered format gracefully', async () => {
        const result = await parseExcel(alteredFormatPath);
        
        // Debería ignorar filas con formato incorrecto
        expect(result).toHaveLength(2);
        
        // Verificar que las filas válidas se parsean correctamente
        expect(result[0]).toEqual({
            fecha: '2025-06-01',
            monto: -50.00,
            categoria: 'Gastos',
            detalle: 'Pago de luz'
        });

        expect(result[1]).toEqual({
            fecha: '2025-06-02',
            monto: 2000.00,
            categoria: 'Ingresos',
            detalle: 'Salario'
        });
    });

    it('should handle empty Excel file', async () => {
        // Este test se implementará cuando tengamos un fixture vacío
        expect.assertions(1);
        await expect(parseExcel(path.join(__dirname, 'fixtures', 'empty.xlsx'))).resolves.toEqual([]);
    });

    it('should throw error for non-existent file', async () => {
        expect.assertions(1);
        await expect(parseExcel('non-existent-file.xlsx')).rejects.toThrow('No such file or directory');
    });
});
