/**
 * scraperRunner.js — Motor principal del scraping automático
 *
 * Ejecuta un cron job diario que procesa reportes pendientes de cada plataforma.
 * Los reportes se procesan UNO POR UNO, priorizando nuevos (0 intentos) sobre reintentos.
 * Máximo 3 intentos por reporte antes de marcarlo como "error".
 *
 * Flujo por reporte:
 *  1. Obtener instructor y supervisor del reporte
 *  2. Ejecutar el scraper de la plataforma correspondiente
 *  3. Si exitoso: subir PDF a Google Drive (estructura SUPERVISOR/AÑO/MES)
 *  4. Actualizar driveFolderUrl del supervisor con la carpeta real
 *  5. Enviar correo de notificación al instructor
 *  6. Al final del ciclo, enviar resumen por correo a cada supervisor
 *
 * Funciones exportadas:
 *  - startScraperCron() → Inicia el cron job
 *  - setCronStatus()    → Habilita/deshabilita el cron manualmente
 *  - isCronActive()     → Consulta si el cron está habilitado
 */
import "dotenv/config";
import cron from "node-cron";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Report from "../models/Report.js";
import Instructor from "../models/Instructor.js";
import Supervisor from "../models/Supervisor.js";
import { scrapeSoi } from "./soiScraper.js";
import { scrapeAportesEnLinea } from "./aportesEnLineaScraper.js";
import { scrapeAsopagos } from "./asopagosScraper.js";
import { scrapeMiPlanilla } from "./miPlanillaScraper.js";

import { uploadToDrive } from "../services/driveService.js";
import { decrypt } from "../utils/crypto.js";
import { sendEmail } from "../utils/nodemailer.js";

const platformLabels = { soi: 'SOI', asopagos: 'ASOPAGOS', mi_planilla: 'COMPENSAR (Mi Planilla)', aportes_en_linea: 'APORTES EN LÍNEA' };

let isRunnerRunning = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio donde se guardan los PDFs descargados
const DOWNLOADS_DIR = path.join(__dirname, "..", "downloads");

// Mapeo de plataformas a sus funciones scraper
const SCRAPER_MAP = {
    soi: scrapeSoi,
    aportes_en_linea: scrapeAportesEnLinea,
    asopagos: scrapeAsopagos,
    mi_planilla: scrapeMiPlanilla,
};

const CRON_STATUS_FILE = path.join(__dirname, "..", "config", "cron-status.json");

/**
 * Obtiene el estado del cron desde el archivo de configuración.
 */
const getCronStatus = () => {
    try {
        if (!fs.existsSync(CRON_STATUS_FILE)) return true; // Habilitado por defecto
        const data = fs.readFileSync(CRON_STATUS_FILE, "utf8");
        return JSON.parse(data).enabled;
    } catch (error) {
        return true;
    }
};

/**
 * Guarda el estado del cron en el archivo de configuración.
 */
export const setCronStatus = (enabled) => {
    const configDir = path.dirname(CRON_STATUS_FILE);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(CRON_STATUS_FILE, JSON.stringify({ enabled }), "utf8");
};

/**
 * Asegura que el directorio de descargas exista.
 */
const ensureDownloadsDir = () => {
    if (!fs.existsSync(DOWNLOADS_DIR)) {
        fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
        console.log(`📁 Directorio de descargas creado: ${DOWNLOADS_DIR}`);
    }
};

/**
 * Procesa todos los reportes pending de una plataforma específica.
 * Los procesa UNO POR UNO en orden de llegada (createdAt ascendente).
 * Prioriza los que tienen 0 intentos (nuevos) antes que los reintentos.
 *
 * @param {string} platform - Plataforma a procesar (ej: "soi")
 */
