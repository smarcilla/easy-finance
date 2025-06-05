import { readGastos, getSpreadsheetInfo, verifySheetStructure, appendGasto, readAllHashes } from '@/lib/googleSheets';

describe('Google Sheets Utilities', () => {
  describe('getSpreadsheetInfo', () => {
    it('should fetch spreadsheet metadata', async () => {
      try {
        const result = await getSpreadsheetInfo();
        expect(result).toBeDefined();
        expect(result.spreadsheetId).toBeDefined();
        expect(result.properties).toBeDefined();
        expect(result.properties.title).toBeDefined();
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });
  });

  describe('verifySheetStructure', () => {
    it('should verify sheet structure', async () => {
      try {
        const result = await verifySheetStructure();
        expect(result).toBe(true);
      } catch (error) {
        console.error('Test failed:', error);
        throw error;
      }
    });
  });

  describe('readAllHashes', () => {
    it('should return a Set containing all hashes from the sheet', async () => {
      // First append a test gasto
      const testGasto = {
        fecha: '2025-06-05',
        monto: 100,
        categoria: 'Test',
        detalle: 'Test expense',
        hash: 'test-hash-123'
      };
      await appendGasto(testGasto);

      // Read all hashes
      const hashes = await readAllHashes();
      
      // Verify the Set contains the hash we just added
      expect(hashes).toBeDefined();
      expect(hashes instanceof Set).toBe(true);
      expect(hashes.has(testGasto.hash)).toBe(true);
    });
  });

  describe('readGastos', () => {
    it('should return an array of expenses when called with limit', async () => {
      const result = await readGastos(10);
      expect(Array.isArray(result)).toBe(true);
      // Instead of checking for empty array, just verify it's an array
      // as we now have test data in the sheet
    });

    it('should return an array of expenses when called without limit', async () => {
      const result = await readGastos();
      expect(Array.isArray(result)).toBe(true);
      // Instead of checking for empty array, just verify it's an array
      // as we now have test data in the sheet
    });
  });

  describe('appendGasto', () => {
    it('should append a new expense and return the updated list', async () => {
      // Arrange
      // Use a unique hash for each test run to avoid conflicts
      const uniqueHash = `test-hash-${Date.now()}`;
      const testExpense = {
        fecha: '2025-06-05',
        monto: 100.50,
        categoria: 'Comida',
        detalle: 'Almuerzo',
        hash: uniqueHash
      };

      // Act - First, verify the expense doesn't exist yet
      const initialGastos = await readGastos();
      const initialMatch = initialGastos.find(g => g.hash === uniqueHash);
      expect(initialMatch).toBeUndefined();

      // Add the new expense
      await appendGasto(testExpense);
      
      // Add a small delay to ensure the API has processed the append
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Read the expenses again
      const updatedGastos = await readGastos();
      
      // Log for debugging
      console.log('Updated gastos:', updatedGastos);
      
      // Assert
      const addedExpense = updatedGastos.find(g => g.hash === uniqueHash);
      
      if (!addedExpense) {
        console.error('Expense not found in the list. Current expenses:', updatedGastos);
      }
      
      expect(addedExpense).toBeDefined();
      
      if (addedExpense) {
        expect(addedExpense.fecha).toBe(testExpense.fecha);
        expect(addedExpense.monto).toBe(testExpense.monto);
        expect(addedExpense.categoria).toBe(testExpense.categoria);
        expect(addedExpense.detalle).toBe(testExpense.detalle);
        expect(addedExpense.hash).toBe(testExpense.hash);
      }
    });
  });
});
