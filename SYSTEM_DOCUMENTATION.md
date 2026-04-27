# Manual Técnico y de Operación — Automatización de Certificados

Este documento detalla el funcionamiento interno del sistema, sus componentes clave, y sirve como guía paso a paso para quienes vayan a realizar pruebas o configurar el proyecto desde cero.

---

## 1. Arquitectura General

```
Contratista (público)          Supervisor (con login)
       ↓                              ↓
  POST /api/reports              GET /api/dashboard/...
       ↓                              ↓
  MongoDB (status: pending)     Ve reportes y estados
       ↓
  scraperRunner.js (cron 2AM o manual)
       ↓
  Scraper específico (SOI, Asopagos, etc.)
       ↓
  PDF descargado → Google Drive → status: downloaded
```

---

## 2. Estructura del Backend

```
backEnd/
├── index.js               ← Punto de entrada (Express + middlewares + cron)
├── config/
│   ├── db.js              ← Conexión a MongoDB
│   └── cron-status.json   ← Estado del cron (generado automáticamente)
├── controllers/           ← Lógica de cada endpoint
├── helpers/
│   └── jwt.js             ← Generación y verificación de tokens JWT
├── middlewares/
│   └── authMiddleware.js  ← Protección de rutas con JWT
├── models/
│   ├── Contractor.js      ← Esquema: contratista
│   ├── Report.js          ← Esquema: reporte/solicitud
│   └── Supervisor.js      ← Esquema: supervisor
├── routes/
│   ├── authRoutes.js      ← POST /api/auth/login
│   ├── reportRoutes.js    ← POST /api/reports
│   ├── dashboardRoutes.js ← GET  /api/dashboard/stats, /reports
│   ├── supervisorRoutes.js← GET/PUT /api/supervisors/...
│   └── systemRoutes.js    ← GET/POST /api/system/cron/...
├── scrapers/              ← ⭐ Motor de automatización (ver sección 3)
│   ├── scraperRunner.js
│   ├── soiScraper.js
│   ├── asopagosScraper.js
│   ├── miPlanillaScraper.js
│   └── aportesEnLineaScraper.js
├── services/
│   ├── driveService.js    ← Subida a Google Drive (ver sección 4)
│   └── captchaService.js  ← Integración con 2Captcha
├── scripts/
│   ├── addSupervisor.js   ← Crear supervisores por terminal
│   └── checkSupervisors.js← Listar supervisores existentes
├── utils/
│   └── setupDriveAuth.js  ← Generar refresh token de Google Drive OAuth2
├── validations/           ← Reglas de validación (express-validator)
├── downloads/             ← PDFs temporales (se eliminan tras subir a Drive)
├── swagger.yaml           ← Documentación de la API (/api-docs)
└── .env                   ← Variables de entorno
```

---

## 3. ⭐ Motor de Scraping — Funcionamiento Completo

### Orden de Archivos y Responsabilidades

| # | Archivo | Rol |
|---|---|---|
| 1 | `scraperRunner.js` | **Orquestador.** Lee reportes `pending`, decide qué scraper llamar, gestiona reintentos y sube a Drive si tiene éxito. |
| 2 | `soiScraper.js` | Scraper de **SOI**. Sin captcha. |
| 3 | `asopagosScraper.js` | Scraper de **Asopagos**. Captcha de imagen → 2Captcha. |
| 4 | `miPlanillaScraper.js` | Scraper de **Compensar / Mi Planilla**. Captcha numérico → 2Captcha. |
| 5 | `aportesEnLineaScraper.js` | Scraper de **Aportes en Línea**. reCAPTCHA v2 → 2Captcha. |

### Flujo del `scraperRunner.js` (paso a paso)

```
1. ¿El cron está habilitado? (lee config/cron-status.json)
   └─ No → Saltar ciclo.

2. ¿Ya hay un ciclo corriendo? (flag isRunnerRunning)
   └─ Sí → Saltar para evitar colisiones.

3. Recuperar reportes "atascados"
   └─ Reportes en "processing" por más de 5 min → volver a "pending".

4. Limpiar archivos temporales viejos en downloads/ (>30 min).

5. Para CADA plataforma (soi, asopagos, mi_planilla, aportes_en_linea):
   a. Buscar reportes con status: "pending" (priorizando nuevos sobre reintentos).
   b. Para CADA reporte:
      - Marcar como "processing" y sumar 1 intento.
      - Obtener datos del contratista de MongoDB.
      - Ejecutar el scraper correspondiente.
      - ¿Éxito?
        ├─ Sí → status: "success" → Subir PDF a Drive → status: "downloaded"
        │        └─ Si Drive falla, queda en "success" con PDF local.
        └─ No → ¿Intentos < 3?
                 ├─ Sí → Volver a "pending" (se reintentará).
                 └─ No → status: "error" (fallo definitivo tras 3 intentos).

6. Fin del ciclo.
```

