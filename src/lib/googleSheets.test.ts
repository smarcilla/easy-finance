// Create mocks
const mockGetSpreadsheetInfo = jest.fn().mockResolvedValue({
  spreadsheetId: 'test-sheet-id',
  properties: {
    title: 'Test Spreadsheet'
  }
});

const mockVerifySheetStructure = jest.fn().mockResolvedValue(true);

const mockReadAllHashes = jest.fn().mockResolvedValue(new Set(['test-hash-123']));

const mockAppendGasto = jest.fn().mockResolvedValue(undefined);

const mockFilterAndAppend = jest.fn().mockResolvedValue({
  success: true,
  added: 1,
  duplicates: 0
});

const mockClearGastos = jest.fn().mockResolvedValue(undefined);

const mockReadGastos = jest.fn().mockImplementation((limit?: number) => {
  return Promise.resolve([
    {
      fecha: '2025-06-05',
      monto: 100,
      categoria: 'Test',
      detalle: 'Test expense',
      hash: 'test-hash-123'
    }
  ]);
});

// Mock the module
jest.mock('@/lib/googleSheets', () => ({
  getSpreadsheetInfo: mockGetSpreadsheetInfo,
  verifySheetStructure: mockVerifySheetStructure,
  readAllHashes: mockReadAllHashes,
  appendGasto: mockAppendGasto,
  filterAndAppend: mockFilterAndAppend,
  clearGastos: mockClearGastos,
  readGastos: mockReadGastos
}));

// Now import the functions after the mock is applied
import { readGastos, getSpreadsheetInfo, verifySheetStructure, appendGasto, readAllHashes, filterAndAppend, clearGastos } from '@/lib/googleSheets';

describe('Google Sheets Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSpreadsheetInfo', () => {
    it('should fetch spreadsheet metadata', async () => {
      const result = await getSpreadsheetInfo();
      expect(result).toEqual({
        spreadsheetId: 'test-sheet-id',
        properties: {
          title: 'Test Spreadsheet'
        }
      });
      expect(mockGetSpreadsheetInfo).toHaveBeenCalled();
    });
  });

  describe('verifySheetStructure', () => {
    it('should verify sheet structure', async () => {
      const result = await verifySheetStructure();
      expect(result).toBe(true);
      expect(mockVerifySheetStructure).toHaveBeenCalled();
    });
  });

  describe('readAllHashes', () => {
    it('should return a Set containing all hashes from the sheet', async () => {
      const hashes = await readAllHashes();
      expect(hashes).toBeInstanceOf(Set);
      expect(hashes.has('test-hash-123')).toBe(true);
      expect(mockReadAllHashes).toHaveBeenCalled();
    });
  });

  describe('readGastos', () => {
    it('should return an array of expenses when called with limit', async () => {
      const result = await readGastos(10);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        fecha: '2025-06-05',
        monto: 100,
        categoria: 'Test',
        detalle: 'Test expense',
        hash: 'test-hash-123'
      });
    });

    it('should return an array of expenses when called without limit', async () => {
      const result = await readGastos();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        fecha: '2025-06-05',
        monto: 100,
        categoria: 'Test',
        detalle: 'Test expense',
        hash: 'test-hash-123'
      });
    });
  });

  describe('filterAndAppend', () => {
    it('should successfully append unique gastos and skip duplicates', async () => {
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

      const result = await filterAndAppend([gasto1, gasto2]);
      expect(result).toEqual({
        success: true,
        added: 1,
        duplicates: 0
      });
      expect(mockFilterAndAppend).toHaveBeenCalledWith([gasto1, gasto2]);
    });
  });

  describe('appendGasto', () => {
    it('should append a new expense', async () => {
      const testExpense = {
        fecha: '2025-06-05',
        monto: 100.50,
        categoria: 'Comida',
        detalle: 'Almuerzo',
        hash: 'test-hash-123'
      };

      await appendGasto(testExpense);
      expect(mockAppendGasto).toHaveBeenCalledWith(testExpense);
    });
  });

  describe('clearGastos', () => {
    it('should clear all gastos', async () => {
      await clearGastos();
      expect(mockClearGastos).toHaveBeenCalled();
    });
  });
});