const processPendingReports = async (platform) => {
    const scraperFn = SCRAPER_MAP[platform];
    if (!scraperFn) {
        console.log(`⚠️  No hay scraper implementado para: ${platform}`);
        return;
    }

    // Buscar reportes pending. 
    // Ordenamos por attempts (0 primero) y luego por fecha (más viejos primero).
    const pendingReports = await Report.find({
        status: "pending",
        platform,
    }).sort({ attempts: 1, createdAt: 1 });

    if (pendingReports.length === 0) {
        return;
    }

    console.log(`\n📋 ${pendingReports.length} reporte(s) pending para ${platform}`);

    for (const report of pendingReports) {
        try {
            // 1. Obtener una versión fresca del reporte y marcar como processing
            const current = await Report.findById(report._id);
            if (!current || current.status !== "pending") continue;

            current.status = "processing";
            current.attempts = (current.attempts || 0) + 1;
            await current.save();

            // Obtener datos del instructor
            const instructor = await Instructor.findById(current.instructorId);
            if (!instructor) {
                throw new Error(`Instructor ${current.instructorId} no encontrado`);
            }

            // Obtener el supervisor para su API Key de 2Captcha
            let decryptedApiKey = null;
            let supervisorName = null;
            let supervisorEmail = null;

            console.log(`   📋 Reporte ${current._id} - supervisorId: ${current.supervisorId || 'NO DEFINIDO'}`);

            if (current.supervisorId) {
                const supervisor = await Supervisor.findById(current.supervisorId);
                if (supervisor) {
                    supervisorName = supervisor.name;
                    supervisorEmail = supervisor.email;
                    console.log(`   👤 Supervisor encontrado: ${supervisorName}`);
                    if (supervisor.apiKey) {
                        decryptedApiKey = decrypt(supervisor.apiKey);
                    }
                } else {
                    console.log(`   ⚠️  Supervisor con ID ${current.supervisorId} no encontrado en DB`);
                }
            } else {
                console.log(`   ⚠️  El reporte no tiene supervisorId asignado`);
            }

            // Preparar datos para el scraper
            const reportData = {
                instructor: {
                    documentType: instructor.documentType,
                    documentNumber: instructor.documentNumber,
                    eps: current.eps,
                    fullName: instructor.fullName,
                    email: instructor.email,
                    documentIssueDate: instructor.documentIssueDate,
                    apiKey: decryptedApiKey,
                },
                platformData: current.platformData,
            };

            const isLastAttempt = (current.attempts >= 3);

            // Ejecutar scraper
            const result = await scraperFn(reportData, DOWNLOADS_DIR, isLastAttempt);

            if (result.success) {
                current.status = "success";
                current.filePath = result.filePath;
                current.errorReason = null;
                
                // Borrar captura de error anterior si existe
                if (current.errorScreenshot) {
                    const oldPath = path.join(DOWNLOADS_DIR, "..", current.errorScreenshot);
                    if (fs.existsSync(oldPath)) {
                        try {
                            fs.unlinkSync(oldPath);
                        } catch (e) {
                            console.error(`⚠️ No se pudo borrar la captura de error vieja: ${e.message}`);
                        }
                    }
                    current.errorScreenshot = null;
                }
                console.log(`✅ Reporte ${current._id} — PDF descargado`);

                // Subir a Google Drive
                try {
                    const paymentMonth = (current.reportMonth % 12) + 1;
                    const paymentYear = paymentMonth === 1 ? current.reportYear + 1 : current.reportYear;

                    const driveResult = await uploadToDrive(
                        result.filePath,
                        instructor.fullName,
                        paymentYear,
                        paymentMonth,
                        instructor.documentType,
                        instructor.documentNumber,
                        supervisorName
                    );

                    current.driveFileId = driveResult.driveFileId;
                    current.driveUrl = driveResult.driveUrl;
                    current.status = "downloaded";
                    console.log(`☁️  Reporte ${current._id} — subido a Drive`);

                    // Actualizar el link de la carpeta del supervisor en Drive
                    if (driveResult.supervisorFolderId && current.supervisorId) {
                        const newFolderUrl = `https://drive.google.com/drive/folders/${driveResult.supervisorFolderId}`;
                        await Supervisor.findByIdAndUpdate(current.supervisorId, { driveFolderUrl: newFolderUrl });
                        console.log(`   📂 Carpeta del supervisor actualizada: ${newFolderUrl}`);
                    }

                    // Correo #2: Notificar al instructor que su certificado está listo
                    if (instructor.email && driveResult.driveUrl) {
                        const driveLink = driveResult.driveUrl.split("&")[0];
                        sendEmail(
                            instructor.email,
                            `Certificado listo - ${platformLabels[platform] || platform}`,
                            `
                                <p style="font-size: 16px;">Hola, <strong>${instructor.fullName}</strong></p>
                                <p>Su certificado de seguridad social ha sido generado exitosamente y ya está disponible para descarga.</p>
                                <div style="background-color: #f0fdf4; border-left: 4px solid #318335; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0;"><strong>Plataforma:</strong> ${platformLabels[platform] || platform}</p>
                                    <p style="margin: 0;"><strong>Periodo:</strong> ${current.reportMonth}/${current.reportYear}</p>
                                </div>
                                <p>Puede descargar su certificado haciendo clic en el siguiente enlace:</p>
                                <p><a href="${driveLink}" style="background-color: #318335; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Descargar Certificado</a></p>
                            `
                        ).catch(() => { });
                    }

                    fs.unlinkSync(result.filePath);
                } catch (driveError) {
                    console.error(`⚠️  Drive falló para ${current._id}: ${driveError.message}`);
                }
            } else {
                // Correo #4: Alertar al supervisor si el error es de API Key
                if (supervisorEmail && (/(api key|2captcha|captcha)/i.test(result.error || ''))) {
                    sendEmail(
                        supervisorEmail,
                        'Alerta: Problema con la API Key de 2Captcha',
                        `
                            <p style="font-size: 16px;">Hola, <strong>${supervisorName}</strong></p>
                            <p>Se detectó un problema con su <strong>API Key de 2Captcha</strong> durante el procesamiento automático de certificados.</p>
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                <p style="margin: 0; color: #991b1b;"><strong>Error:</strong> ${result.error}</p>
                                <p style="margin: 0; color: #991b1b;"><strong>Instructor:</strong> ${instructor.fullName}</p>
                                <p style="margin: 0; color: #991b1b;"><strong>Plataforma:</strong> ${platformLabels[platform] || platform}</p>
                            </div>
                            <p>Posibles causas:</p>
                            <ul>
                                <li>Saldo insuficiente en su cuenta de 2Captcha</li>
                                <li>La API Key es incorrecta o expiró</li>
                                <li>Problemas temporales con el servicio de 2Captcha</li>
                            </ul>
                            <p>Por favor revise su API Key o actualícela directamente desde la plataforma.</p>
                        `
                    ).catch(() => { });
                }

                if (current.attempts < 3) {
                    current.status = "pending";
                    current.errorReason = `Reintento ${current.attempts}/3: ${result.error}`;
                    current.errorScreenshot = null;
                    console.log(`🔄 Reporte ${current._id} falló (${current.attempts}/3). Volviendo a pending...`);
                } else {
                    current.status = "error";
                    current.errorReason = `Máximo de intentos alcanzado (3/3): ${result.error}`;
                    current.errorScreenshot = result.errorScreenshot || null;
                    console.log(`❌ Reporte ${current._id} falló definitivamente tras 3 intentos.`);
                }
            }

            await current.save();
        } catch (error) {
            // Error no detiene los demás reportes
            if (report.attempts < 3) {
                report.status = "pending";
                report.errorReason = `Crash reintento ${report.attempts}/3: ${error.message}`;
                console.log(`🔄 Reporte ${report._id} crasheó (${report.attempts}/3). Reintentando...`);
            } else {
                report.status = "error";
                report.errorReason = `Crash definitivo (3/3): ${error.message}`;
                console.log(`❌ Reporte ${report._id} crasheó definitivamente.`);
            }
            await report.save().catch(e => console.error(`⚠️  No se pudo actualizar estado del reporte ${report._id}:`, e.message));
        }
    }
};

