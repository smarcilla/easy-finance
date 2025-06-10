import { join } from 'path';

// Mock fs and fs/promises
jest.mock('fs', () => ({
  createReadStream: jest.fn(() => ({
    on: jest.fn(),
    pipe: jest.fn()
  })),
  promises: {
    unlink: jest.fn(() => Promise.resolve()),
    access: jest.fn(() => Promise.resolve())
  },
  unlinkSync: jest.fn(),
  existsSync: jest.fn(() => true)
}));
import { parseExcel } from '@/utils/parseExcel';
import { filterAndAppend } from '@/utils/googleSheets';
import { getDriveClient } from '@/utils/googleDrive';
import { readProcessedFiles } from '@/utils/processedFiles';
import { appendProcessedFile } from '@/utils/processedFiles';
import handler from '../../pages/api/upload';

jest.mock('@/utils/parseExcel');
jest.mock('@/utils/googleSheets');
jest.mock('@/utils/googleDrive', () => ({
  getDriveClient: jest.fn(() => ({
    files: {
      create: jest.fn(() => Promise.resolve({
        data: {
          id: 'test-file-id',
          webViewLink: 'https://drive.google.com/file/d/test-file-id/view'
        }
      }))
    }
  }))
}));
jest.mock('@/utils/processedFiles', () => ({
  readProcessedFiles: jest.fn(() => Promise.resolve(new Set(['file1.xlsx', 'file2.xlsx']))),
  appendProcessedFile: jest.fn(() => Promise.resolve())
}));

// Mock multer
jest.mock('multer', () => {
  const multer = () => {
    return {
      single: (fieldname: string) => {
        return (req: any, res: any, next: any) => {
          // Mockear el archivo
          req.files = {
            file: [
              {
                originalname: 'test.xlsx',
                path: join(__dirname, 'fixtures', 'test.xlsx'),
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              }
            ]
          };
          next();
        };
      }
    };
  };
  return multer;
});

// Mock Google Sheets client
jest.mock('@/utils/googleSheets', () => ({
  getSheetsClient: jest.fn(() => ({
    spreadsheets: {
      values: {
        get: jest.fn(() => Promise.resolve({
          data: {
            values: [['file1.xlsx', 'file1.xlsx', '2025-01-01T00:00:00Z']]
          }
        })),
        append: jest.fn(() => Promise.resolve())
      }
    }
  })),
  filterAndAppend: jest.fn(() => Promise.resolve(2)),
  readAllHashes: jest.fn(() => Promise.resolve(new Set(['hash1', 'hash2'])))
}));

// Mock Next.js types
class MockNextApiRequest {
  method: string;
  files: {
    file: MockMulterFile[];
  };
  query: any;
  cookies: any;
  body: any;
  env: any;
  headers: any;
  ip: string;
  hostname: string;
  locale: string;
  locales: string[];
  preview: boolean;
  url: string;
  originalUrl: string;
  basepath: string;
  site: any;
  geo: any;
  raw: any;
  rawBody: any;
  rawHeaders: any;
  rawTrailers: any;
  rawUrl: string;
  rawUrlEncoded: string;
  rawUrlDecoded: string;
  aborted: boolean;
  httpVersion: string;
  httpVersionMajor: number;
  httpVersionMinor: number;
  httpVersionRaw: string;
  complete: boolean;
  connection: any;
  socket: any;

  constructor() {
    this.method = 'POST';
    this.files = { file: [] };
    this.query = {};
    this.cookies = {};
    this.body = {};
    this.env = process.env;
    this.headers = {};
    this.ip = '127.0.0.1';
    this.hostname = 'localhost';
    this.locale = 'en';
    this.locales = ['en'];
    this.preview = false;
    this.url = '/api/upload';
    this.originalUrl = '/api/upload';
    this.basepath = '/api';
    this.site = null;
    this.geo = null;
    this.raw = null;
    this.rawBody = '';
    this.rawHeaders = {};
    this.rawTrailers = {};
    this.rawUrl = '/api/upload';
    this.rawUrlEncoded = '/api/upload';
    this.rawUrlDecoded = '/api/upload';
    this.aborted = false;
    this.httpVersion = '1.1';
    this.httpVersionMajor = 1;
    this.httpVersionMinor = 1;
    this.httpVersionRaw = '1.1';
    this.complete = false;
    this.connection = null;
    this.socket = null;
  }
}

class MockNextApiResponse {
  statusCode: number;
  data: any;

  constructor() {
    this.statusCode = 200;
    this.data = {};
  }

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  json(data: any): this {
    this.data = data;
    return this;
  }
}

// Mock multer file type
interface MockMulterFile {
  originalname: string;
  path: string;
  mimetype: string;
}

describe('POST /api/upload', () => {
  const mockRequest = new MockNextApiRequest();
  const mockResponse = new MockNextApiResponse();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process Excel file and return success response', async () => {
    // Mock file data
    const mockFile: MockMulterFile = {
      originalname: 'test.xlsx',
      path: join(__dirname, 'fixtures', 'test.xlsx'),
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    // Mock parseExcel response
    (parseExcel as jest.Mock).mockResolvedValue([
      { fecha: '2025-06-01', monto: 100, categoria: 'Test', detalle: 'Test detail' },
      { fecha: '2025-06-02', monto: 200, categoria: 'Test', detalle: 'Test detail 2' }
    ]);

    // Mock filterAndAppend response
    (filterAndAppend as jest.Mock).mockResolvedValue(2);

    // Mock request
    mockRequest.method = 'POST';
    mockRequest.files = { file: [mockFile] };

    // Call the handler
    await handler(mockRequest, mockResponse);

    // Assertions
    expect(mockResponse.statusCode).toBe(200);
    expect(mockResponse.data).toEqual({
      success: true,
      fileId: expect.any(String),
      linkDrive: expect.any(String),
      insertedCount: 2
    });
    expect(parseExcel).toHaveBeenCalledWith(mockFile.path);
    expect(filterAndAppend).toHaveBeenCalled();
  });

  it('should return error if file already processed', async () => {
    // Mock file data
    const mockFile: MockMulterFile = {
      originalname: 'already-processed.xlsx',
      path: join(__dirname, 'fixtures', 'already-processed.xlsx'),
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    // Mock request
    mockRequest.method = 'POST';
    mockRequest.files = { file: [mockFile] };

    // Mock readProcessedFiles to return the file as processed
    (readProcessedFiles as jest.Mock).mockReturnValue(new Set(['already-processed.xlsx']));

    // Call the handler
    await handler(mockRequest, mockResponse);

    // Assertions
    expect(mockResponse.statusCode).toBe(400);
    expect(mockResponse.data).toEqual({
      success: false,
      error: 'Archivo ya procesado'
    });
  });
});
