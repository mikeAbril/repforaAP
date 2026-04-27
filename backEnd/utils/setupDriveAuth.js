import "dotenv/config";
import { google } from "googleapis";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REDIRECT_PORT = 3001;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    console.error(
        "❌ Faltan GOOGLE_OAUTH_CLIENT_ID y/o GOOGLE_OAUTH_CLIENT_SECRET en el .env.\n" +
        "   Obtenlos en: Google Cloud Console → APIs y Servicios → Credenciales → ID de cliente OAuth 2.0"
    );
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
});

console.log("\n🔧 Configuración de Google Drive OAuth2\n");
console.log("🔗 Abre esta URL en tu navegador:");
console.log(`\n   ${authUrl}\n`);
console.log("⏳ Esperando autorización...\n");

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, REDIRECT_URI);
        const code = url.searchParams.get("code");

        if (!code) {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h1>❌ No se recibió código de autorización.</h1>");
            server.close();
            process.exit(1);
        }

        const { tokens } = await oAuth2Client.getToken(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
            res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h1>❌ No se obtuvo refresh token. Intenta revocar el acceso y repetir.</h1>");
            server.close();
            process.exit(1);
        }

        updateEnvFile("GOOGLE_OAUTH_REFRESH_TOKEN", refreshToken);

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<h1>✅ Autorización exitosa. Puedes cerrar esta pestaña.</h1>");

        console.log("✅ Autorización exitosa.");
        console.log(`📝 Refresh token guardado en .env`);
        console.log(`   GOOGLE_OAUTH_REFRESH_TOKEN=${refreshToken.substring(0, 20)}...\n`);

        server.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h1>❌ Error: ${error.message}</h1>`);
        server.close();
        process.exit(1);
    }
});

server.listen(REDIRECT_PORT, () => {
    console.log(`🌐 Servidor temporal escuchando en ${REDIRECT_URI}\n`);
});

const updateEnvFile = (key, value) => {
    const envPath = path.join(__dirname, "../.env");
    let envContent = fs.readFileSync(envPath, "utf-8");
    const regex = new RegExp(`^${key}=.*`, "m");

    if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
        envContent += `\n${key}=${value}`;
    }

    fs.writeFileSync(envPath, envContent);
};
