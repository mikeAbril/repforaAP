import Report from "../models/Report.js";
import Instructor from "../models/Instructor.js";

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
            filter.status = status;
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
                .populate("instructorId", "documentType documentNumber fullName eps email documentIssueDate")
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
