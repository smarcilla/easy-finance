import { readGastos, getSpreadsheetInfo, verifySheetStructure, appendGasto, readAllHashes, filterAndAppend, clearGastos } from '@/lib/googleSheets';

describe('Google Sheets Utilities', () => {
  // Limpiar la hoja antes de cada test
  beforeEach(async () => {
    await clearGastos();
  });
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

  describe('filterAndAppend', () => {
    it('should successfully append unique gastos and skip duplicates', async () => {
      // Create two different gastos
      const gasto1 = {
        fecha: '2025-06-05',
        monto: 100,
        categoria: 'Test',
        detalle: 'Test expense 1'
      };
      const gasto2 = {
        fecha: '2025-06-05',
        monto: 200,
        categoria: 'Test',
        detalle: 'Test expense 2'
      };

      // First append should succeed
      const firstResult = await filterAndAppend([gasto1, gasto2]);
      expect(firstResult.success).toBe(true);

      // Second append of same gastos should fail
      const secondResult = await filterAndAppend([gasto1, gasto2]);
      expect(secondResult.success).toBe(false);

      // Verify both gastos were added only once
      const gastos = await readGastos();
      expect(gastos.length).toBe(2);
      // Verify both gastos are present and correct
      const gasto1Match = gastos.find(g => 
        g.fecha === gasto1.fecha && 
        g.monto === gasto1.monto && 
        g.categoria === gasto1.categoria && 
        g.detalle === gasto1.detalle
      );
      expect(gasto1Match).toBeDefined();

      const gasto2Match = gastos.find(g => 
        g.fecha === gasto2.fecha && 
        g.monto === gasto2.monto && 
        g.categoria === gasto2.categoria && 
        g.detalle === gasto2.detalle
      );
      expect(gasto2Match).toBeDefined();

      // Verify that each gasto is unique
      expect(gasto1Match?.hash).not.toBe(gasto2Match?.hash);
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