### Ciclo de Estados de un Reporte

```
pending ──→ processing ──→ success ──→ downloaded (subido a Drive)
                │                          
                ├──→ pending  (reintento 1/3 o 2/3)
                └──→ error    (3 intentos fallidos)
```

### Cómo Ejecutar los Scrapers

```bash
# Opción 1: Automático — Cron programado a las 2:00 AM
# Se activa solo al iniciar el backend:
npm run dev

# Opción 2: Manual — Ejecutar un ciclo inmediatamente
npm run scraper
# Esto conecta a MongoDB, ejecuta UN ciclo completo, y se desconecta.
```

### Modo Headless (navegador visible o invisible)

Los scrapers usan Playwright para controlar un navegador. El comportamiento se controla con la variable `HEADLESS` en el `.env`:

```env
# false = navegador visible — puedes ver el scraper trabajando en pantalla (desarrollo/debug)
# true  = sin interfaz gráfica — corre en segundo plano (producción/servidor)
HEADLESS=false
```

| Entorno | Valor | Qué pasa |
|---|---|---|
| Desarrollo (tu PC) | `false` | Se abre una ventana de Chromium y ves cada paso del scraper |
| Producción (servidor/VPS) | `true` | El scraper corre sin abrir nada, no necesita pantalla |
| No definida | — | Por defecto es `true` (modo producción) |

> **Nota:** En servidores Linux sin interfaz gráfica, `HEADLESS` debe ser `true` o no definirse. Si se usa `false` en un servidor sin display, el scraper fallará.

### Resolución de CAPTCHAs (2Captcha)

1. El scraper detecta el captcha en pantalla.
2. Toma una captura de la imagen del captcha.
3. Envía la imagen a la API de 2Captcha (`TWOCAPTCHA_API_KEY`).
4. Espera la respuesta (texto resuelto) y lo escribe en el formulario.
5. Si 2Captcha falla, el reporte se marca para reintento.

### Carpeta `downloads/`

Directorio **temporal**. Los PDFs se guardan aquí al descargarse. Tras subirlos exitosamente a Google Drive, el sistema **los elimina automáticamente**. Las imágenes temporales (captchas) mayores a 30 minutos también se limpian.

---

## 4. ☁️ Configuración de Google Drive — Paso a Paso

El sistema sube automáticamente los certificados a Google Drive con esta estructura:

```
📁 SISTEMA_AUTOMATIZACION_CERTIFICADOS   ← Carpeta raíz (se crea sola si no existe)
├── 📁 NOMBRE DEL SUPERVISOR
│   ├── 📁 2026                          ← Año
│   │   ├── 📁 ENERO                     ← Mes
│   │   │   ├── 📄 barrera_ballesteros_monica_yaneth.pdf
│   │   │   └── 📄 martinez_lopez_juan_carlos.pdf
│   │   └── 📁 FEBRERO
│   └── 📁 2025
└── 📁 OTRO SUPERVISOR
```

### Variables necesarias en el `.env` del backend

```
GOOGLE_OAUTH_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-tu_client_secret
GOOGLE_OAUTH_REFRESH_TOKEN=1//tu_refresh_token
GOOGLE_DRIVE_FOLDER_ID=id_carpeta_raiz   ← (opcional, se crea automáticamente)

HEADLESS=false   ← false=visible (desarrollo) | true=invisible (producción)
```

### Prerequisito: Configurar la pantalla de consentimiento OAuth

Antes de crear credenciales, Google requiere configurar la pantalla de consentimiento. Si ya la tienes configurada, puedes saltarte este paso.

1. Ve a **"APIs y Servicios"** → **"Pantalla de consentimiento de OAuth"**.
2. Tipo de usuario: **Externo** → clic en **"Crear"**.
3. Llena los campos obligatorios: nombre de la app y correo de soporte.
4. En **"Scopes"**, no necesitas agregar nada por ahora.
5. En **"Usuarios de prueba"**, agrega el correo de la cuenta de Google que usará la app.
6. Guarda y continúa.

### Paso 1: Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com).
2. Crea un proyecto nuevo (o usa uno existente).
3. Ve a **"APIs y Servicios"** → **"Biblioteca"**.
4. Busca **"Google Drive API"** y haz clic en **"Habilitar"**.

