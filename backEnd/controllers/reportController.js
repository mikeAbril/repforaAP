/**
 * reportController.js — API pública de reportes (sin autenticación)
 *
 * Endpoints:
 *  GET  /api/reports/instructors/lookup → Busca instructor por tipo y número de documento
 *  POST /api/reports                    → Crea un reporte nuevo con status "pending"
 *
 * Flujo de submitReport:
 *  1. Valida campos comunes (express-validator) y específicos de plataforma
 *  2. Busca o crea el Instructor (upsert por documentType + documentNumber)
 *  3. Calcula el periodo del reporte
 *  4. Crea el Report con status "pending" y el supervisorId recibido del frontend
 *  5. Envía correo de confirmación al instructor
 *  6. El scraperRunner o el dashboard se encargan de procesarlo después
 */
import { validationResult } from "express-validator";
import Instructor from "../models/Instructor.js";
import Report from "../models/Report.js";
import { validatePlatformData } from "../validations/platform.validation.js";
import { sendEmail } from "../utils/nodemailer.js";

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

        // 6. Enviar correo al instructor notificando que su solicitud fue recibida
        if (instructor.email) {
            const platformLabels = { soi: 'SOI', asopagos: 'ASOPAGOS', mi_planilla: 'COMPENSAR (Mi Planilla)', aportes_en_linea: 'APORTES EN LÍNEA' };
            sendEmail(
                instructor.email,
                `Solicitud de certificado recibida - ${platformLabels[platform] || platform}`,
                `
                    <p style="font-size: 16px;">Hola, <strong>${fullName}</strong></p>
                    <p>Su solicitud de certificado de seguridad social ha sido recibida correctamente y se encuentra en estado <strong>pendiente</strong>.</p>
                    <div style="background-color: #f0fdf4; border-left: 4px solid #318335; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                        <p style="margin: 0;"><strong>Plataforma:</strong> ${platformLabels[platform] || platform}</p>
                        <p style="margin: 0;"><strong>Periodo:</strong> ${reportMonth}/${reportYear}</p>
                        <p style="margin: 0;"><strong>EPS:</strong> ${eps}</p>
                    </div>
                    <p>Una vez que su certificado esté listo, recibirá un nuevo correo con el enlace de descarga.</p>
                    <p style="color: #6b7280; font-size: 14px;">Si usted no realizó esta solicitud, ignore este correo.</p>
                `
            ).catch(() => {});
        }

        // 7. Responder con confirmación
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
