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

#### Variables Opcionales (según funcionalidades)
```
# Google Drive OAuth
GOOGLE_OAUTH_CLIENT_ID=tu_client_id
GOOGLE_OAUTH_CLIENT_SECRET=tu_client_secret
GOOGLE_OAUTH_REFRESH_TOKEN=tu_refresh_token
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id

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
docker build -t automatizacion-certificados .
docker run -p 3000:3000 --env-file .env automatizacion-certificados
```

### Solución de Problemas

#### Playwright en Docker
El Dockerfile ya incluye las dependencias necesarias para que Playwright funcione en Alpine Linux usando Chromium del sistema.

#### Archivos estáticos
El Dockerfile compila el frontend y copia los archivos a `/app/public` en el contenedor. El backend los sirve automáticamente.

#### CORS
Asegúrate de que `FRONTEND_URL` incluya todos los dominios donde se accederá a la aplicación (incluyendo `https://tu-dominio.com`).