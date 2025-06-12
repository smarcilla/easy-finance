import { NextApiRequest, NextApiResponse } from 'next';

// Crear un mock que implementa solo los métodos necesarios
const createMockRequest = (data: any) => {
  const mock = {
    body: data,
    method: 'POST',
    url: 'http://localhost/api/gasto'
  };
  
  return mock as any;
};

// Crear y aplicar el mock antes de importar handler
const mockGoogleSheets = {
  appendGasto: jest.fn().mockResolvedValue(undefined)
};
jest.mock('@/utils/googleSheets', () => mockGoogleSheets);

// Ahora importamos handler después de que el mock esté aplicado
import handler from '@/pages/api/gasto';

describe('POST /api/gasto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process gasto and return success response', async () => {
    // Mocks
    const mockGasto = {
      fecha: '2025-06-05',
      monto: 100,
      categoria: 'Test',
      detalle: 'Test expense'
    };
    
    // Request
    const mockReq = createMockRequest(mockGasto);

    // Response
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Call the handler
    await handler(mockReq, mockRes as NextApiResponse);

    // Assertions
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true
    });
    expect(mockGoogleSheets.appendGasto).toHaveBeenCalledWith({
      fecha: '2025-06-05',
      monto: 100,
      categoria: 'Test',
      detalle: 'Test expense',
      hash: '2025-06-05-100-Test-Test expense'
    });
  });

  it('should return 400 if required data is missing', async () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await handler(createMockRequest({}), mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: 'Faltan datos requeridos'
    });
  });
});
