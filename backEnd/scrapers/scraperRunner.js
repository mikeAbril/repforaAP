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

import { uploadToDrive, setupSupervisorFolder, checkIfFolderExists } from "../services/driveService.js";
 
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
            const currentReport = await Report.findById(report._id);
            if (!currentReport || currentReport.status !== "pending") continue;

            currentReport.status = "processing";
            currentReport.attempts = (currentReport.attempts || 0) + 1;
            await currentReport.save();

            // Obtener datos del instructor
            const instructor = await Instructor.findById(report.instructorId);
            if (!instructor) {
                throw new Error(`Instructor ${report.instructorId} no encontrado`);
            }

            // Preparar datos para el scraper
            const reportData = {
                instructor: {
                    documentType: instructor.documentType,
                    documentNumber: instructor.documentNumber,
                    eps: report.eps,
                    fullName: instructor.fullName,
                    email: instructor.email,
                    documentIssueDate: instructor.documentIssueDate,
                },
                platformData: report.platformData,
            };

            // Ejecutar scraper
            const result = await scraperFn(reportData, DOWNLOADS_DIR);

            if (result.success) {
                report.status = "success";
                report.filePath = result.filePath;
                report.errorReason = null;
                console.log(`✅ Reporte ${report._id} — PDF descargado`);

                // Subir a Google Drive
                try {
                    // Calculamos el periodo de pago (mes vencido: mes consulta + 1)
                    const paymentMonth = (report.reportMonth % 12) + 1;
                    const paymentYear = paymentMonth === 1 ? report.reportYear + 1 : report.reportYear;

                    const finalMes = paymentMonth;
                    const finalAnio = paymentYear;

                    // Obtener el nombre del supervisor para la carpeta de Drive
                    let supervisorName = null;
                    if (report.supervisorId) {
                        const supervisor = await Supervisor.findById(report.supervisorId);
                        if (supervisor) {
                            supervisorName = supervisor.name;
                        }
                    }

                    const driveResult = await uploadToDrive(
                        result.filePath,
                        instructor.fullName,
                        finalAnio,
                        finalMes,
                        instructor.documentType,
                        instructor.documentNumber,
                        supervisorName
                    );

                    report.driveFileId = driveResult.driveFileId;
                    report.driveUrl = driveResult.driveUrl;
                    report.status = "downloaded";
                    console.log(`☁️  Reporte ${report._id} — subido a Drive`);

                    // Eliminar PDF local después de subir
                    fs.unlinkSync(result.filePath);
                } catch (driveError) {
                    // Si falla Drive, el PDF local sigue disponible
                    console.error(`⚠️  Drive falló para ${report._id}: ${driveError.message}`);
                    // Status queda en 'success' con filePath local
                }
            } else {
                // Lógica de re-intento inteligente (Máximo 3 intentos)
                if (report.attempts < 3) {
                    report.status = "pending";
                    report.errorReason = `Reintento ${report.attempts}/3: ${result.error}`;
                    console.log(`🔄 Reporte ${report._id} falló (${report.attempts}/3). Volviendo a pending...`);
                } else {
                    report.status = "error";
                    report.errorReason = `Máximo de intentos alcanzado (3/3): ${result.error}`;
                    console.log(`❌ Reporte ${report._id} falló definitivamente tras 3 intentos.`);
                }
            }

            await report.save();
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
            await report.save();
        }
    }
};

/**
 * Busca reportes que quedaron en 'processing' por más de 15 minutos
 * (probablemente por un crash del servidor) y los vuelve a 'pending'.
 */
const recoverStuckReports = async () => {
    const timeoutDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos atrás

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
    } finally {
        isRunnerRunning = false;
    }
};

/**
 * Inicia el cron job para ejecutar el scraper diariamente a las 2:00 AM.
 */
export const startScraperCron = () => {
    // Todos los días a las 2:00 AM
    cron.schedule("18  20 * * *", async () => {
        try {
            await runScraperCycle();
        } catch (error) {
            console.error("🔴 Error en el ciclo de scraping:", error.message);
        }
    });

    console.log("🤖 Scraper cron iniciado — programado para las 2:00 AM diaria");
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
