import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!ROOT_FOLDER_ID) {
    console.error("⚠️  GOOGLE_DRIVE_FOLDER_ID no está definido en el .env");
}

/**
 * Crea un cliente autenticado de Google Drive vía OAuth2.
 * 
 * Requiere 2 variables en el .env:
 *   - GOOGLE_OAUTH_CLIENT_ID     → ID del cliente OAuth2
 *   - GOOGLE_OAUTH_CLIENT_SECRET → Secreto del cliente OAuth2
 *   - GOOGLE_OAUTH_REFRESH_TOKEN → Token de actualización (se genera con setupDriveAuth.js)
 *
 * El access_token se renueva automáticamente usando el refresh_token.
 * Una vez que la app esté publicada en Google Cloud, el refresh_token NO expira.
 * 
 * @returns {import('googleapis').drive_v3.Drive}
 */
export const getDriveClient = () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    if (!clientId || !clientSecret) {
        throw new Error(
            "Faltan GOOGLE_OAUTH_CLIENT_ID y/o GOOGLE_OAUTH_CLIENT_SECRET en el .env.\n" +
            "Obtenlos en: Google Cloud Console → APIs y Servicios → Credenciales → ID de cliente OAuth 2.0"
        );
    }

    if (!refreshToken) {
        throw new Error(
            "Falta GOOGLE_OAUTH_REFRESH_TOKEN en el .env.\n" +
            "Genera uno ejecutando: node utils/setupDriveAuth.js"
        );
    }

    const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, "http://localhost");

    // Configurar el refresh token — Google renueva el access_token automáticamente
    oAuth2Client.setCredentials({ refresh_token: refreshToken });

    return google.drive({ version: "v3", auth: oAuth2Client });
};

/**
 * Actualiza el archivo .env con un nuevo valor para una variable específica.
 */
const updateEnvFile = (key, value) => {
    try {
        const envPath = path.join(__dirname, "../.env");
        let envContent = fs.readFileSync(envPath, "utf-8");
        const regex = new RegExp(`^${key}=.*`, "m");

        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }

        fs.writeFileSync(envPath, envContent);
        process.env[key] = value; // Actualizar en memoria también
        console.log(`   📝 .env actualizado: ${key}=${value}`);
    } catch (error) {
        console.error("   ⚠️ No se pudo actualizar el archivo .env:", error.message);
    }
};

/**
 * Verifica si la carpeta raíz es válida. Si no, crea una nueva y actualiza el .env.
 */
export const validateAndGetRootId = async (drive) => {
    let rootId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Si no hay ID o si el ID actual no existe (404), creamos uno nuevo
    let needNewRoot = !rootId;

    if (rootId) {
        try {
            await drive.files.get({ fileId: rootId, fields: "id", supportsAllDrives: true });
        } catch (error) {
            if (error.code === 404 || (error.response && error.response.status === 404)) {
                console.log(`   ⚠️ La Carpeta Raíz (${rootId}) fue eliminada de Drive.`);
            } else {
                console.log(`   ⚠️ No se pudo acceder a la Carpeta Raíz (${rootId}):`, error.message);
            }
            needNewRoot = true;
        }
    }

    if (needNewRoot) {
        console.log("   🏗️  Creando nueva Carpeta Raíz Corporativa...");
        const res = await drive.files.create({
            requestBody: {
                name: "SISTEMA_AUTOMATIZACION_CERTIFICADOS",
                mimeType: "application/vnd.google-apps.folder",
            },
            fields: "id",
        });
        rootId = res.data.id;
        updateEnvFile("GOOGLE_DRIVE_FOLDER_ID", rootId);
        console.log(`   ✅ Nueva Raíz creada: ${rootId}`);
    }

    return rootId;
};

/**
 * Busca una carpeta por nombre dentro de un padre.
 * Si no existe, la crea.
 *
 * @param {import('googleapis').drive_v3.Drive} drive
 * @param {string} folderName - Nombre de la carpeta
 * @param {string} parentId - ID de la carpeta padre
 * @returns {Promise<string>} ID de la carpeta
 */
const findOrCreateFolder = async (drive, folderName, parentId) => {
    // Buscar si existe
    const response = await drive.files.list({
        q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });

    if (response.data.files.length > 0) {
        return response.data.files[0].id;
    }

    // Crear carpeta
    const folder = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id",
        supportsAllDrives: true,
    });

    console.log(`   📁 Carpeta "${folderName}" creada en Drive`);
    return folder.data.id;
};

