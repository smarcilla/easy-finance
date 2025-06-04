# Easy Finance - Aplicación de Finanzas Personales

Una aplicación web que te ayuda a gestionar tus finanzas personales usando Google Sheets y Google Drive como backend.

## Características

- Subida y procesamiento de archivos bancarios (Excel/PDF)
- Registro y gestión de gastos
- Cálculo de meses de vida financiera
- Interfaz moderna con Next.js y Tailwind CSS
- Integración con Google Sheets y Drive

## Requisitos

- Node.js >= 18.18.0
- Google Cloud Platform project con OAuth 2.0 credentials
- Google Sheets y Google Drive API habilitadas

## Instalación

1. Clona el repositorio:
```bash
git clone [URL_DEL_REPO]
cd easy-finance
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las credenciales de Google:
- Crea un proyecto en Google Cloud Platform
- Habilita las APIs de Google Sheets y Google Drive
- Genera las credenciales OAuth 2.0
- Coloca el archivo `credentials.json` en la raíz del proyecto

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
src/
├── app/             # Páginas y rutas de Next.js
├── components/      # Componentes reutilizables
├── lib/            # Lógica de negocio y utilidades
└── types/          # Tipos TypeScript
```

## Tecnologías

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Google APIs
- React Query
- Recharts

## Licencia

MIT
