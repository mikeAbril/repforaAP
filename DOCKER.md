# Despliegue con Coolify (Docker)

## Variables de Entorno en Coolify

### Obligatorias
```
NODE_ENV=production
PORT=3000

# MongoDB
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/certificados

# Autenticación
JWT_SECRET=tu_jwt_secret_seguro_aqui

# Encriptación de API Keys (32 caracteres exactos)
CRYPTO_KEY=tu_clave_de_32_caracteres_aqui!

# Correo (Gmail con contraseña de aplicación)
MAIL_USER=correo@gmail.com
MAIL_PASS=contraseña_de_aplicación

# Scrapers
HEADLESS=true
```

### Google Drive OAuth2
```
GOOGLE_OAUTH_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-tu_client_secret

# Opcional: ID de carpeta raíz en Drive
# Si no se define, se usará "Mi Drive" del usuario que autorice
GOOGLE_DRIVE_FOLDER_ID=
```

> **Nota:** NO se necesita `FRONTEND_URL` ni `VITE_API_URL`. El sistema detecta automáticamente el dominio en producción.

---

## Configurar OAuth2 en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea o selecciona un proyecto
3. **APIs y Servicios → Biblioteca** → Buscar "Google Drive API" → Habilitar
4. **Pantalla de consentimiento OAuth**:
   - Tipo: Externo
   - Agrega correo de soporte y dominios autorizados
   - Scope: `https://www.googleapis.com/auth/drive.file`
5. **Credenciales → Crear → ID de cliente OAuth 2.0**:
   - Tipo: **Aplicación web**
   - Orígenes autorizados: `https://tu-dominio.com`
   - URI de redirección: `https://tu-dominio.com/api/drive/auth/callback`
6. Copia Client ID y Client Secret a las variables de Coolify
7. Una vez desplegado, el **Admin** debe ir a **Configuración → Google Drive** y autorizar

---

## Configuración en Coolify

1. Crear nuevo proyecto → seleccionar **"Dockerfile"**
2. Configurar:
   - **Docker Context:** `/` (raíz del repositorio)
   - **Dockerfile Path:** `Dockerfile`
   - **Port:** `3000`
3. Agregar las variables de entorno
4. Deploy

---

## MongoDB

**Opción 1: MongoDB Atlas (Recomendado)**
- Cluster gratuito en [MongoDB Atlas](https://www.mongodb.com/atlas)
- Copiar connection string a `MONGO_URI`

**Opción 2: MongoDB en Coolify**
- Crear servicio MongoDB en Coolify
- Usar la URI interna como `MONGO_URI`

---

## Build Local (pruebas)

```bash
docker build -t cert-sena .
docker run -p 3000:3000 --env-file backEnd/.env cert-sena
```

---

## Cómo funciona el Dockerfile

1. **Stage 1 (frontend-builder):** Instala dependencias del frontend (incluyendo Vite), ejecuta `npm run build`, genera `dist/`.
2. **Stage 2 (runtime):** Usa la imagen oficial de Playwright (Ubuntu con Chromium pre-instalado), instala dependencias del backend, copia el `dist/` del frontend a `./public`.
3. El backend sirve `./public` como archivos estáticos y tiene un **catch-all** que redirige cualquier ruta no-API a `index.html` para que Vue Router funcione.

---

## Estructura en el contenedor

```
/app
├── index.js              ← Backend Express
├── node_modules/
├── controllers/
├── routes/
├── scrapers/
├── services/
├── ...
├── downloads/            ← PDFs temporales
└── public/               ← Frontend compilado (dist/)
    ├── index.html
    └── assets/
```

---

## Solución de Problemas

### Playwright / Scrapers
- La imagen Docker usa `mcr.microsoft.com/playwright` con Chromium pre-instalado
- `HEADLESS=true` es obligatorio en producción (no hay display)
- Los scrapers funcionan automáticamente con el Chromium del sistema

### Rutas del frontend (404)
- El backend tiene un catch-all `app.get("*")` que sirve `index.html`
- Esto permite que `/login`, `/supervisor`, etc. funcionen correctamente
- Solo las rutas que empiezan con `/api` son manejadas por Express

### Google Drive
- **Error 403**: Verifica que el scope sea `drive.file` y que la app esté publicada
- **Token expirado**: El sistema renueva automáticamente el access_token usando el refresh_token
- **Permiso público**: Los archivos se comparten como "anyone with link" automáticamente

### CORS
- En producción, frontend y backend están en el mismo dominio → no hay problemas de CORS
- Los orígenes permitidos están hardcodeados en `index.js` para desarrollo local

### Estructura de carpetas en Drive
```
📁 [GOOGLE_DRIVE_FOLDER_ID o Mi Drive]
└── 📁 PLANILLAS
    └── 📁 NOMBRE DEL SUPERVISOR
        └── 📁 2026
            └── 📁 ENERO
                └── 📄 apellido1_apellido2_nombre1_nombre2.pdf
```