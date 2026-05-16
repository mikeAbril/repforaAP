# 📘 Manual Técnico — Sistema de Automatización de Certificados de Seguridad Social

> **Última actualización:** 16 de mayo de 2026  
> **Stack:** Node.js (Express) + Vue 3 (Quasar) + MongoDB + Playwright + Google Drive API

Este documento consolida toda la documentación técnica del proyecto. Cubre arquitectura, cada archivo del backend y frontend, modelos de datos, endpoints, configuración y despliegue.

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                                │
│  Instructor (público)              Supervisor / Admin (con login)   │
│       │                                    │                        │
│  Formulario de planilla            Dashboard + Panel Admin          │
└───────┬────────────────────────────────────┬────────────────────────┘
        │ POST /api/reports                  │ GET/POST /api/dashboard/*
        ▼                                    ▼
┌──────────────────────── BACKEND (Express) ──────────────────────────┐
│  index.js → Rutas → Controllers → Models (Mongoose) → MongoDB      │
│                                                                      │
│  scraperRunner.js (cron)                                             │
│    ├─ soiScraper.js                                                  │
│    ├─ asopagosScraper.js         ─── Playwright + 2Captcha ───►     │
│    ├─ miPlanillaScraper.js                                           │
│    └─ aportesEnLineaScraper.js                                       │
│         │                                                            │
│         ▼                                                            │
│  driveService.js ──► Google Drive API ──► PDF público en Drive       │
│  nodemailer.js   ──► Gmail SMTP     ──► Correos al instructor       │
└──────────────────────────────────────────────────────────────────────┘
```

### Flujo principal

1. **Instructor** llena formulario público → se crea `Instructor` (upsert) + `Report` con status `pending`.
2. **Cron** (o ejecución manual) toma reportes `pending`, ejecuta el scraper de la plataforma correspondiente.
3. **Scraper** descarga el PDF del certificado → `driveService` lo sube a Google Drive → status `downloaded`.
4. **Nodemailer** envía correo al instructor con enlace de descarga.
5. **Supervisor** ve todo desde su dashboard; **Admin** gestiona supervisores y configura Drive.

---

## 2. Backend — Estructura de Carpetas

```
backEnd/
├── index.js                    # Punto de entrada: Express, CORS, rutas, cron
├── package.json                # Dependencias y scripts npm
├── nodemon.json                # Configuración de nodemon (dev)
├── swagger.yaml                # Documentación OpenAPI (Swagger UI en /api-docs)
├── .env                        # Variables de entorno (NO en Git)
├── .env-example                # Plantilla de variables de entorno
│
├── config/
│   └── db.js                   # Conexión a MongoDB (con reconexión automática)
│
├── models/
│   ├── Instructor.js           # Esquema del instructor/contratista
│   ├── Supervisor.js           # Esquema del supervisor (incluye admin)
│   ├── Report.js               # Esquema del reporte/solicitud
│   └── DriveCredentials.js     # Tokens OAuth2 de Google Drive
│
├── routes/
│   ├── authRoutes.js           # Login, forgot/reset password, admin temporal
│   ├── reportRoutes.js         # Crear reporte + lookup instructor
│   ├── dashboardRoutes.js      # CRUD reportes del supervisor (protegido)
│   ├── supervisorRoutes.js     # Perfil, admin CRUD supervisores
│   ├── systemRoutes.js         # Control del cron (status/toggle)
│   └── driveAuthRoutes.js      # OAuth2 Google Drive (url, callback, status)
│
├── controllers/
│   ├── authController.js       # login, changePassword, forgotPassword, verifyCode
│   ├── reportController.js     # submitReport, lookupInstructor
│   ├── dashboardController.js  # getReports, getStats, runReport, deleteReport
│   ├── supervisorController.js # perfil, apiKey, driveLink, admin CRUD
│   └── driveAuthController.js  # OAuth2 flow completo (URL dinámica)
│
├── middlewares/
│   └── authMiddleware.js       # authMiddleware (JWT) + roleMiddleware
│
├── helpers/
│   ├── jwt.js                  # generateToken / verifyToken (8h expiración)
│   └── humanBehavior.js        # randomDelay, humanType, humanClick, humanSelect
│
├── utils/
│   ├── crypto.js               # encrypt / decrypt (AES-256-CBC) para API Keys
│   ├── nodemailer.js           # sendEmail() con plantilla institucional SENA
│   └── setupDriveAuth.js       # Script CLI para generar refresh token
│
├── validations/
│   ├── auth.validation.js      # Reglas para login (documentType, documentNumber, password)
│   ├── report.validation.js    # Reglas para crear reporte (campos comunes)
│   └── platform.validation.js  # Campos obligatorios por plataforma (platformData)
│
├── scrapers/
│   ├── scraperRunner.js        # Orquestador: cron, reintentos, limpieza
│   ├── soiScraper.js           # Scraper SOI (sin captcha)
│   ├── asopagosScraper.js      # Scraper Asopagos (captcha imagen)
│   ├── miPlanillaScraper.js    # Scraper Compensar (captcha numérico)
│   └── aportesEnLineaScraper.js # Scraper Aportes en Línea (reCAPTCHA v2)
│
├── services/
│   └── driveService.js         # getDriveClient, uploadToDrive, getRootFolderId
│
├── scripts/
│   ├── addSupervisor.js        # CLI: crear supervisor
│   ├── createAdmin.js          # CLI: crear/actualizar administrador
│   └── checkSupervisors.js     # CLI: listar supervisores existentes
│
├── assets/
│   └── logo-sena.png           # Logo SENA para correos
│
└── downloads/                  # PDFs temporales (se eliminan tras subir a Drive)
```

---

## 3. Modelos de Datos (MongoDB)

### 3.1 Instructor (`instructors`)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `documentType` | String | ✅ | CC, CE, PA, TI, CD, PE, PT, RC, SC |
| `documentNumber` | String | ✅ | Número de documento |
| `fullName` | String | ✅ | Nombre completo |
| `email` | String | ✅ | Correo electrónico |
| `documentIssueDate` | Date | ❌ | Fecha de expedición del documento |
| `supervisorId` | ObjectId | ❌ | Referencia al supervisor asignado |

> **Índice único:** `{ documentType, documentNumber }`

### 3.2 Supervisor (`supervisors`)

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `documentType` | String | ✅ | — | Tipo de documento |
| `documentNumber` | String | ✅ | — | Número de documento (login) |
| `documentIssueDate` | String | ❌ | null | Fecha expedición |
| `name` | String | ✅ | — | Nombre completo |
| `email` | String | ✅ | — | Correo (único) |
| `password` | String | ✅ | — | Hash bcrypt |
| `apiKey` | String | ❌ | null | API Key 2Captcha (encriptada AES) |
| `mustChangePassword` | Boolean | — | true | Forzar cambio en primer login |
| `driveFolderUrl` | String | ❌ | null | URL de su carpeta en Drive |
| `isConfigured` | Boolean | — | false | ¿Perfil configurado? |
| `role` | String | — | "supervisor" | "admin" o "supervisor" |
| `resetPasswordToken` | String | ❌ | null | Código de 6 dígitos (reset) |
| `resetPasswordExpires` | Date | ❌ | null | Expiración del código |

> **Índice único:** `{ documentType, documentNumber }`

### 3.3 Report (`reports`)

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `instructorId` | ObjectId | ✅ | — | Ref → Instructor |
| `supervisorId` | ObjectId | ✅ | — | Ref → Supervisor |
| `platform` | String | ✅ | — | soi, aportes_en_linea, asopagos, mi_planilla |
| `platformData` | Mixed | ✅ | — | Campos específicos de la plataforma |
| `eps` | String | ✅ | — | EPS del instructor |
| `reportMonth` | Number | ✅ | — | Mes del periodo |
| `reportYear` | Number | ✅ | — | Año del periodo |
| `status` | String | ✅ | "pending" | pending → processing → success → downloaded / error |
| `errorReason` | String | ❌ | null | Motivo del error |
| `driveFileId` | String | ❌ | null | ID del archivo en Drive |
| `driveUrl` | String | ❌ | null | URL pública del PDF |
| `filePath` | String | ❌ | null | Ruta local temporal |
| `attempts` | Number | — | 0 | Intentos realizados (máx 3) |

### 3.4 DriveCredentials (`drivecredentials`)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `accessToken` | String | Token de acceso OAuth2 |
| `refreshToken` | String | Token de refresco OAuth2 |
| `expiryDate` | Date | Fecha de expiración del access token |

---

## 4. API — Endpoints Completos

### 4.1 Autenticación (`/api/auth`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/login` | ❌ | Login → JWT (8h) |
| POST | `/change-password` | 🔒 JWT | Cambio obligatorio de contraseña |
| POST | `/forgot-password` | ❌ | Envía código de 6 dígitos al correo |
| POST | `/verify-code` | ❌ | Verifica código y restablece contraseña |
| POST | `/crear-admin-temporal-xyz123` | ❌ | ⚠️ TEMPORAL: crea admin inicial |

### 4.2 Reportes (`/api/reports`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/` | ❌ | Crear reporte (público, desde formulario) |
| GET | `/instructors/lookup` | ❌ | Buscar instructor por documento (autocompletar) |

### 4.3 Dashboard (`/api/dashboard`) — Todas protegidas con JWT

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reports` | Lista reportes con filtros y paginación |
| GET | `/stats` | Estadísticas: conteo por status |
| POST | `/reports/:id/run` | Ejecutar scraper manualmente para un reporte |
| DELETE | `/reports/:id` | Eliminar reporte (solo si no está completado) |

### 4.4 Supervisores (`/api/supervisors`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/list` | ❌ | Lista pública (nombre + ID) para select |
| GET | `/profile` | 🔒 | Perfil completo del supervisor logueado |
| GET | `/profile/apikey` | 🔒 | API Key desencriptada |
| GET | `/profile/drive-link` | 🔒 | URL de la carpeta de Drive del supervisor |
| PUT | `/profile` | 🔒 | Actualizar API Key (valida con 2Captcha) |
| GET | `/admin/all` | 🔒 Admin | Lista todos los supervisores |
| POST | `/admin` | 🔒 Admin | Crear supervisor |
| PUT | `/admin/:id` | 🔒 Admin | Editar supervisor |
| DELETE | `/admin/:id` | 🔒 Admin | Eliminar supervisor |

### 4.5 Google Drive (`/api/drive`)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/auth/url` | 🔒 | Genera URL de autorización OAuth2 |
| GET | `/auth/callback` | ❌ | Callback de Google (redirect) |
| POST | `/auth/callback` | ❌ | Callback alternativo (frontend) |
| GET | `/auth/status` | 🔒 | Estado de las credenciales |
| DELETE | `/auth/revoke` | 🔒 | Revocar credenciales guardadas |

### 4.6 Sistema (`/api/system`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cron/status` | Estado del cron (habilitado/deshabilitado) |
| POST | `/cron/toggle` | Activar/desactivar cron `{ enabled: bool }` |

### 4.7 Otros

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Health check del servidor |
| GET | `/api-docs` | Swagger UI (documentación interactiva) |

---

## 5. Motor de Scraping

### 5.1 Scrapers por Plataforma

| Plataforma | Archivo | Captcha | Campos `platformData` |
|------------|---------|---------|----------------------|
| SOI | `soiScraper.js` | Ninguno | `mes`, `anio` |
| Asopagos | `asopagosScraper.js` | Imagen → 2Captcha | `mes`, `anio` |
| Compensar | `miPlanillaScraper.js` | Numérico → 2Captcha | `numeroPlanilla`, `mes`, `anio`, `valorPagado`, `fechaPago` |
| Aportes en Línea | `aportesEnLineaScraper.js` | reCAPTCHA v2 → 2Captcha | `anio`, `mes` |

### 5.2 Flujo del scraperRunner.js

```
1. ¿Cron habilitado? → No → Saltar
2. ¿Ya hay ciclo corriendo? → Sí → Saltar
3. Recuperar reportes "atascados" (processing > 5 min → pending)
4. Limpiar archivos temporales (downloads/ > 30 min)
5. Por cada plataforma:
   a. Buscar reportes pending (nuevos primero, reintentos después)
   b. Por cada reporte:
      - Marcar processing, sumar intento
      - Ejecutar scraper
      - Éxito → success → subir a Drive → downloaded + correo
      - Fallo → intentos < 3 ? pending : error
6. Fin del ciclo
```

### 5.3 Ciclo de Estados

```
pending ──► processing ──► success ──► downloaded (subido a Drive + correo enviado)
                │
                ├──► pending  (reintento, intentos < 3)
                └──► error    (3 intentos fallidos)
```

### 5.4 humanBehavior.js

Utilidades anti-detección de bots:
- `randomDelay(min, max)` — pausa aleatoria
- `humanType(page, selector, text)` — tipeo carácter por carácter
- `humanClick(page, selector)` — click con pausa
- `humanSelect(page, selector, value)` — seleccionar opción con pausa

---

## 6. Google Drive — Integración

### 6.1 Estructura de Carpetas

```
📁 [GOOGLE_DRIVE_FOLDER_ID o root]
└── 📁 PLANILLAS
    ├── 📁 NOMBRE DEL SUPERVISOR (mayúsculas)
    │   ├── 📁 2026
    │   │   ├── 📁 ENERO
    │   │   │   └── 📄 apellido1_apellido2_nombre1_nombre2.pdf
    │   │   └── 📁 FEBRERO
    │   └── 📁 2025
    └── 📁 OTRO SUPERVISOR
```

### 6.2 OAuth2 Dinámico

`driveAuthController.js` detecta automáticamente el host de la petición para construir la URL de callback:

```js
const getRedirectUri = (req) => {
    if (process.env.NODE_ENV === "production") {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.get('host');
        return `${protocol}://${host}/api/drive/auth/callback`;
    }
    return "http://localhost:5173/api/drive/auth/callback";
};
```

> **No se necesita `FRONTEND_URL`.** El sistema es agnóstico al dominio.

### 6.3 Tokens en Base de Datos

Los tokens OAuth2 se guardan en la colección `DriveCredentials` (no en `.env`). El `accessToken` se renueva automáticamente cuando expira usando el `refreshToken`.

---

## 7. Sistema de Correos (Nodemailer)

Se envían correos en los siguientes eventos:

| Evento | Destinatario | Asunto |
|--------|-------------|--------|
| Reporte creado | Instructor | "Solicitud de certificado recibida" |
| Certificado listo | Instructor | "Certificado listo" + enlace Drive |
| Error de API Key | Supervisor | "Alerta: Problema con la API Key de 2Captcha" |
| Forgot password | Supervisor | "Código de Recuperación" (6 dígitos) |

Todos usan plantilla HTML institucional con logo SENA embebido (CID).

**Configuración SMTP:** Gmail (puerto 465, SSL). Variables: `MAIL_USER`, `MAIL_PASS`.

---

## 8. Seguridad

| Mecanismo | Implementación |
|-----------|---------------|
| **Autenticación** | JWT (8h) en header `Authorization: Bearer` |
| **Autorización** | `authMiddleware` + `roleMiddleware(["admin"])` |
| **Contraseñas** | bcrypt (salt 10 rounds) |
| **API Keys** | AES-256-CBC (encrypt/decrypt) con `CRYPTO_KEY` |
| **CORS** | Orígenes específicos permitidos |
| **Primer login** | `mustChangePassword: true` → fuerza cambio |
| **Reset password** | Código 6 dígitos por email (1h expiración) |

---

## 9. Frontend — Estructura de Carpetas

```
frontEnd/
├── index.html               # Punto de entrada HTML
├── vite.config.js            # Configuración Vite + Quasar plugin
├── package.json              # Dependencias frontend
├── .env / .env-example       # VITE_API_URL
│
└── src/
    ├── main.js               # Inicialización: Vue + Pinia + Quasar + Router
    ├── App.vue               # Componente raíz (<router-view>)
    ├── style.css              # Estilos globales
    ├── quasar-variables.sass  # Variables de tema Quasar
    │
    ├── layouts/
    │   └── MainLayout.vue     # Layout con header verde SENA + transiciones
    │
    ├── views/
    │   ├── HomeView.vue             # Página principal con selección de plataforma
    │   ├── InstructorView.vue       # Formulario de planilla (Aportes en Línea / Compensar)
    │   ├── LoginView.vue            # Login de supervisores
    │   ├── SupervisorView.vue       # Dashboard del supervisor + reportes
    │   ├── ChangePasswordView.vue   # Cambio obligatorio de contraseña
    │   ├── ForgotPasswordView.vue   # Recuperación de contraseña (código)
    │   └── CardTest.vue             # Vista de prueba para tarjetas
    │
    ├── components/
    │   ├── UnifiedForm.vue          # Formulario genérico (SOI, Asopagos)
    │   ├── FormModal.vue            # Modal reutilizable para formularios
    │   ├── AdminPanel.vue           # Panel de administración (CRUD supervisores)
    │   └── DriveAuthPanel.vue       # Panel de conexión Google Drive
    │
    ├── store/
    │   └── auth.js             # Pinia store: token JWT (localStorage)
    │
    ├── plugins/
    │   ├── axios.js            # Instancia Axios con interceptor Bearer
    │   └── notify.js           # Sistema de notificaciones reactivo
    │
    ├── services/
    │   └── apiClient.js        # Wrapper: getData, postData, putData, deleteData
    │
    ├── routes/
    │   └── routes.js           # Vue Router + navigation guards
    │
    ├── static/
    │   └── formConfigs.js      # Configuración de campos por plataforma
    │
    └── assets/
        ├── logo-sena.png       # Logo SENA
        ├── card.png            # Imagen decorativa
        ├── ejemplo.png         # Imagen de ejemplo
        └── platforms/          # Íconos de plataformas
```

### 9.1 Rutas del Frontend

| Ruta | Vista | Auth | Descripción |
|------|-------|------|-------------|
| `/` | HomeView | ❌ | Selección de plataforma |
| `/instructor` | InstructorView | ❌ | Formulario Aportes en Línea / Compensar |
| `/form/:platform` | UnifiedForm | ❌ | Formulario genérico (SOI, Asopagos) |
| `/login` | LoginView | Solo guests | Login supervisor |
| `/forgot-password` | ForgotPasswordView | Solo guests | Recuperar contraseña |
| `/supervisor` | SupervisorView | 🔒 | Dashboard del supervisor |
| `/change-password` | ChangePasswordView | 🔒 | Cambio obligatorio de contraseña |

### 9.2 Navigation Guards

- **`requiresAuth`** → sin token redirige a `/login`
- **`guestOnly`** → con token redirige a `/supervisor`
- **`mustChangePassword`** → fuerza redirección a `/change-password`

### 9.3 Dependencias Frontend

| Paquete | Uso |
|---------|-----|
| `vue` 3.5 | Framework UI |
| `quasar` 2.18 | Componentes UI (inputs, tablas, notificaciones, diálogos) |
| `pinia` 3.0 | State management |
| `vue-router` 5.0 | Enrutamiento SPA |
| `axios` 1.13 | HTTP client |
| `xlsx` 0.18 | Exportar reportes a Excel |
| `html2canvas` 1.4 | Captura de pantalla de elementos |
| `sass` 1.97 | Preprocesador CSS para Quasar |

---

## 10. Variables de Entorno

### 10.1 Backend (`.env`)

```env
# Base de datos
MONGO_URI=mongodb+srv://...

# Servidor
PORT=3000

# Autenticación
JWT_SECRET=clave_secreta_segura

# Google Drive OAuth2
GOOGLE_OAUTH_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
GOOGLE_DRIVE_FOLDER_ID=              # Opcional, usa root si vacío

# Encriptación de API Keys
CRYPTO_KEY=clave_de_32_caracteres_aqui

# Scrapers
HEADLESS=false                       # false=visible, true=producción

# Correo
MAIL_USER=correo@gmail.com
MAIL_PASS=contraseña_de_aplicación
```

### 10.2 Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3000/api
```

> En producción (Docker/Coolify), el frontend se sirve como estático desde el backend, por lo que `VITE_API_URL` apunta al mismo dominio.

---

## 11. Scripts de Terminal

```bash
# ── Backend ──
npm run dev                    # Iniciar con nodemon (desarrollo)
npm start                      # Iniciar en producción
npm run scraper                # Ejecutar un ciclo de scrapers manualmente

# ── Scripts de gestión ──
node scripts/addSupervisor.js "Nombre" "CC" "12345" "email@x.com" "pass" ["apiKey"]
node scripts/createAdmin.js "Nombre" "CC" "12345" "email@x.com" "pass"
node scripts/checkSupervisors.js

# ── Frontend ──
npm run dev                    # Vite dev server (localhost:5173)
npm run build                  # Build de producción (dist/)
npm run preview                # Preview del build
```

---

## 12. Despliegue (Coolify / Docker)

1. El **frontend** se compila con `npm run build` generando la carpeta `dist/`.
2. El **backend** sirve `dist/` como archivos estáticos desde `../public`.
3. **No se necesita `FRONTEND_URL`**: las URLs de redirección OAuth2 se detectan automáticamente desde los headers de la petición (`x-forwarded-proto`, `x-forwarded-host`).
4. Configurar variables de entorno en el panel de Coolify.
5. El backend escucha en `PORT` (default 3000).

---

## 13. Dependencias Backend

| Paquete | Versión | Uso |
|---------|---------|-----|
| `express` | 5.2 | Servidor HTTP |
| `mongoose` | 9.2 | ODM para MongoDB |
| `bcryptjs` | 3.0 | Hash de contraseñas |
| `jsonwebtoken` | 9.0 | Generación/verificación JWT |
| `cors` | 2.8 | Middleware CORS |
| `morgan` | 1.10 | Logger HTTP |
| `dotenv` | 17.3 | Variables de entorno |
| `express-validator` | 7.3 | Validación de requests |
| `googleapis` | 171.4 | Google Drive API v3 |
| `playwright` | 1.60 | Automatización de navegador |
| `@2captcha/captcha-solver` | 1.3 | Resolución de CAPTCHAs |
| `nodemailer` | 8.0 | Envío de correos SMTP |
| `node-cron` | 4.2 | Programación de tareas |
| `swagger-ui-express` | 5.0 | Documentación API |
| `yamljs` | 0.3 | Parser YAML (Swagger) |
| `adm-zip` | 0.5 | Manejo de archivos ZIP |

---

## 14. Guía Rápida para Pruebas

```bash
# 1. Clonar e instalar
git clone <repo>
cd backEnd && npm install
cd ../frontEnd && npm install

# 2. Instalar navegadores Playwright
cd ../backEnd && npx playwright install

# 3. Configurar variables de entorno
cp .env-example .env   # Editar con credenciales reales

# 4. Crear admin y supervisor de prueba
node scripts/createAdmin.js "Admin" "CC" "99999999" "admin@test.com" "admin123"
node scripts/addSupervisor.js "Supervisor Test" "CC" "88888888" "sup@test.com" "test123"

# 5. Iniciar
# Terminal 1: cd backEnd && npm run dev
# Terminal 2: cd frontEnd && npm run dev

# 6. Probar
# → http://localhost:5173          (formulario público)
# → http://localhost:5173/login    (login supervisor: CC / 88888888 / test123)
# → http://localhost:3000/api-docs (Swagger)
# → npm run scraper               (ejecutar scrapers manualmente)
```
