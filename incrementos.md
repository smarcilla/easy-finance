# Incrementos para el proyecto Gastos
## Incremento 1: Configuración OAuth2 y lectura básica de Google Sheets

### Definir
Leer "Gastos!A2:E" (incluso si está vacío) y devolver un arreglo de filas.

### Test
Validar que `readGastos(limit)` no lance excepción y retorne Array (aunque vacía).

### Codificar
Módulo `src/utils/googleSheets.ts` con `getSheetsClient()` y `readGastos(limit)`.

## Incremento 2: Append de una fila de hash a "Gastos"

### Definir
Función `appendGasto({ fecha, monto, categoria, detalle, hash })` que anexe `[fecha, monto, categoria, detalle, hash]` a Gastos!A:E.

### Test
Tras llamar `appendGasto`, `readGastos()` debe contener esa fila.

### Codificar
Añadir `appendGasto(...)` en `src/utils/googleSheets.ts`.

## Incremento 3: Cálculo de hash SHA-256

### Definir
Función `computeHash(input: string): string` que retorne hash SHA-256 (hex).

### Test
Dado un string fijo, `computeHash` debe retornar el valor esperado.

### Codificar
`src/utils/crypto.ts` con `computeHash`.

## Incremento 4: Lectura de todos los hashes como Set

### Definir
Función `readAllHashes(): Promise<Set<string>>` que lea "Gastos!E2:E" y devuelva un Set<string>.

### Test
Tras insertar una fila con `appendGasto`, `readAllHashes()` debe contener su hash.

### Codificar
Añadir `readAllHashes` en `src/utils/googleSheets.ts`.

## Incremento 5: Filtrado y append en bloque

### Definir
Función `filterAndAppend(rows: Array<{ fecha, monto, categoria, detalle }>): Promise<number>` que:

Obtenga Set de hashes con `readAllHashes()`.

