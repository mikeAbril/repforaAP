import Report from "../models/Report.js";
import Instructor from "../models/Instructor.js";
import Supervisor from "../models/Supervisor.js";
import { scrapeSoi } from "../scrapers/soiScraper.js";
import { scrapeAportesEnLinea } from "../scrapers/aportesEnLineaScraper.js";
import { scrapeAsopagos } from "../scrapers/asopagosScraper.js";
import { scrapeMiPlanilla } from "../scrapers/miPlanillaScraper.js";
import { uploadToDrive } from "../services/driveService.js";
import { decrypt } from "../utils/crypto.js";
import path from "path";

const SCRAPER_MAP = {
    soi: scrapeSoi,
    aportes_en_linea: scrapeAportesEnLinea,
    asopagos: scrapeAsopagos,
    mi_planilla: scrapeMiPlanilla,
};

/**
 * GET /api/dashboard/reports
 * Lista reportes con filtros opcionales. Solo lectura.
 * Requiere authMiddleware (JWT del supervisor).
 *
 * Query params:
 *  - status: "pending" | "processing" | "success" | "error" | "downloaded"
 *  - platform: "soi" | "aportes_en_linea" | "asopagos" | "mi_planilla"
 *  - month: número del mes (1-12)
 *  - year: año (ej: 2026)
 *  - page: número de página (default: 1)
 *  - limit: resultados por página (default: 20, max: 100)
 */
