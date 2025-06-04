import { readGastos, getSpreadsheetInfo, verifySheetStructure } from '@/lib/googleSheets';

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

  describe('readGastos', () => {
    it('should return an empty array when called with limit', async () => {
      const result = await readGastos(10);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return an empty array when called without limit', async () => {
      const result = await readGastos();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