### Paso 2: Crear credenciales OAuth2

1. Ve a **"APIs y Servicios"** → **"Credenciales"**.
2. Clic en **"Crear credenciales"** → **"ID de cliente OAuth 2.0"**.
3. Tipo de aplicación: **"App de escritorio"** → clic en **"Crear"**.
4. Copia el **Client ID** y el **Client Secret** al archivo `.env`:

```env
GOOGLE_OAUTH_CLIENT_ID=391060...apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
```

> El permiso que se solicitará al usuario es `https://www.googleapis.com/auth/drive.file`. Este scope solo permite acceder a los archivos que la propia app crea — no a todo tu Drive.

### Paso 3: Generar el Refresh Token

El Refresh Token permite al sistema acceder a tu Drive sin que tengas que iniciar sesión cada vez. El script que lo genera ya viene incluido en el repositorio en `backEnd/utils/setupDriveAuth.js`.

```bash
cd backEnd
node utils/setupDriveAuth.js
```

El script hará lo siguiente:

1. Mostrará una URL de autorización en la consola.
2. Abre esa URL en tu navegador e inicia sesión con la cuenta de Google donde se guardarán los archivos.
3. Autoriza el acceso cuando Google lo solicite.
4. El script guarda el refresh token automáticamente en el `.env`.

Salida esperada:

```
🔧 Configuración de Google Drive OAuth2

🔗 Abre esta URL en tu navegador:
   https://accounts.google.com/o/oauth2/v2/auth?...

⏳ Esperando autorización...

✅ Autorización exitosa.
📝 Refresh token guardado en .env
```

### Paso 4: Carpeta Raíz (Opcional)

Si ya tienes una carpeta en Drive donde quieres que se guarden los certificados:

1. Abre esa carpeta en Google Drive.
2. Copia el ID de la URL: `https://drive.google.com/drive/folders/ESTE_ES_EL_ID`
3. Pégalo en el `.env`:
   ```
   GOOGLE_DRIVE_FOLDER_ID=19eE4cFG_FFPeXAaUW93K5UQ0KeWG8GNX
   ```

Si lo **dejas vacío**, el sistema creará automáticamente una carpeta llamada `SISTEMA_AUTOMATIZACION_CERTIFICADOS` en la raíz de tu Drive y actualizará el `.env` con el ID nuevo.

> ⚠️ **IMPORTANTE:** Si la app está en modo **"Pruebas"**, el refresh token **expira cada 7 días**. Para que sea permanente, publícala: ve a "Pantalla de consentimiento" → "Publicar aplicación".

### Errores comunes

| Error | Causa | Solución |
|---|---|---|
| `redirect_uri_mismatch` | El URI de redirección no coincide | Verifica que el tipo de app sea **"App de escritorio"**, no web |
| `invalid_client` | Client ID o Secret incorrectos | Vuelve a copiar las credenciales en el `.env` |
| `Token has been expired or revoked` | Refresh token expirado (modo pruebas) | Ejecuta de nuevo `setupDriveAuth.js` o publica la app |
| `Access blocked` | Tu correo no está en usuarios de prueba | Agrégalo en la pantalla de consentimiento |

### Flujo Automático de Subida

1. El `scraperRunner.js` descarga un PDF exitosamente.
2. Llama a `driveService.js` → `uploadToDrive()`.
3. `driveService` se autentica con las credenciales del `.env`.
4. Valida que la carpeta raíz exista (si no, la crea).
5. Busca/Crea la carpeta del **Supervisor** → **Año** → **Mes**.
6. Sube el PDF con nombre formateado: `apellido1_apellido2_nombre1_nombre2.pdf`.
7. Guarda `driveFileId` y `driveUrl` en el reporte de MongoDB.
8. Elimina el PDF local de `downloads/`.

---

## 5. 👤 Gestión de Supervisores

Los supervisores son las cuentas que acceden al panel administrativo.
**No hay registro público** — se crean manualmente desde la terminal.

### Crear un Supervisor

```bash
cd backEnd
node scripts/addSupervisor.js "Nombre Completo" "NúmeroCédula" "contraseña"
```

**Ejemplo:**
```bash
node scripts/addSupervisor.js "Benito Antonio Martinez Ocasio" "15151515" "123456"
```

Resultado:
```
✅ Conectado a MongoDB
===========================================
✅ Supervisor creado exitosamente:
👤 Nombre: Benito Antonio Martinez Ocasio
🆔 Documento: 15151515
===========================================
```

### Ver Supervisores Existentes

```bash
node scripts/checkSupervisors.js
```

### Login del Supervisor

