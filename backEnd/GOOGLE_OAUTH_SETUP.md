# Configuración de Google Drive con OAuth2

## Resumen

El sistema ahora usa OAuth2 con refresh tokens guardados en la base de datos para poder subir archivos a Google Drive desde una cuenta personal.

## ¿Por qué este cambio?

Las **Service Accounts** de Google NO funcionan con cuentas personales porque no tienen almacenamiento en "Mi Drive". OAuth2 es la única opción para cuentas personales.

## Configuración Paso a Paso

### 1. Configurar el Redirect URI en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto
3. Ve a **APIs y Servicios** → **Credenciales**
4. Edita tu **OAuth 2.0 Client ID** (el que ya tienes en el .env)
5. En la sección **URI de redirección autorizada**, agrega:
   - **Desarrollo**: `http://localhost:3000/api/drive/auth/callback`
   - **Producción**: `https://tu-dominio.com/api/drive/auth/callback`
6. Haz clic en **Guardar**

### 2. Asegúrate de tener las credenciales en el .env

```env
GOOGLE_OAUTH_CLIENT_ID=tu_client_id_aqui
GOOGLE_OAUTH_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id_aqui
```

### 3. Iniciar el backend

```bash
npm start
```

### 4. Autorizar desde la interfaz

1. Inicia sesión en la aplicación como **administrador**
2. Ve al **Panel de Administración**
3. Selecciona la pestaña **Google Drive**
4. Haz clic en **Autorizar Google Drive**
5. Se abrirá Google en una nueva pestaña
6. Inicia sesión y autoriza la aplicación
7. **Serás redirigido automáticamente** a una página de éxito que te llevará de vuelta al panel
8. ¡Listo! Los tokens se guardan en la base de datos automáticamente

## Funcionamiento

- Los tokens (access_token y refresh_token) se guardan en la colección `drivecredentials` de MongoDB
- El access_token se renueva automáticamente cuando expira usando el refresh_token
- Si el refresh_token también expira, el admin verá una alerta y podrá re-autorizar con un clic
- Los tokens persisten en la base de datos, no se pierden al redeploy
- El callback de Google muestra una página HTML de éxito/error y redirige automáticamente al panel

## Estructura de Carpetas en Drive

Si defines `GOOGLE_DRIVE_FOLDER_ID`:
```
TU_CARPETA (ID especificado)
└── [NOMBRE_SUPERVISOR]/
    └── [AÑO]/
        └── [MES]/
            └── [NOMBRE_INSTRUCTOR].pdf
```

Si NO defines `GOOGLE_DRIVE_FOLDER_ID`:
```
Mi Drive
└── PLANILLAS (creada automáticamente)
    └── [NOMBRE_SUPERVISOR]/
        └── [AÑO]/
            └── [MES]/
                └── [NOMBRE_INSTRUCTOR].pdf
```

## Endpoints de la API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/drive/auth/url` | Obtiene la URL de autorización (requiere admin) |
| GET | `/api/drive/auth/callback` | Procesa el callback desde Google (muestra HTML) |
| POST | `/api/drive/auth/callback` | Procesa el código de autorización (JSON) |
| GET | `/api/drive/auth/status` | Verifica el estado de las credenciales |
| DELETE | `/api/drive/auth/revoke` | Revoca las credenciales actuales |

## Solución de Problemas

### Error: "redirect_uri_mismatch"
- El redirect URI configurado en Google Cloud no coincide
- Verifica que hayas agregado la URL correcta en los "URI de redirección autorizados"
- En el panel, puedes copiar el URI correcto con el botón de copiar

### Error: "No hay credenciales guardadas"
- Nunca has autorizado la aplicación
- Usa el botón "Autorizar Google Drive" en el panel de administración

### Error: "Token expirado"
- El refresh_token ha expirado (muy raro)
- Usa el botón "Revocar" y luego vuelve a autorizar

### Error: "No se pudo renovar el access token"
- El refresh_token no es válido
- Re-autoriza la aplicación

### La página de callback muestra error
- Revisa los logs del backend para ver el error específico
- Asegúrate de que el CLIENT_ID y CLIENT_SECRET son correctos
- Verifica que el redirect URI coincida exactamente

## Cambios en el Código

- **Nuevo modelo**: `DriveCredentials` - Guarda tokens en MongoDB
- **Nuevo controller**: `driveAuthController.js` - Maneja autorización OAuth con callbacks GET y POST
- **Nuevas rutas**: `/api/drive/*` - Endpoints para autorización
- **Actualizado**: `driveService.js` - Lee tokens de DB y los renueva
- **Nuevo componente**: `DriveAuthPanel.vue` - UI para autorizar con mejor UX
- **Actualizado**: `AdminPanel.vue` - Agregada pestaña de Google Drive