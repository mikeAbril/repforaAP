# Google Drive — Estructura de Carpetas

## Estructura de Carpetas en Drive

```
RAÍZ (GOOGLE_DRIVE_FOLDER_ID del .env, o "root" si está vacío)
└── PLANILLAS (creada automáticamente)
    └── [NOMBRE SUPERVISOR] (ej: "SILVIA LOPEZ")
        └── [AÑO] (ej: "2026")
            └── [MES] (ej: "ABRIL")
                └── [apellido1_apellido2_nombre1_nombre2].pdf
```

### Ejemplo Real

```
Mi unidad (root)
└── PLANILLAS
    ├── SILVIA LOPEZ
    │   └── 2026
    │       ├── ENERO
    │       ├── FEBRERO
    │       ├── MARZO
    │       │   └── gonzales_luis_eduardo.pdf
    │       └── ABRIL
    │           └── perez_juan.pdf
    │
    └── CARLOS MARTINEZ
        └── 2026
            └── ABRIL
                └── rodriguez_ana_maria.pdf
```

---

## Autenticación: OAuth2 con Refresh Token en DB

El sistema usa **OAuth2 con cuenta personal de Google** (no Service Account).
Los tokens se guardan en la colección `DriveCredentials` de MongoDB, no en el `.env`.

### Flujo de Autorización

1. Admin inicia sesión en la app
2. Va a **Panel de Administración → Google Drive**
3. Hace clic en **"Autorizar Google Drive"**
4. Autoriza con su cuenta de Google
5. Los tokens se guardan automáticamente en la DB
6. El `access_token` se renueva automáticamente con el `refresh_token`

### Variables de Entorno Requeridas

| Variable                       | Descripción                              | Ejemplo                                            |
|-------------------------------|------------------------------------------|----------------------------------------------------|
| `GOOGLE_OAUTH_CLIENT_ID`      | Client ID de OAuth2 (Google Cloud)       | `944490...apps.googleusercontent.com`              |
| `GOOGLE_OAUTH_CLIENT_SECRET`  | Client Secret de OAuth2                  | `GOCSPX-...`                                       |
| `GOOGLE_DRIVE_FOLDER_ID`      | ID de carpeta raíz en Drive (opcional)   | `1js7A9TZwKJY7Bytrovmansl9zmLJIxi9` o dejar vacío |

> **Nota:** Si `GOOGLE_DRIVE_FOLDER_ID` está vacío, se usa "root" (Mi unidad).

---

## Cómo Funciona la Subida

La función `uploadToDrive()` en `services/driveService.js`:

```
1. getRootFolderId()           → Obtiene la raíz (del .env o "root")
2. getOrCreatePlanillasFolder() → Crea/encuentra "PLANILLAS" en la raíz
3. findOrCreateFolder(SUPERVISOR) → Crea/encuentra carpeta del supervisor
4. findOrCreateFolder(AÑO)      → Crea/encuentra carpeta del año
5. findOrCreateFolder(MES)       → Crea/encuentra carpeta del mes
6. drive.files.create()          → Sube el PDF al mes correspondiente
```

### Actualización Automática del Link del Supervisor

Cada vez que se sube un archivo a Drive, el sistema:
- Obtiene el **ID real** de la carpeta del supervisor en Drive
- Actualiza el campo `driveFolderUrl` del modelo Supervisor con el link correcto
- Esto funciona tanto desde el **cron automático** como desde el **run manual del dashboard**

---

## Troubleshooting

### "No hay credenciales de Google Drive guardadas"
- Nadie ha autorizado OAuth2 aún
- Solución: Ir al panel de admin → Google Drive → Autorizar

### "No se pudo renovar el access token"
- El refresh token expiró o fue revocado
- Solución: Re-autorizar desde el panel de admin

### La carpeta raíz es inválida
- El `GOOGLE_DRIVE_FOLDER_ID` no existe o no tienes acceso
- Solución: Verificar el ID o dejarlo vacío para usar "root"

### Archivos no van a la carpeta del supervisor
- El reporte no tiene `supervisorId` asignado
- Verificar en la consola: debe aparecer `👤 Supervisor encontrado: NOMBRE`
- Si aparece `⚠️ NO HAY SUPERVISOR`, el reporte fue creado sin supervisorId

### Error 403 "Storage quota exceeded" (Service Account)
- Las Service Accounts no funcionan con cuentas personales de Google
- Solución: Usar OAuth2 (ya implementado)