/**
 * Genera el nombre del archivo para Drive: nombre_apellido.pdf
 * Ejemplo: "Yurley Tatiana Bernal Porras" → "bernal_porras_yurley_tatiana.pdf"
 *
 * @param {string} fullName - Nombre completo del contratista
 * @returns {string} Nombre formateado
 */
const formatFileName = (fullName, documentType, documentNumber) => {
    if (!fullName) {
        return `${documentType}_${documentNumber}.pdf`.toLowerCase();
    }
    const parts = fullName.trim().toLowerCase().split(/\s+/);

    if (parts.length >= 4) {
        // Asume: nombre1 nombre2 apellido1 apellido2
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


/**
 * Crea la jerarquía de carpetas para un supervisor.
 * Estructura: ROOT -> [NOMBRE SUPERVISOR] -> CERTIFICADOS DE PLANILLA
 *
 * @param {string} supervisorName - Nombre del supervisor
 * @returns {Promise<string>} ID de la carpeta "CERTIFICADOS DE PLANILLA"
 */
export const setupSupervisorFolder = async (supervisorName) => {
    const drive = getDriveClient();
    const activeRootId = await validateAndGetRootId(drive);

    // 1. Crear/Encontrar carpeta con el nombre del supervisor
    console.log(`   📂 Preparando espacio para supervisor: ${supervisorName}`);
    const supervisorRootId = await findOrCreateFolder(drive, supervisorName.toUpperCase(), activeRootId);

    // 2. Buscar/Crear carpeta "CERTIFICADOS DE PLANILLA" dentro de la carpeta del supervisor
    const shareableFolderName = "CERTIFICADOS DE PLANILLA";
    console.log(`   📂 Preparando carpeta de certificados: "${shareableFolderName}"`);

    const shareableFolderId = await findOrCreateFolder(drive, shareableFolderName, supervisorRootId);

    return shareableFolderId;
};

/**
 * Función auxiliar para verificar si una carpeta todavía existe en Drive.
 */
export const checkIfFolderExists = async (folderId) => {
    try {
        if (!folderId) return false;
        const drive = getDriveClient();
        await drive.files.get({ fileId: folderId, fields: "id", supportsAllDrives: true });
        return true;
    } catch (e) {
        return false;
    }
};

export const uploadToDrive = async (localFilePath, fullName, year, month, documentType, documentNumber, supervisorName = null) => {
    if (!fs.existsSync(localFilePath)) {
        throw new Error(`El archivo local no existe: ${localFilePath}`);
    }
    try {
        const drive = getDriveClient();
        const activeRootId = await validateAndGetRootId(drive);
        
        // 1. Determinar la carpeta del supervisor o usar la raíz
        let parentFolderId = activeRootId;

        if (supervisorName) {
            console.log(`   📂 Buscando/Creando carpeta para supervisor: ${supervisorName}`);
            parentFolderId = await findOrCreateFolder(drive, supervisorName.toUpperCase().trim(), activeRootId);
        }

        // 2. Crear/encontrar carpeta del Año
        console.log(`   ☁️  Subiendo a Drive: ${year}/${month}/...`);
        const yearFolderId = await findOrCreateFolder(drive, String(year), parentFolderId);

        // 3. Crear/encontrar carpeta del Mes dentro del Año
        const monthNames = {
            1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL",
            5: "MAYO", 6: "JUNIO", 7: "JULIO", 8: "AGOSTO",
            9: "SEPTIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
        };
        const monthFolderName = monthNames[month] || String(month).padStart(2, "0");
        const monthFolderId = await findOrCreateFolder(drive, monthFolderName, yearFolderId);

        // 4. Generar nombre del archivo
        const fileName = formatFileName(fullName, documentType, documentNumber);

        // 5. Subir el PDF
        const fileMetadata = {
            name: fileName,
            parents: [monthFolderId],
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

        console.log(`   ✅ Subido a Drive: ${supervisorName || "RAIZ"}/${year}/${monthFolderName}/${fileName}`);
        const shortUrl = (driveUrl || "").split("&")[0]; // Limpiar URL
        console.log(`   🔗 ${shortUrl}`);

        return { driveFileId, driveUrl };
    } catch (error) {
        console.error("   ❌ Error en Google Drive:");
        if (error.response && error.response.data) {
            console.error("   - Datos:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("   - Mensaje:", error.message);
        }
        throw error;
    }
};
