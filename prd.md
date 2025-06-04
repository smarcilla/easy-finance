# PRD: Aplicación de Finanzas Personales (Local) con Google Sheets/Drive

## 1. Problema y propuesta de valor

- **Cliente objetivo**  
  Usuarios técnicos que desean llevar un control preciso de sus gastos personales y calcular cuántos meses podrían vivir sin ingresos, ejecutando la aplicación localmente en Windows 10 sin infraestructura de base de datos compleja.

- **Problema a resolver**  
  No existe una herramienta sencilla que, en un entorno local, permita:
  1. Cargar archivos bancarios (Excel/PDF), procesarlos y guardar los datos de gastos.
  2. Introducir gastos manualmente.
  3. Persistir todos esos datos sin desplegar una base de datos propia.
  4. Evitar duplicados cuando un mismo gasto aparezca en varios ficheros.
  5. Calcular automáticamente, a partir del historial de gastos, cuántos meses de vida financiera le quedan al usuario.

- **Propuesta de valor**  
  - **Almacenamiento de archivos**: Guardar los PDFs/Excels originales (o procesados) en Google Drive para no depender de almacenamiento local ni contenedores Docker.  
  - **Persistencia ligera**: Usar Google Sheets como “base de datos” para registrar cada gasto como una fila (columnas bien definidas).  
  - **Control de duplicados**: Calcular para cada fila un hash SHA-256 a partir de `Fecha|Importe|Movimiento|Concepto` y filtrar antes de guardar.  
  - **Cálculo automático de meses restantes**: Con un dashboard interactivo, calcular y visualizar cuántos meses puede vivir el usuario sin ingresos, según su saldo disponible.

---

## 2. Requisitos funcionales

### RF-01: Autenticación OAuth2 local para Drive y Sheets
- Al arrancar la app por primera vez, el usuario debe autorizar la API de Google Drive y Google Sheets (proyecto “Desktop app”).  
- Se generan y almacenan localmente `credentials.json` y `token.json` para futuras llamadas.

### RF-02: Subida y almacenamiento de archivos en Google Drive
- **Endpoint**: `POST /api/upload`  
- Usa `multer` para recibir un fichero Excel (`.xls`/`.xlsx`) o PDF (`.pdf`) en campo `file`.  
- Tras recibir el fichero:
  1. Guardar temporalmente en `temp_uploads/`.
  2. Comprobar en la pestaña **“Procesados”** de Google Sheets si ese fichero ya fue procesado (comparando `originalname` o `fileId`).  
     - Si ya existe → devolver `{ success: false, message: "Fichero ya procesado." }` y borrar temporal.  
     - Si no existe → continuar con extracción (RF-03).
  3. Una vez procesado, subir el fichero (o una copia “procesada”) a la carpeta dedicada en Google Drive (`drive.files.create` con `parents: [DRIVE_FOLDER_ID]`).
  4. Registrar en **“Procesados”** (hoja “Procesados!A:C”) la fila `[fileId, originalname, fechaProcesado]`.
  5. Eliminar el archivo temporal y devolver en JSON `{ success: true, fileId, linkDrive }`.

### RF-03: Extracción y filtrado de datos desde Excel (según ejemplo)
1. **Formato del Excel**  
   - La primera hoja contiene, a partir de la fila 5, el siguiente encabezado en fila 5:
     ```
     F.Valor | Fecha | Concepto | Movimiento | Importe | Divisa | Disponible | Divisa | Observaciones
     ```
   - Columnas relevantes para nuestro modelo:
     - **“Fecha”** (columna C): fecha de la transacción (`DD/MM/YYYY`).
     - **“Concepto”** (columna D): descripción breve del gasto.
     - **“Movimiento”** (columna E): tipo de movimiento (por ejemplo, “Pago con tarjeta”, “Otros”).
     - **“Importe”** (columna F): cantidad numérica (negativa para débito, positiva para abono).
     - **“Observaciones”** (columna J): texto libre adicional (opcional).
   - Ignoramos “F.Valor”, “Divisa” y “Disponible” para persistencia de gastos, pues sólo necesitamos modelar el gasto en sí (fecha, cantidad, categoría, detalle).

2. **Estructura interna del gasto**  
   Cada fila de gasto se representa con cuatro campos (más el hash):
   - `fecha` (string `YYYY-MM-DD`) ← valor de **“Fecha”** formateado.  
   - `monto` (number) ← valor numérico de **“Importe”** (con signo).  
   - `categoria` (string) ← valor de **“Movimiento”**.  
   - `detalle` (string) ← valor de **“Concepto”** (u opcionalmente concatenar “Observaciones”).  
   - `hash` (string) ← SHA-256 de la concatenación `\`${fecha}|${monto}|${categoria}|${detalle}\`` en formato `hex`.

