# Despliegue con Coolify (Docker)

## Configuración en Coolify

### Variables de Entorno

Agrega las siguientes variables de entorno en Coolify:

#### Variables Obligatorias
```
NODE_ENV=production
PORT=3000

# MongoDB URI
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/certificados

# JWT Secret (cámbialo por algo seguro)
JWT_SECRET=tu_jwt_secret_seguro

# FRONTEND_URL (la URL donde estará desplegada)
FRONTEND_URL=https://tu-dominio.com

# VITE_API_URL (URL de la API para el frontend build)
VITE_API_URL=https://tu-dominio.com/api
```

#### Variables de Google Drive (OBLIGATORIAS para subir archivos)

El sistema utiliza **OAuth2** con cuentas personales o de Workspace. No uses Service Accounts.

```
# Credenciales del cliente OAuth2 (OBLIGATORIAS)
GOOGLE_OAUTH_CLIENT_ID=tu_client_id_de_google_cloud
GOOGLE_OAUTH_CLIENT_SECRET=tu_client_secret_de_google_cloud

# ID de la carpeta raíz específica (OPCIONAL)
# Si no lo pones, se crearán en la raíz ("Mi unidad") de quien inicie sesión
GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
```

**IMPORTANTE: Para configurar Google Drive OAuth2:**

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea o selecciona un proyecto
3. Habilita la API de Google Drive:
   - APIs y Servicios → Biblioteca → Buscar "Google Drive API" → Habilitar
4. Configura la Pantalla de Consentimiento OAuth:
   - Tipo de usuario: Externo (o Interno si usas Workspace)
   - Agrega los dominios autorizados y tu correo
   - Agrega el scope: `.../auth/drive.file`
5. Crea credenciales OAuth2:
   - APIs y Servicios → Credenciales → Crear credenciales → ID de cliente de OAuth
   - Tipo de aplicación: Aplicación web
   - Orígenes de JavaScript autorizados: `https://tu-dominio.com`
   - URI de redireccionamiento autorizados: `https://tu-dominio.com/api/drive/auth/callback`
6. Copia el **ID de cliente** y el **Secreto de cliente** en las variables correspondientes en Coolify.
7. Una vez desplegado, el **Admin** debe entrar a la app, ir a **Configuración → Google Drive** y autorizar el acceso.

#### Variables Opcionales (según funcionalidades)
```
# CRYPTO_KEY (32 caracteres)
CRYPTO_KEY=tu_clave_32_caracteres_aqui

# Nodemailer (correo)
MAIL_USER=tu_email@ejemplo.com
MAIL_PASS=tu_password_aplicacion

# Playwright headless mode
HEADLESS=true
```

### Configuración en Coolify

1. Crea un nuevo proyecto en Coolify
2. Selecciona "Dockerfile" como tipo de aplicación
3. Configura:
   - **Docker Context:** `/` (raíz del repositorio)
   - **Dockerfile Path:** `Dockerfile`
   - **Port:** `3000`
4. Agrega las variables de entorno listadas arriba
5. Deploy

### MongoDB

Para MongoDB tienes dos opciones:

**Opción 1: Usar MongoDB Atlas (Recomendado)**
- Crea un cluster gratuito en MongoDB Atlas
- Obtiene la connection string y agrégala a `MONGO_URI`

**Opción 2: Usar Coolify para MongoDB**
- Crea un servicio de MongoDB en Coolify
- Agrega la conexión a `MONGO_URI`

### Build Local (Para pruebas)

```bash
# Copia tu .env con las variables necesarias
docker build -t automatizacion-certificados .
docker run -p 3000:3000 --env-file .env automatizacion-certificados
```

### Solución de Problemas

#### Playwright en Docker
El Dockerfile ya incluye las dependencias necesarias para que Playwright funcione en Alpine Linux usando Chromium del sistema.

#### Archivos estáticos
El Dockerfile compila el frontend y copia los archivos a `/app/public` en el contenedor. El backend los sirve automáticamente.

#### Google Drive
- **Error 403**: Comparte la carpeta con el email del Service Account (está en el JSON)
- **Error 404**: El folder_id no existe, se creará/usará "PLANILLAS" automáticamente
- **Permiso insuficiente**: El Service Account necesita permisos de "Editor" en la carpeta

#### CORS
Asegúrate de que `FRONTEND_URL` incluya todos los dominios donde se accederá a la aplicación.

### Estructura de carpetas en Drive

Si defines `GOOGLE_DRIVE_FOLDER_ID`:
```
TU_CARPETA/
└── [NOMBRE_SUPERVISOR]/
    └── [AÑO]/
        └── [MES]/
            └── [INSTRUCTOR].pdf
```

Si NO defines `GOOGLE_DRIVE_FOLDER_ID`:
```
Mi Drive/
└── PLANILLAS/
    └── [NOMBRE_SUPERVISOR]/
        └── [AÑO]/
            └── [MES]/
                └── [INSTRUCTOR].pdf
```