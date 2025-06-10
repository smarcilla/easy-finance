import { NextApiRequest, NextApiResponse } from 'next';
import multer, { Express } from 'multer';
import { parseExcel } from '@/utils/parseExcel';
import { filterAndAppend } from '@/utils/googleSheets';
import { getDriveClient } from '@/utils/googleDrive';
import { readProcessedFiles } from '@/utils/processedFiles';
import { appendProcessedFile } from '@/utils/processedFiles';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración de upload
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const ALLOWED_EXTENSIONS = (process.env.ALLOWED_EXTENSIONS || 'xlsx,pdf').split(',');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB por defecto

// Tipos para multer
interface MulterFile extends Express.Multer.File {
  originalname: string;
  path: string;
  mimetype: string;
}

interface ExtendedNextApiRequest extends NextApiRequest {
  files: {
    file: MulterFile[];
  };
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req: ExtendedNextApiRequest, file: MulterFile, cb: (error?: Error | null, acceptFile?: boolean) => void) => {
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (ALLOWED_EXTENSIONS.includes(ext.substring(1))) {
      cb(null, true);
    } else {
      cb(new Error(`Solo se permiten archivos con extensiones: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  }
});

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    const file = req.files?.file[0];
    if (!file) {
      return res.status(400).json({ success: false, error: 'No se proporcionó archivo' });
    }

    // Verificar si el archivo ya fue procesado
    const processedFiles = await readProcessedFiles();
    if (processedFiles.has(file.originalname)) {
      return res.status(400).json({ success: false, error: 'Archivo ya procesado' });
    }

    // Parsear el archivo según su extensión
    let rows: any[];
    if (file.originalname.toLowerCase().endsWith('.xlsx')) {
      rows = await parseExcel(file.path);
    } else {
      // TODO: Implementar parseo de PDF
      return res.status(501).json({ success: false, error: 'Parseo de PDF no implementado' });
    }

    // Filtrar y agregar filas a Google Sheets
    const insertedCount = await filterAndAppend(rows);

    // Subir archivo a Google Drive
    const driveClient = getDriveClient();
    const driveResponse = await driveClient.files.create({
      requestBody: {
        name: file.originalname,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || '1Lc9X1Zj16KU1vD10wQ1p56JQ1p56JQ1p']
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: createReadStream(file.path)
      }
    });

    // Registrar archivo procesado
    await appendProcessedFile(file.originalname, driveResponse.data.id);

    // Limpiar archivo temporal
    await unlink(file.path);

    res.status(200).json({
      success: true,
      fileId: driveResponse.data.id,
      linkDrive: driveResponse.data.webViewLink,
      insertedCount
    });
  } catch (error) {
    console.error('Error en /api/upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