3. **Control de duplicados**  
   - Antes de procesar el fichero, leer de golpe la columna E de **“Gastos”** (`Gastos!E2:E`) y construir un `Set<string>` con todos los hashes existentes (`readAllHashes()`).
   - Para cada fila extraída:
     1. Concatenar `fecha|monto|categoria|detalle`.  
     2. Calcular SHA-256 (`computeHash(...)`).  
     3. Si el hash ∈ `Set`, omitir esa fila.  
     4. Si no ∈ `Set`, añadir `[fecha, monto, categoria, detalle, hash]` a la lista `nuevasFilas` y hacer `set.add(hash)`.
   - Al final, si `nuevasFilas.length > 0`, hacer **una sola** llamada a `sheets.spreadsheets.values.append({ range: 'Gastos!A:E', …, values: nuevasFilas })`.
   - Registrar luego el `fileId` en la pestaña **“Procesados”**.

4. **RF-04: Inserción manual de gastos con verificación de duplicados**
- **Endpoint**: `POST /api/gasto`  
- Recibe JSON `{ fecha: string; monto: number; categoria: string; detalle: string }`.  
- Pasos:
  1. Llamar a `readAllHashes()` (o reutilizar el conjunto en memoria si ya se cargó).  
  2. Calcular `hash = computeHash(\`${fecha}|${monto}|${categoria}|${detalle}\`)`.
  3. Si `hash ∈ Set` → devolver `{ success: false, message: "Gasto duplicado." }`.
  4. Si no:
     - Llamar a `appendGasto({ fecha, monto, categoria, detalle, hash })`, que anexará la fila en **“Gastos!A:E”**.
     - Actualizar el `Set` en memoria (`set.add(hash)`) para futuras inserciones.
     - Devolver `{ success: true }`.

