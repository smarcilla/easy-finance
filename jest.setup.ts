import '@testing-library/jest-dom';

// Verificar que la variable de entorno está configurada
if (!process.env.GOOGLE_SHEETS_ID) {
  throw new Error('GOOGLE_SHEETS_ID environment variable is required');
}
