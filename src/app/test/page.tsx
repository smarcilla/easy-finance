'use client';

import { useEffect, useState } from 'react';
import { Gasto } from '@/types/googleSheets';

interface TestResponse {
  success: boolean;
  data?: {
    spreadsheetInfo: any;
    structureValid: boolean;
    gastos: Gasto[];
  };
  error?: {
    message: string;
    type: string;
  };
}

export default function TestPage() {
  const [state, setState] = useState<{
    data?: TestResponse['data'];
    error?: string;
    loading: boolean;
  }>({ loading: true });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/test');
        const data = await response.json() as TestResponse;
        
        if (data.success) {
          setState({ data: data.data, loading: false });
        } else {
          setState({ error: data.error?.message || 'Error desconocido', loading: false });
        }
      } catch (error) {
        setState({ error: 'Error al hacer la petición', loading: false });
      }
    };

    fetchData();
  }, []);

  if (state.loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {state.error}</div>
      </div>
    );
  }

  const { data } = state;
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Prueba de Google Sheets</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Información de la Hoja</h2>
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(data?.spreadsheetInfo, null, 2)}
        </pre>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Estructura de la Hoja</h2>
        <p className={`mb-4 ${data?.structureValid ? 'text-green-500' : 'text-red-500'}`}>
          Estructura válida: {data?.structureValid ? 'Sí' : 'No'}
        </p>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Gastos</h2>
        <div className="space-y-4">
          {data?.gastos.map((gasto: Gasto, index: number) => (
            <div key={index} className="p-4 border rounded">
              <p>Fecha: {gasto.fecha}</p>
              <p>Monto: {gasto.monto}</p>
              <p>Categoría: {gasto.categoria}</p>
              <p>Detalle: {gasto.detalle}</p>
              <p>Hash: {gasto.hash}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
