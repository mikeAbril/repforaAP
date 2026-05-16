/**
 * driveAuthController.js — Autorización OAuth2 de Google Drive
 *
 * Implementa el flujo completo de OAuth2 sin usar la librería googleapis
 * para evitar el bug "next is not a function" con Express.
 *
 * Endpoints:
 *  GET    /api/drive/auth/url      → Genera URL de autorización de Google (requiere admin)
 *  GET    /api/drive/auth/callback → Procesa callback de Google (redirección)
 *  POST   /api/drive/auth/callback → Procesa callback desde el frontend
 *  GET    /api/drive/auth/status   → Verifica si hay credenciales válidas
 *  DELETE /api/drive/auth/revoke   → Elimina credenciales almacenadas
 *
 * Tokens se almacenan en la colección DriveCredentials de MongoDB.
 * El access_token se renueva automáticamente con el refresh_token (ver driveService.js).
 */
import DriveCredentials from "../models/DriveCredentials.js";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

// En producción, detectamos automáticamente el host
const getRedirectUri = (req) => {
    if (process.env.NODE_ENV === "production") {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.headers['x-forwarded-host'] || req.get('host');
        return `${protocol}://${host}/api/drive/auth/callback`;
    }
    return "http://localhost:5173/api/drive/auth/callback";
};

/**
 * Genera la URL de autorización de Google Drive
 * Sin usar googleapis para evitar el bug "next is not a function"
 */
const generateAuthUrl = (clientId, req) => {
    const scopeParam = SCOPES.join(" ");
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(getRedirectUri(req))}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopeParam)}&` +
        `access_type=offline&` +
        `prompt=consent`;
};

/**
 * Intercambia el código de autorización por tokens usando fetch directo
 */
const exchangeCodeForTokens = async (code, req) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: getRedirectUri(req),
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Error exchanging code for tokens:", errorData);
        throw new Error(`Error intercambiando código: ${response.status}`);
    }

    const tokens = await response.json();

    if (!tokens.refresh_token) {
        throw new Error("No se obtuvo refresh_token. Intenta revocar el acceso y volver a autorizar.");
    }

    return tokens;
};

/**
 * Función interna para procesar el código de autorización
 */
const processAuthCode = async (code, req) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Faltan GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en el .env");
    }

    try {
        const tokens = await exchangeCodeForTokens(code, req);

        // Calcular fecha de expiración
        const expiryDate = new Date(Date.now() + (tokens.expires_in * 1000));

        // Eliminar credenciales anteriores
        await DriveCredentials.deleteMany({});

        // Guardar nuevas credenciales
        const credentials = new DriveCredentials({
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate
        });

        await credentials.save();

        console.log("✅ Credenciales de Drive guardadas en DB");

        return { success: true, expiryDate };
    } catch (error) {
        console.error("Error en processAuthCode:", error);
        throw error;
    }
};

/**
 * Genera HTML de respuesta para el callback que cierra la ventana
 */
const getCallbackHTML = (success, message) => {
    const safeMessage = message
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Drive - Autorización</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${success ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'};
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .icon {
            width: 80px;
            height: 80px;
            background: ${success ? '#4CAF50' : '#f44336'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            animation: pulse 2s infinite;
        }
        .icon svg { width: 50px; height: 50px; fill: white; }
        h1 { color: #333; font-size: 24px; margin-bottom: 10px; }
        p { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            ${success
                ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>'
                : '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
            }
        </div>
        <h1>${success ? '✅ Autorización Exitosa' : '❌ Error'}</h1>
        <p>${safeMessage}</p>
        <p style="color: #999; font-size: 14px;">
            <span class="spinner"></span>
            Esta ventana se cerrará automáticamente...
        </p>
    </div>
    <script>
        (function() {
            var success = ${success};
            var message = '${safeMessage}';

            // Guardar el estado en localStorage
            try {
                localStorage.setItem('driveAuthStatus', JSON.stringify({
                    success: success,
                    message: message,
                    timestamp: Date.now()
                }));

                // Disparar evento de storage
                window.dispatchEvent(new Event('storage'));

                // Intentar notificar a la ventana padre
                if (window.opener && !window.opener.closed) {
                    try {
                        window.opener.postMessage({
                            type: 'driveAuthCallback',
                            success: success,
                            message: message
                        }, '*');
                    } catch (e) {
                        console.log('No se pudo enviar mensaje a ventana padre:', e);
                    }
                }
            } catch (e) {
                console.error('Error guardando en localStorage:', e);
            }

            // Cerrar la ventana después de 2 segundos
            setTimeout(function() {
                window.close();
            }, 2000);

            // Fallback: redirect si no se puede cerrar
            setTimeout(function() {
                if (!window.closed) {
                    window.location.href = window.location.origin + '/#/admin';
                }
            }, 3500);
        })();
    <\/script>
</body>
</html>`;
};