5. **RF-05: Lectura de todos los gastos**
- **Endpoint**: `GET /api/gastos`  
- Llama a `sheets.spreadsheets.values.get({ spreadsheetId, range: 'Gastos!A2:E' })` y devuelve un arreglo de objetos:
  ```jsonc
  [
    { "fecha": "2025-06-04", "monto": -31.12, "categoria": "Otros", "detalle": "Bbva plan estarseguro", "hash": "..." },
    { "fecha": "2025-06-02", "monto": -16.80, "categoria": "Pago con tarjeta", "detalle": "Taxi", "hash": "..." },
    …
  ]

  El frontend emplea estos datos para listados, agrupaciones y cálculos.

RF-06: Cálculo de “meses sin ingresos”

Con los datos { fecha, monto, categoria, detalle } de GET /api/gastos, el frontend (o backend) agrupa los gastos por mes:

Sumatorio mensual: sumar todos los monto negativos (gastos) de cada mes.

Calcular promedioMensual = (suma de los últimos N meses) / N.

Usuario ingresa saldoDisponible (number).

Calcular mesesSinIngresos = saldoDisponible / promedioMensual.

Mostrar dinámicamente:

“Con un saldo de €X, podrías vivir aproximadamente Y meses sin ingresos.”

El gráfico de barras (Recharts) muestra la evolución de gastos mes a mes.

3. Arquitectura y stack tecnológico
3.1 Frontend
Next.js con TypeScript.

Tailwind CSS + shadcn/ui para componentes (inputs, botones, tablas, modales).

React Query para fetch/estado de:

GET /api/gastos

POST /api/gasto

POST /api/upload

Recharts para gráficos de barras y líneas.

3.2 Backend
API Routes de Next.js (TypeScript). No se requiere Express adicional.

Dependencias principales:

multer (recepción de archivos).

xlsx (parseo de Excel).

pdf-parse (parseo de PDF, si se admite).

crypto (SHA-256 nativo de Node.js).

googleapis (Google Sheets y Google Drive).

Rutas:

POST /api/upload

Recibe y guarda temporalmente el fichero.

Verifica en “Procesados” si ya existe.

Llama a parseExcel(tempPath), extrae filas con { fecha, monto, categoria, detalle }.

Llama a filterAndAppend(rows), que filtra duplicados (hash) y anexa en bloque.

Sube el fichero a Drive (drive.files.create).

Registra [fileId, originalname, timestamp] en “Procesados”.

Elimina temporal y retorna { success: true, fileId, linkDrive }.

POST /api/gasto

Recibe JSON { fecha, monto, categoria, detalle }.

Llama a readAllHashes(), calcula hash y, si es nuevo, llama a appendGasto(...).

Retorna { success: true } o { success: false, message: "Gasto duplicado." }.

GET /api/gastos

Llama a readGastos() para leer “Gastos!A2:E”, mapea filas a objetos y devuelve JSON.

GET /api/meses (opcional)

Recibe ?saldo=X, lee gastos, agrupa por mes, calcula promedioMensual y mesesSinIngresos, y devuelve JSON.

3.3 Persistencia
Google Sheets

Hoja “Gastos”

Fila 1 (encabezados):

yaml
Copy
Edit
A: fecha  |  B: monto  |  C: categoria  |  D: detalle  |  E: hash
Desde fila 2, se insertan filas con esos cinco campos.

Hoja “Procesados”

Fila 1 (encabezados):

yaml
Copy
Edit
A: fileId  |  B: nombreArchivo  |  C: fechaProcesado
Desde fila 2, se registra cada fichero procesado.

3.4 Almacenamiento de archivos
Google Drive

Carpeta “GastosApp” (ID en DRIVE_FOLDER_ID).

Cada Excel/PDF subido se guarda allí.

Al subir, se devuelve webViewLink para ver el fichero en Drive.

3.5 Configuración OAuth2
credentials.json (descargado de Google Cloud para “Desktop app”).

token.json (guardado tras el primer flujo de autorización).

.env.local con:

env
Copy
Edit
SPREADSHEET_ID=<ID_de_tu_hoja_de_Cálculo>
DRIVE_FOLDER_ID=<ID_de_tu_carpeta_Drive>
4. Flujos de usuario clave
4.1 Configuración inicial
Colocar credentials.json en la raíz del proyecto.

Ejecutar scripts/oauth.ts para generar token.json (abrir URL en navegador, pegar código de confirmación).

Crear en Google Sheets un nuevo spreadsheet con dos pestañas:

“Gastos” (fila 1: fecha | monto | categoria | detalle | hash).

“Procesados” (fila 1: fileId | nombreArchivo | fechaProcesado).

Crear en Google Drive carpeta “GastosApp” y copiar su folderId.

Rellenar .env.local con SPREADSHEET_ID y DRIVE_FOLDER_ID.

4.2 Subir y procesar un fichero nuevo
Usuario abre la página “Subir Archivo” en el frontend.

Selecciona un Excel (.xls/.xlsx) o PDF (.pdf) y hace clic en “Procesar”.

Frontend envía POST /api/upload con FormData que incluye el fichero.

Backend (/api/upload):

multer guarda el fichero en temp_uploads/.

Leer “Procesados!A2:A”. Si originalname o fileId ya existe → borrar temporal y responder “Fichero ya procesado”.

Llamar a readAllHashes() para obtener Set de hashes desde “Gastos!E2:E”.

Si es Excel:

parseExcel(tempPath) lee la primera hoja y devuelve Array<{ fecha, monto, categoria, detalle }> según las columnas:

fecha = valor de la columna “Fecha” (parsear DD/MM/YYYY → YYYY-MM-DD).

monto = número en “Importe” (mantener signo).

categoria = texto en “Movimiento”.

detalle = texto en “Concepto” (si se desea, concatenar Observaciones).

Para cada fila extraída, crear hash = computeHash(\${fecha}|${monto}|${categoria}|${detalle}`)`.

Construir nuevasFilas solo con aquellas cuyo hash ∉ Set.

Si nuevasFilas.length > 0, llamar a sheets.spreadsheets.values.append({ range: "Gastos!A:E", values: nuevasFilas }).

Subir el fichero a Drive y obtener fileId, webViewLink.

Registrar [fileId, originalname, new Date().toISOString()] en “Procesados!A:C”.

Borrar temporal y responder { success: true, fileId, linkDrive }.

4.3 Añadir un gasto manual
Usuario abre la página “Nuevo Gasto” en el frontend.

Completa:

Fecha (selector de fecha, formato YYYY-MM-DD).

Monto (número, con signo negativo para gasto).

Categoría (lista desplegable o texto libre).

Detalle (texto libre).

Al hacer clic en “Añadir”:

Frontend envía POST /api/gasto con JSON { fecha, monto, categoria, detalle }.

Backend (/api/gasto):

Llamar a readAllHashes() (o reutilizar Set en memoria si ya se cargó).

Calcular hash = computeHash(\${fecha}|${monto}|${categoria}|${detalle}`)`.

Si hash ∈ Set → responder { success: false, message: "Gasto duplicado." }.

Si no:

Llamar a appendGasto({ fecha, monto, categoria, detalle, hash }).

Actualizar Set: set.add(hash).

Responder { success: true }.

4.4 Ver historial y cálculo de meses
Usuario abre la página “Dashboard”.

Frontend hace GET /api/gastos.

Backend (/api/gastos):

Llamar a readGastos() (leer “Gastos!A2:E” y mapear filas a objetos).

Devolver JSON con el arreglo de gastos.

Frontend:

Renderizar tabla paginada o filtrable con { fecha, monto, categoria, detalle } (ocultar hash).

Agrupar datos por mes (ej. 2025-06) usando fecha.

Calcular totalPorMes = suma de gastos de ese mes.

Dibujar gráfico de barras con Recharts: eje X = mes, eje Y = totalPorMes.

Mostrar un input “Saldo disponible” donde el usuario escribe un número (saldoDisponible).

Calcular:

ini
Copy
Edit
promedioMensual = (totalPorMes de los últimos N meses) / N
mesesSinIngresos = saldoDisponible / promedioMensual
Mostrar texto dinámico:

“Con un saldo de €X, podrías vivir aproximadamente Y meses sin ingresos.”

5. Requisitos no funcionales
Configuración local y credenciales

Debes guardar credentials.json y token.json en la raíz del proyecto (o en una carpeta protegida).

Crear un archivo .env.local con:

ini
Copy
Edit
SPREADSHEET_ID=<ID_de_tu_hoja_de_Cálculo>
DRIVE_FOLDER_ID=<ID_de_tu_carpeta_Drive>
Asegurarte de que token.json no se suba a repositorios públicos.

Límites de uso (quotas)

Drive API: ~10 000 solicitudes/día.

Sheets API: ~500 solicitudes/100 segundos.

Uso local y moderado no excede estos límites.

Rendimiento

Leer “Gastos!E2:E” de golpe puede tardar 1–2 s si hay miles de filas, pero sigue siendo mejor que múltiples lecturas fila a fila.

Anexar en bloque (values.append con varias filas) minimiza llamadas a la API.

Seguridad y validaciones

Validar tipo y tamaño de archivo en POST /api/upload (p. ej. máximo 10 MB, extensiones permitidas .xls, .xlsx, .pdf).

Sanitizar campos al insertar gastos (manipular monto como número; validar formato YYYY-MM-DD en fecha).

Solo solicitar los ámbitos mínimos en OAuth2:

https://www.googleapis.com/auth/drive.file

https://www.googleapis.com/auth/spreadsheets.

Mantenimiento y respaldo

Google Sheets almacena historial de versiones de la hoja “Gastos” (permite revertir cambios).

Google Drive conserva los ficheros, incluso si se eliminan desde la app local.

Logs:

Registrar en consola cada operación de /api/upload, /api/gasto y /api/gastos con timestamp y resultado.

Capturar errores de las APIs de Google y mostrarlos en la interfaz (banner o notificación).

Escalabilidad (uso local)

Destinada a uso personal en Windows 10.

Solo se ejecuta con npm run dev (o next dev).

No requiere clustering ni balanceadores para un único usuario.

6. Resumen ejecutivo
Objetivo
Que Windsurf (VibeCoding) genere el proyecto Next.js completo, incluyendo:

Rutas para subida y parseo de ficheros Excel, filtrado de duplicados (hash), y guardado en Google Sheets.

Formulario y endpoint para ingreso manual de gastos con verificación previa de duplicados.

Dashboard con tabla y gráficos de gasto mensual, y cálculo de “meses sin ingresos”.

Stack principal

Frontend: Next.js (TypeScript) + Tailwind CSS + shadcn/ui + React Query + Recharts.

Backend: API Routes de Next.js + googleapis (Sheets, Drive) + multer + xlsx + pdf-parse + crypto.

Persistencia ligera: Google Sheets (hojas “Gastos” y “Procesados”).

Almacenamiento de ficheros: Google Drive (carpeta “GastosApp”).

Flujos clave

RF-01 a RF-06 cubren autenticación, parseo de Excel según columnas reales (Fecha, Importe, Movimiento, Concepto), filtrado de duplicados por hash, inserción manual y visualización de datos.

Cada operación de subida y de inserción está pensada para uso local sin Docker, aprovechando las APIs de Google y un servidor Next.js monolítico.