Por cada fila, calcule hash = `computeHash(\${fecha}|${monto}|${categoria}|${detalle}`)`.

Solo acumule en `newRows` aquellas no presentes.

Si `newRows.length > 0`, llame a `appendGastosBatch(newRows)` para hacer un solo `values.append({ range: 'Gastos!A:E', values: newRows })`.

Devuelva el número de filas insertadas.

### Test
Llamar dos veces con las mismas filas; la primera debe insertar ambas (retornar 2), la segunda debe insertar 0.

### Codificar
Añadir `filterAndAppend` y helper `appendGastosBatch` en `src/utils/googleSheets.ts`.

## Incremento 6: Parseo de Excel (según columnas reales)

### Definir
Función `parseExcel(filePath: string): Promise<Array<{ fecha: string; monto: number; categoria: string; detalle: string }>>` que:

Abra con `xlsx.readFile(filePath)`.

Tome la primera hoja y convierta a JSON a partir de la fila 5 (encabezados reales).

Para cada fila, extraiga:

`fecha` = valor de columna "Fecha" (parsear DD/MM/YYYY → YYYY-MM-DD).

`monto` = valor numérico de "Importe" (negativo o positivo).

`categoria` = texto en "Movimiento".

`detalle` = texto en "Concepto" (o concatenar Observaciones si se desea).

Devuelva el arreglo de objetos con ese shape.

### Test
Usar un Excel de prueba ubicado en `tests/fixtures/test.xlsx` con dos filas bien conocidas; `parseExcel` debe devolver exactamente esos dos objetos.

### Codificar
Generar `src/utils/parseExcel.ts`.

## Incremento 7: Parseo de PDF (opcional)

### Definir
Función `parsePDF(filePath: string): Promise<Array<{ fecha: string; monto: number; categoria: string; detalle: string }>>` que:

Abra con `fs.readFileSync(filePath)` y use `pdf-parse` para extraer text.

Divida text por líneas y aplique un regex que obtenga `(\d{2}/\d{2}/\d{4})\s+([-\d,\.]+)\s+(\S+)\s+(.+)`.

Para cada coincidencia, asigne:

`fecha` = correspondencia[1] (convertir a YYYY-MM-DD).

`monto` = `parseFloat(coincidencia[2].replace(",", ""))`.

`categoria` = coincidencia[3].

`detalle` = coincidencia[4].

Devuelva arreglo de objetos.

### Test
Con un PDF de prueba en `tests/fixtures/test.pdf`, verificar que `parsePDF` retorne los objetos correctos.

### Codificar
Generar `src/utils/parsePDF.ts`.

## Incremento 8: Handler completo de POST /api/upload

### Definir
En `pages/api/upload.ts`, implementar:

Middleware `multer` para recibir file.

Verificar en "Procesados" si `originalname` ya existe; si sí, borrar temporal y retornar error.

Si es `.xlsx/.xls` → `parseExcel(tempPath)`. Si es `.pdf` → `parsePDF(tempPath)`.

Llamar a `filterAndAppend(rows)` y obtener `insertedCount`.

Subir el fichero a Drive (`drive.files.create`) y obtener `fileId`, `webViewLink`.

Registrar `[fileId, originalname, timestamp]` en "Procesados!A:C".

Borrar temporal y devolver `{ success: true, fileId, linkDrive, insertedCount }`.

### Test
Simular envío de un Excel de prueba via `createReadStream` y comprobar que devuelve `{ success: true, insertedCount: X }` con X correcto.

### Codificar
Generar `pages/api/upload.ts` (o su equivalente en API Routes).

## Incremento 9: Endpoint POST /api/gasto (resguardo manual)

### Definir
En `pages/api/gasto.ts`, implementar:

Leer JSON `{ fecha, monto, categoria, detalle }`.

Llamar a `readAllHashes()`, calcular hash con `computeHash(...)`.

Si duplicado → devolver `{ success: false, message: "Gasto duplicado." }`.

Si no → `appendGasto(...)` y devolver `{ success: true }`.

### Test
Insertar un gasto único (verificar que regresa `success: true`), luego volver a insertar mismo gasto y esperar `{ "success": false }`.

### Codificar
Generar `pages/api/gasto.ts`.

## Incremento 10: Endpoint GET /api/gastos y cálculo de meses

### Definir
En `pages/api/gastos.ts`, retornar JSON con el arreglo de gastos (fecha, monto, categoria, detalle).

Opción adicional: GET `/api/meses?saldo=X` que lea gastos, calcule `promedioMensual` y `mesesSinIngresos`, y devuelva `{ promedioMensual, mesesSinIngresos }`.

### Test

Leer gastos – asegurar que regresa un arreglo con los objetos insertados.

Llamar a GET `/api/meses?saldo=1000` y verificar el cálculo con datos de prueba conocidos.

### Codificar
Generar `pages/api/gastos.ts` y (opc.) `pages/api/meses.ts`.

## Incremento 11: Frontend – Componente "Subir Archivo"

### Definir
Crear una página/componente React que muestre:

Un `<input type="file" name="file" />`.

Un botón "Procesar".

Al enviar, llame a POST `/api/upload` vía `fetch` / React Query.

Mostrar progresos, errores o éxito con `linkDrive` y `insertedCount`.

### Test
Manualmente, subiendo un Excel de prueba con React Query, verificar el comportamiento en la UI.

### Codificar
Generar `components/UploadForm.tsx` y la ruta en Next.js.

## Incremento 12: Frontend – Componente "Nuevo Gasto"

### Definir
Página con formulario que pida `{ fecha, monto, categoria, detalle }`.

Al enviar, llame a POST `/api/gasto`.

Mostrar "Gasto añadido" o "Gasto duplicado".

### Test
Manualmente, agregar un gasto en la UI y verificar que aparece en la hoja y retorna mensajes adecuados.

### Codificar
Generar `components/NewGastoForm.tsx` y la ruta correspondiente.

## Incremento 13: Frontend – Dashboard de Gastos y Gráficos

### Definir
Página "Dashboard" que:

Llama a GET `/api/gastos`.

Muestra una tabla (puede ser estilizada con Tailwind) con columnas: Fecha, Importe, Categoría, Detalle.

Agrupa los gastos por mes (e.g. 2025-06) y genera datos `[{ mes: "2025-06", total: 1234.56 }, …]`.
