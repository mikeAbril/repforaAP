/**
 * driveService.js — Servicio de Google Drive (OAuth2)
 *
 * Maneja la autenticación con Google Drive via OAuth2 y la subida de archivos
 * siguiendo la estructura: PLANILLAS / [SUPERVISOR] / [AÑO] / [MES] / archivo.pdf
 *
 * Funciones exportadas:
 *  - getDriveClient()  → Retorna cliente autenticado de Google Drive
 *  - getRootFolderId()  → Obtiene el ID de la carpeta raíz configurada
 *  - uploadToDrive()    → Sube un archivo PDF a la estructura de carpetas
 *
 * Los tokens OAuth2 se guardan en la colección DriveCredentials de MongoDB.
 * El access_token se renueva automáticamente cuando expira.
 */
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import DriveCredentials from "../models/DriveCredentials.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const refreshAccessToken = async (refreshToken) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        console.error("Error refreshing access token:", errorData);
        throw new Error("No se pudo renovar el access token.");
    }

    return await response.json();
};

const getStoredCredentials = async () => {
    const credentials = await DriveCredentials.findOne().sort({ updatedAt: -1 });

    if (!credentials) {
        throw new Error("No hay credenciales de Google Drive guardadas.");
    }

    const now = new Date();
    if (now > credentials.expiryDate) {
        try {
            const newTokens = await refreshAccessToken(credentials.refreshToken);
            const expiryDate = new Date(Date.now() + (newTokens.expires_in * 1000));

            credentials.accessToken = newTokens.access_token;
            credentials.expiryDate = expiryDate;
            await credentials.save();

            console.log("✅ Access token renovado");

            return {
                accessToken: newTokens.access_token,
                refreshToken: credentials.refreshToken
            };
        } catch (error) {
            throw new Error("No se pudo renovar el access token. Re-autoriza.");
        }
    }

    return {
        accessToken: credentials.accessToken,
        refreshToken: credentials.refreshToken
    };
};

export const getDriveClient = async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("Faltan GOOGLE_OAUTH_CLIENT_ID y/o GOOGLE_OAUTH_CLIENT_SECRET en el .env");
    }

    const { accessToken, refreshToken } = await getStoredCredentials();

    // El redirectUri aquí es requerido por el constructor de OAuth2Client,
    // pero NO se usa en las llamadas API (upload, list, etc.)
    // Las redirecciones reales se manejan en driveAuthController.js con req dinámico
    const redirectUri = "http://localhost:3000/api/drive/auth/callback";

    const oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    oAuth2Client.credentials = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expiry_date: new Date(Date.now() + 3600000).getTime()
    };

    return google.drive({ version: "v3", auth: oAuth2Client });
};