/**
 * Busca reportes que quedaron en 'processing' por más de 5 minutos
 * (probablemente por un crash del servidor) y los vuelve a 'pending'.
 */
const recoverStuckReports = async () => {
    const timeoutDate = new Date(Date.now() - 5 * 60 * 1000);

    const stuckReports = await Report.find({
        status: "processing",
        updatedAt: { $lt: timeoutDate }
    });

    for (const report of stuckReports) {
        if (report.attempts < 3) {
            report.status = "pending";
            report.errorReason = `Recuperado de bloqueo (Intento ${report.attempts}/3)`;
            console.log(`🔄 Recuperando reporte bloqueado ${report._id}...`);
        } else {
            report.status = "error";
            report.errorReason = "Bloqueo persistente: El servidor falló repetidamente procesando este reporte.";
            console.log(`❌ Marcando reporte bloqueado ${report._id} como error (Máximos intentos).`);
        }
        await report.save();
    }

    if (stuckReports.length > 0) {
        console.log(`\n🔄 Se recuperaron ${stuckReports.length} reporte(s) que estaban bloqueados en 'processing'.`);
    }
};

/**
 * Ciclo principal: procesa todas las plataformas que tengan scraper implementado.
 */
const runScraperCycle = async () => {
    if (isRunnerRunning) {
        console.log("⚠️  Ya hay un ciclo de scraping en ejecución. Saltando...");
        return;
    }

    if (!getCronStatus()) {
        console.log("⏸️  El cron está deshabilitado manualmente. Saltando ciclo...");
        return;
    }

    isRunnerRunning = true;

    const cycleStartTime = new Date();

    try {
        console.log(`\n⏰ [${new Date().toLocaleTimeString()}] Iniciando ciclo de scraping...`);

        ensureDownloadsDir();

        // 1. Limpiar reportes estancados primero
        await recoverStuckReports();

        // 2. Limpiar imágenes temporales viejas (> 30 min) para mantener orden
        const files = fs.readdirSync(DOWNLOADS_DIR);
        const now = Date.now();
        files.forEach(file => {
            if (file.endsWith(".png") || file.endsWith(".jpg")) {
                const filePath = path.join(DOWNLOADS_DIR, file);
                const stats = fs.statSync(filePath);
                if (now - stats.mtime.getTime() > 30 * 60 * 1000) {
                    fs.unlinkSync(filePath);
                }
            }
        });

        // 3. Procesar pendientes de cada plataforma
        for (const platform of Object.keys(SCRAPER_MAP)) {
            await processPendingReports(platform);
        }

        console.log(`✔️  Ciclo completado.\n`);

        // 4. Correo #3: Enviar resumen del ciclo a los supervisores con reportes procesados
        const processedReports = await Report.find({
            updatedAt: { $gte: cycleStartTime },
            status: { $in: ["downloaded", "error"] }
        });

        if (processedReports.length > 0) {
            const supervisorIds = [...new Set(processedReports.map(r => r.supervisorId).filter(Boolean))];
            const downloaded = processedReports.filter(r => r.status === "downloaded").length;
            const errored = processedReports.filter(r => r.status === "error").length;

            for (const supId of supervisorIds) {
                const supervisor = await Supervisor.findById(supId);
                if (!supervisor || !supervisor.email) continue;

                const supReports = processedReports.filter(r => String(r.supervisorId) === String(supId));
                const supDownloaded = supReports.filter(r => r.status === "downloaded").length;
                const supErrored = supReports.filter(r => r.status === "error").length;

                sendEmail(
                    supervisor.email,
                    `Resumen del ciclo de scraping automático`,
                    `
                        <p style="font-size: 16px;">Hola, <strong>${supervisor.name}</strong></p>
                        <p>El ciclo de scraping automático ha finalizado. A continuación el resumen de los reportes asociados a usted:</p>
                        <div style="background-color: #f0fdf4; border-left: 4px solid #318335; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                            <p style="margin: 0; font-size: 18px;"><strong>${supReports.length}</strong> reporte(s) procesado(s)</p>
                            <p style="margin: 8px 0 0; color: #318335;">✅ Completados: <strong>${supDownloaded}</strong></p>
                            <p style="margin: 4px 0 0; color: #dc2626;">❌ Con error: <strong>${supErrored}</strong></p>
                        </div>
                        ${supErrored > 0 ? '<p style="color: #6b7280; font-size: 14px;">Los reportes con error fueron reiniciados para un nuevo intento en el próximo ciclo. Puede revisarlos desde la plataforma.</p>' : ''}
                        <p style="color: #6b7280; font-size: 14px;">Resumen global del ciclo: ${downloaded} completados, ${errored} con error.</p>
                    `
                ).catch(() => { });
            }
        }
    } finally {
        isRunnerRunning = false;
    }
};

/**
 * Inicia el cron job para ejecutar el scraper diariamente.
 */
export const startScraperCron = () => {
    cron.schedule("0 2 * * *", async () => {
        try {
            await runScraperCycle();
        } catch (error) {
            console.error("🔴 Error en el ciclo de scraping:", error.message);
        }
    });

    console.log("🤖 Scraper cron iniciado — programado para las 2 AM diaria");
};

/**
 * Exportamos el estado actual para los endpoints
 */
export const isCronActive = getCronStatus;


/**
 * Modo standalone: ejecutar manualmente con `npm run scraper`.
 * Conecta a MongoDB, ejecuta un ciclo, y se desconecta.
 */
const isStandalone = process.argv[1] && process.argv[1].includes("scraperRunner");

if (isStandalone) {
    const runStandalone = async () => {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            console.log("🟢 Conectado a MongoDB (modo standalone)");

            await runScraperCycle();
        } catch (error) {
            console.error("🔴 Error:", error.message);
        } finally {
            await mongoose.disconnect();
            console.log("🔌 Desconectado de MongoDB");
        }
    };

    runStandalone();
}