- **URL:** `http://localhost:5173/login`
- **Campos:** Número de documento + Contraseña
- **Resultado:** Token JWT que da acceso al dashboard (`/supervisor`)

---

## 6. Automatización (Cron Job)

| Aspecto | Detalle |
|---|---|
| **Horario** | Todos los días a las **2:00 AM** |
| **Intentos** | Máximo **3** por reporte |
| **Prioridad** | Reportes nuevos (0 intentos) primero; reintentos al final de la cola |
| **Recuperación** | Reportes "atascados" en `processing` por más de 5 min → se devuelven a `pending` |
| **Control** | Se puede habilitar/deshabilitar vía API (persiste en `config/cron-status.json`) |

### Control del Cron vía API

```bash
# Ver estado
curl http://localhost:3000/api/system/cron/status

# Desactivar
curl -X POST http://localhost:3000/api/system/cron/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Activar
curl -X POST http://localhost:3000/api/system/cron/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 7. 🚀 Guía Rápida para Pruebas

### Requisitos Previos
- Node.js (v18+)
- MongoDB Atlas (o local)
- Cuenta de Google con Google Drive
- API Key de 2Captcha (para plataformas con captcha)

### Pasos

```bash
# 1. Clonar e instalar
git clone https://github.com/camilo2501roco/automatizacion-certificados.git
cd automatizacion-certificados

cd backEnd && npm install
cd ../frontEnd && npm install

# 2. Instalar navegadores Playwright (necesario para los scrapers)
cd ../backEnd
npx playwright install

# 3. Configurar variables de entorno
cp .env-example .env          # ← Editar con credenciales reales
cd ../frontEnd
cp .env-example .env          # ← Ya viene listo para desarrollo local

# 4. Crear un supervisor de prueba
cd ../backEnd
node scripts/addSupervisor.js "Tester" "99999999" "test123"

# 5. Iniciar el proyecto
# Terminal 1:
cd backEnd && npm run dev     # ← Backend en http://localhost:3000

# Terminal 2:
cd frontEnd && npm run dev    # ← Frontend en http://localhost:5173

# 6. Probar
# - Ir a http://localhost:5173 → Enviar un formulario
# - Ir a http://localhost:5173/login → Entrar como supervisor (99999999 / test123)
# - Ejecutar scraper manual: npm run scraper
# - Ver Swagger: http://localhost:3000/api-docs
```

---

## 8. Colecciones de MongoDB

### Supervisores (`supervisors`)
| Campo | Tipo | Descripción |
|---|---|---|
| `name` | String | Nombre completo |
| `documentNumber` | String | Número de cédula (se usa para login) |
| `password` | String | Hash bcrypt |

### Contratistas (`contractors`)
| Campo | Tipo | Descripción |
|---|---|---|
| `documentType` | String | CC, CE, PA, TI |
| `documentNumber` | String | Número de documento |
| `fullName` | String | Nombre completo |
| `eps` | String | EPS del contratista |

### Reportes (`reports`)
| Campo | Tipo | Descripción |
|---|---|---|
| `contractorId` | ObjectId | Referencia al contratista |
| `supervisorId` | ObjectId | Referencia al supervisor |
| `platform` | String | soi, asopagos, mi_planilla, aportes_en_linea |
| `platformData` | Object | JSON con campos específicos de la plataforma |
| `status` | String | pending, processing, success, downloaded, error |
| `attempts` | Number | Intentos realizados (máximo 3) |
| `errorReason` | String | Motivo del error (si aplica) |
| `filePath` | String | Ruta del PDF local (temporal) |
| `driveFileId` | String | ID del archivo en Google Drive |
| `driveUrl` | String | URL para ver el PDF en Drive |
| `reportMonth` | Number | Mes del periodo consultado |
| `reportYear` | Number | Año del periodo consultado |

---

## 9. Comandos Rápidos

| Comando | Ubicación | Descripción |
|---|---|---|
| `npm run dev` | backEnd/ | Iniciar backend con auto-reload |
| `npm start` | backEnd/ | Iniciar en producción |
| `npm run scraper` | backEnd/ | Ejecutar scrapers manualmente (1 ciclo) |
| `node scripts/addSupervisor.js "N" "D" "P"` | backEnd/ | Crear supervisor |
| `node scripts/checkSupervisors.js` | backEnd/ | Listar supervisores |
| `node utils/setupDriveAuth.js` | backEnd/ | Generar refresh token de Google Drive |
| `npm run dev` | frontEnd/ | Iniciar frontend Vite |
| `npm run build` | frontEnd/ | Generar build de producción |