const getOrCreatePlanillasFolder = async (drive, rootFolderId) => {
    try {
        const response = await drive.files.list({
            q: `name='PLANILLAS' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, name)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        if (response.data.files.length > 0) {
            console.log(`   📁 PLANILLAS encontrada`);
            return response.data.files[0].id;
        }

        console.log(`   🏗️  Creando PLANILLAS...`);
        const folder = await drive.files.create({
            requestBody: {
                name: "PLANILLAS",
                mimeType: "application/vnd.google-apps.folder",
                parents: [rootFolderId],
            },
            fields: "id",
            supportsAllDrives: true,
        });

        console.log(`   ✅ PLANILLAS creada`);
        return folder.data.id;
    } catch (error) {
        console.error("   ❌ Error PLANILLAS:", error.message);
        throw error;
    }
};

export const getRootFolderId = async (drive) => {
    const providedFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (providedFolderId) {
        try {
            await drive.files.get({
                fileId: providedFolderId,
                fields: "id",
                supportsAllDrives: true,
            });
            console.log(`   ✅ Raíz: ${providedFolderId}`);
            return providedFolderId;
        } catch (error) {
            console.log(`   ⚠️  Carpeta inválida, usando root`);
        }
    }

    return "root";
};

const findOrCreateFolder = async (drive, folderName, parentId) => {
    try {
        const response = await drive.files.list({
            q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, name)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        if (response.data.files.length > 0) {
            console.log(`   ✅ ${folderName} (existente)`);
            return response.data.files[0].id;
        }

        const folder = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [parentId],
            },
            fields: "id",
            supportsAllDrives: true,
        });

        console.log(`   ✅ ${folderName} (creada)`);
        return folder.data.id;
    } catch (error) {
        console.error(`   ❌ Error ${folderName}:`, error.message);
        throw error;
    }
};

const formatFileName = (fullName, documentType, documentNumber) => {
    if (!fullName) {
        return `${documentType}_${documentNumber}.pdf`.toLowerCase();
    }
    const parts = fullName.trim().toLowerCase().split(/\s+/);

    if (parts.length >= 4) {
        const [n1, n2, a1, a2] = parts;
        return `${a1}_${a2}_${n1}_${n2}.pdf`;
    } else if (parts.length === 3) {
        const [n1, a1, a2] = parts;
        return `${a1}_${a2}_${n1}.pdf`;
    } else if (parts.length === 2) {
        const [n1, a1] = parts;
        return `${a1}_${n1}.pdf`;
    }

    return `${parts.join("_")}.pdf`;
};

export const uploadToDrive = async (localFilePath, fullName, year, month, documentType, documentNumber, supervisorName = null) => {
    console.log(`\n   === SUBIDA A DRIVE ===`);
    console.log(`   Supervisor: ${supervisorName || 'NO DEFINIDO'}`);
    console.log(`   Año: ${year}, Mes: ${month}`);
    console.log(`   Instructor: ${fullName}`);

    if (!fs.existsSync(localFilePath)) {
        throw new Error(`Archivo no existe: ${localFilePath}`);
    }

    try {
        const drive = await getDriveClient();

        // 1. Raíz
        const rootFolderId = await getRootFolderId(drive);
        console.log(`   1️⃣ Raíz: ${rootFolderId}`);

        // 2. PLANILLAS
        const planillasFolderId = await getOrCreatePlanillasFolder(drive, rootFolderId);
        console.log(`   2️⃣ PLANILLAS: ${planillasFolderId}`);
        let currentFolderId = planillasFolderId;

        // 3. SUPERVISOR
        let supervisorFolderId = null;
        if (supervisorName) {
            const supervisorFolderName = supervisorName.toUpperCase().trim();
            console.log(`   3️⃣ Supervisor: ${supervisorFolderName}`);
            currentFolderId = await findOrCreateFolder(drive, supervisorFolderName, currentFolderId);
            supervisorFolderId = currentFolderId;
            console.log(`      ID: ${currentFolderId}`);
        } else {
            console.log(`   ⚠️  NO HAY SUPERVISOR - archivos irán directos a PLANILLAS`);
        }

        // 4. AÑO
        const yearFolderName = String(year);
        console.log(`   4️⃣ Año: ${yearFolderName}`);
        currentFolderId = await findOrCreateFolder(drive, yearFolderName, currentFolderId);

        // 5. MES
        const monthNames = {
            1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL",
            5: "MAYO", 6: "JUNIO", 7: "JULIO", 8: "AGOSTO",
            9: "SEPTIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
        };
        const monthFolderName = monthNames[month] || String(month).padStart(2, "0");
        console.log(`   5️⃣ Mes: ${monthFolderName}`);
        currentFolderId = await findOrCreateFolder(drive, monthFolderName, currentFolderId);

        // 6. Archivo
        const fileName = formatFileName(fullName, documentType, documentNumber);
        console.log(`   6️⃣ Archivo: ${fileName}`);
        console.log(`   📁 Carpeta final ID: ${currentFolderId}`);

        const fileMetadata = {
            name: fileName,
            parents: [currentFolderId],
        };

        const media = {
            mimeType: "application/pdf",
            body: fs.createReadStream(localFilePath),
        };

        const file = await drive.files.create({
            requestBody: fileMetadata,
            media,
            fields: "id, webViewLink",
            supportsAllDrives: true,
        });

        const driveFileId = file.data.id;
        const driveUrl = file.data.webViewLink;

        await drive.permissions.create({
            fileId: driveFileId,
            requestBody: {
                role: "reader",
                type: "anyone",
            },
        });

        console.log(`   ✅ SUBIDO: ${driveUrl}`);
        console.log(`   ======================\n`);

        return { driveFileId, driveUrl, supervisorFolderId };
    } catch (error) {
        console.error(`   ❌ DRIVE ERROR: ${error.message}`);
        throw error;
    }
};