/**
 * GET /api/drive/auth/url
 * Genera la URL de autorización de Google Drive
 */
export const getAuthUrl = async (req, res) => {
    try {
        const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            return res.status(400).json({
                success: false,
                message: "Faltan GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en el .env"
            });
        }

        const authUrl = generateAuthUrl(clientId, req);

        res.json({
            success: true,
            authUrl,
            redirectUri: getRedirectUri(req)
        });
    } catch (error) {
        console.error("Error generando URL de autorización:", error);
        res.status(500).json({
            success: false,
            message: "Error generando URL de autorización",
            error: error.message
        });
    }
};

/**
 * GET /api/drive/auth/callback
 * Procesa el código de autorización desde la URL (callback de Google)
 */
export const handleAuthCallbackGet = async (req, res) => {
    try {
        const { code, error, error_description } = req.query;

        // Si hay error en la URL
        if (error) {
            console.error("Error en callback de Google:", error, error_description);
            const message = error_description || error;
            return res.send(getCallbackHTML(false, `Autorización cancelada: ${message}`));
        }

        if (!code) {
            return res.send(getCallbackHTML(false, "No se recibió código de autorización"));
        }

        // Procesar el código
        await processAuthCode(code, req);

        // Mostrar página de éxito
        res.send(getCallbackHTML(true, "Google Drive conectado correctamente"));
    } catch (error) {
        console.error("Error procesando callback de autorización:", error);
        res.send(getCallbackHTML(false, error.message || "Error al procesar la autorización"));
    }
};

/**
 * POST /api/drive/auth/callback
 * Procesa el código de autorización y guarda los tokens en la DB
 */
export const handleAuthCallbackPost = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Falta el código de autorización"
            });
        }

        const result = await processAuthCode(code, req);

        res.json({
            success: true,
            message: "Autorización exitosa. Las credenciales han sido guardadas.",
            expiryDate: result.expiryDate
        });
    } catch (error) {
        console.error("Error procesando callback de autorización:", error);
        res.status(500).json({
            success: false,
            message: "Error procesando autorización",
            error: error.message
        });
    }
};

/**
 * GET /api/drive/auth/status
 * Verifica el estado de las credenciales
 */
export const getAuthStatus = async (req, res) => {
    try {
        const credentials = await DriveCredentials.findOne().sort({ updatedAt: -1 });

        if (!credentials) {
            return res.json({
                success: false,
                authenticated: false,
                message: "No hay credenciales guardadas"
            });
        }

        const isExpired = new Date() > credentials.expiryDate;

        res.json({
            success: true,
            authenticated: true,
            isExpired,
            expiryDate: credentials.expiryDate,
            createdAt: credentials.createdAt,
            updatedAt: credentials.updatedAt,
            message: isExpired ? "Las credenciales han expirado" : "Las credenciales son válidas"
        });
    } catch (error) {
        console.error("Error verificando estado de autenticación:", error);
        res.status(500).json({
            success: false,
            message: "Error verificando estado",
            error: error.message
        });
    }
};

/**
 * DELETE /api/drive/auth/revoke
 * Revoca las credenciales actuales
 */
export const revokeCredentials = async (req, res) => {
    try {
        await DriveCredentials.deleteMany({});
        console.log("✅ Credenciales de Drive revocadas");

        res.json({
            success: true,
            message: "Credenciales revocadas exitosamente"
        });
    } catch (error) {
        console.error("Error revocando credenciales:", error);
        res.status(500).json({
            success: false,
            message: "Error revocando credenciales",
            error: error.message
        });
    }
};