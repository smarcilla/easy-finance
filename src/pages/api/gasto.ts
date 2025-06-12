import { NextApiRequest, NextApiResponse } from 'next';
import { appendGasto } from '@/utils/googleSheets';

// Tipos para el request
interface ExtendedNextApiRequest extends NextApiRequest {
  body: {
    fecha: string;
    monto: number;
    categoria: string;
    detalle: string;
  };
}

export const config = {
  api: {
    bodyParser: true
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

    const { fecha, monto, categoria, detalle } = req.body;
    if (!fecha || !monto || !categoria || !detalle) {
      return res.status(400).json({ success: false, error: 'Faltan datos requeridos' });
    }

    // Generar un hash único basado en los datos del gasto
    const hash = `${fecha}-${monto}-${categoria}-${detalle}`;

    // Agregar gasto a Google Sheets
    await appendGasto({
      fecha,
      monto,
      categoria,
      detalle,
      hash
    });

    res.status(200).json({
      success: true
    });

  } catch (error) {
    console.error('Error en /api/gasto:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
