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

Opción 1: Usar carpeta "PLANILLAS" automática (MÁS FÁCIL):
```
# Contenido del archivo JSON de Service Account en UNA SOLA LÍNEA
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

Opción 2: Usar una carpeta específica:
```
# Service Account credentials
GOOGLE_SERVICE_ACCOUNT_CREDENTIALS={"type":"service_account",...}

# ID de la carpeta específica (DEBES compartirla con el email del Service Account)
GOOGLE_DRIVE_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz
```

**IMPORTANTE: Para configurar Google Drive Service Account:**

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea o selecciona un proyecto
3. Habilita la API de Google Drive:
   - APIs y Servicios → Biblioteca → Buscar "Google Drive API" → Habilitar
4. Crea una cuenta de servicio:
   - APIs y Servicios → Credenciales → Crear credenciales → Cuenta de servicio
   - Nombre: algo descriptivo (ej: "Certificados Drive")
   - Guarda el archivo JSON descargado
5. Convierte el JSON a una sola línea:
   - Linux/Mac: `cat archivo.json | jq -c .`
   - Windows: `(Get-Content archivo.json -Raw | ConvertFrom-Json | ConvertTo-Json -Compress)`
   - Online: https://www.minifier.org/
6. Pega el resultado en `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`
7. Comparte la carpeta de Drive con el email del Service Account:
   - Abre el archivo JSON y copia el valor de `client_email`
   - Ve a la carpeta en Drive → Compartir → Pega el email → Editor

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