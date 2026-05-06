import { validationResult } from "express-validator";
import Instructor from "../models/Instructor.js";
import Report from "../models/Report.js";
import { validatePlatformData } from "../validations/platform.validation.js";

/**
 * GET /api/instructors/lookup?documentType=CC&documentNumber=123456
 * Busca un instructor por tipo y numero de documento.
 * Usado por el frontend para autocompletar el formulario.
 */
export const lookupInstructor = async (req, res, next) => {
    try {
        const { documentType, documentNumber } = req.query;

        if (!documentType || !documentNumber) {
            return res.status(400).json({
                success: false,
                message: "documentType y documentNumber son obligatorios",
            });
        }

        const instructor = await Instructor.findOne({ documentType, documentNumber }).select("-__v -createdAt -updatedAt");

        if (!instructor) {
            return res.json({ success: true, found: false });
        }

        res.json({
            success: true,
            found: true,
            instructor,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/reports
 * Endpoint público: recibe datos del formulario del contratista,
 * busca o crea el Instructor, y crea un Report con status: pending.
 */
export const submitReport = async (req, res, next) => {
    try {
        // 1. Verificar errores de validación de campos comunes
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        const { documentType, documentNumber, fullName, eps, email, documentIssueDate, platform, platformData, supervisorId } = req.body;

        // 2. Validar campos específicos de la plataforma
        const platformValidation = validatePlatformData(platform, platformData);
        if (!platformValidation.valid) {
            return res.status(400).json({
                success: false,
                message: platformValidation.message,
                missingFields: platformValidation.missing,
            });
        }

        // 3. Buscar o crear el Instructor (upsert por documentType + documentNumber)
        const instructor = await Instructor.findOneAndUpdate(
            { documentType, documentNumber },
            { fullName, email, documentIssueDate, supervisorId },
            { upsert: true, returnDocument: 'after', runValidators: true }
        );

        // 4. Calcular el periodo del reporte (mes vencido mes subido)
        let mesConsulta, anioConsulta;

        if (platform === 'aportes_en_linea') {
            mesConsulta = parseInt(platformData.mes || platformData.mesFin);
            anioConsulta = parseInt(platformData.anio || platformData.anioFin);
        } else {
            mesConsulta = parseInt(platformData.mes);
            anioConsulta = parseInt(platformData.anio);
        }

        const reportMonth = mesConsulta;
        const reportYear = anioConsulta;

        console.log(`📌 Automatización: Consulta ${mesConsulta}/${anioConsulta} -> Reporte ${reportMonth}/${reportYear}`);

        // 5. Crear el Report con status: pending
        const report = await Report.create({
            instructorId: instructor._id,
            supervisorId,
            platform,
            platformData,
            eps,
            reportMonth,
            reportYear,
            status: "pending",
        });

        // 5. Responder con confirmación
        res.status(201).json({
            success: true,
            message: "Reporte creado correctamente. Estado: pendiente.",
            report: {
                id: report._id,
                platform: report.platform,
                status: report.status,
                createdAt: report.createdAt,
            },
        });
    } catch (error) {
        next(error);
    }
};