export const getReports = async (req, res, next) => {
    try {
        const {
            status,
            platform,
            month,
            year,
            search, // Nuevo parámetro de búsqueda
            page = 1,
            limit = 20,
        } = req.query;

        // Construir filtro dinámico
        const filter = {
            supervisorId: req.supervisor.id
        };

        if (status) {
            if (status === 'success') {
                filter.status = { $in: ['success', 'downloaded'] };
            } else {
                filter.status = status;
            }
        }

        if (platform) {
            filter.platform = platform;
        }

        // Búsqueda por contratista (nombre o documento)
        if (search) {
            const searchRegex = new RegExp(search, "i");
            const matchingInstructors = await Instructor.find({
                $or: [
                    { fullName: searchRegex },
                    { documentNumber: searchRegex }
                ]
            }).select("_id");
            
            const instructorIds = matchingInstructors.map(c => c._id);
            filter.instructorId = { $in: instructorIds };
        }

        // Filtrar por mes/año usando createdAt
        if (year) {
            const y = parseInt(year);
            const m = month ? parseInt(month) : null;

            if (m) {
                // Mes específico
                const startDate = new Date(y, m - 1, 1);
                const endDate = new Date(y, m, 1);
                filter.createdAt = { $gte: startDate, $lt: endDate };
            } else {
                // Año completo
                const startDate = new Date(y, 0, 1);
                const endDate = new Date(y + 1, 0, 1);
                filter.createdAt = { $gte: startDate, $lt: endDate };
            }
        }

        // Paginación
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Consultar reportes con datos del contratista
        const [reports, total] = await Promise.all([
            Report.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate("instructorId", "documentType documentNumber fullName email documentIssueDate")
                .lean(),
            Report.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: reports,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/dashboard/reports/:id
 * Elimina un reporte solo si no está completado (status distinto de success/downloaded).
 */
export const deleteReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({ success: false, message: "Reporte no encontrado" });
        }

        if (report.status === "success" || report.status === "downloaded") {
            return res.status(400).json({ success: false, message: "No se puede eliminar un reporte completado" });
        }

        if (report.supervisorId.toString() !== req.supervisor.id) {
            return res.status(403).json({ success: false, message: "Sin permisos para eliminar este reporte" });
        }

        await Report.findByIdAndDelete(id);
        res.json({ success: true, message: "Reporte eliminado correctamente" });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/dashboard/stats
 * Resumen rápido de conteos por status.
 * Requiere authMiddleware.
 */
export const getStats = async (req, res, next) => {
    try {
        const filter = { supervisorId: req.supervisor.id };
        const [pending, processing, success, downloaded, error, total] = await Promise.all([
            Report.countDocuments({ ...filter, status: "pending" }),
            Report.countDocuments({ ...filter, status: "processing" }),
            Report.countDocuments({ ...filter, status: "success" }),
            Report.countDocuments({ ...filter, status: "downloaded" }),
            Report.countDocuments({ ...filter, status: "error" }),
            Report.countDocuments(filter),
        ]);

        res.json({
            success: true,
            stats: { pending, processing, success, downloaded, error, total },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/dashboard/reports/:id/run
 * Ejecuta manualmente el scraper para un reporte específico.
 * Solo para reportes en estado "pending" o "error".
 * Requiere authMiddleware.
 */
export const runReport = async (req, res, next) => {
    try {
        const { id } = req.params;

        const report = await Report.findById(id);
        if (!report) {
            return res.status(404).json({ success: false, message: "Reporte no encontrado" });
        }

        if (report.supervisorId.toString() !== req.supervisor.id) {
            return res.status(403).json({ success: false, message: "Sin permisos para ejecutar este reporte" });
        }

        if (report.status === "processing") {
            return res.status(400).json({ success: false, message: "El reporte ya está siendo procesado" });
        }

        if (report.status === "success" || report.status === "downloaded") {
            return res.status(400).json({ success: false, message: "El reporte ya está completado" });
        }

        const scraperFn = SCRAPER_MAP[report.platform];
        if (!scraperFn) {
            return res.status(400).json({ success: false, message: "No hay scraper implementado para esta plataforma" });
        }

        // Marcar como processing
        report.status = "processing";
        report.attempts = (report.attempts || 0) + 1;
        await report.save();

        // Ejecutar scraper de forma asíncrona (no bloquear la respuesta)
        executeScraperAsync(report, scraperFn);

        res.json({
            success: true,
            message: "Ejecutando scraper en segundo plano. Consulte el estado en unos minutos.",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Función auxiliar para ejecutar el scraper de forma asíncrona
 */
const executeScraperAsync = async (report, scraperFn) => {
    const DOWNLOADS_DIR = path.join(process.cwd(), "downloads");

    try {
        const instructor = await Instructor.findById(report.instructorId);
        if (!instructor) {
            report.status = "error";
            report.errorReason = "Instructor no encontrado";
            await report.save();
            return;
        }

        let decryptedApiKey = null;
        if (report.supervisorId) {
            const supervisor = await Supervisor.findById(report.supervisorId);
            if (supervisor && supervisor.apiKey) {
                decryptedApiKey = decrypt(supervisor.apiKey);
            }
        }

        const reportData = {
            instructor: {
                documentType: instructor.documentType,
                documentNumber: instructor.documentNumber,
                eps: report.eps,
                fullName: instructor.fullName,
                email: instructor.email,
                documentIssueDate: instructor.documentIssueDate,
                apiKey: decryptedApiKey,
            },
            platformData: report.platformData,
        };

        const result = await scraperFn(reportData, DOWNLOADS_DIR);

        if (result.success) {
            report.status = "success";
            report.filePath = result.filePath;
            report.errorReason = null;

            // Subir a Drive
            try {
                const paymentMonth = (report.reportMonth % 12) + 1;
                const paymentYear = paymentMonth === 1 ? report.reportYear + 1 : report.reportYear;

                const driveResult = await uploadToDrive(
                    result.filePath,
                    instructor.fullName,
                    paymentYear,
                    paymentMonth,
                    instructor.documentType,
                    instructor.documentNumber,
                    null
                );

                report.driveFileId = driveResult.driveFileId;
                report.driveUrl = driveResult.driveUrl;
                report.status = "downloaded";
            } catch (driveError) {
                console.error(`Drive falló para ${report._id}: ${driveError.message}`);
            }
        } else {
            report.status = "error";
            report.errorReason = result.error || "Error desconocido en el scraper";
        }

        await report.save();
    } catch (error) {
        report.status = "error";
        report.errorReason = `Error: ${error.message}`;
        await report.save();
    }
};
