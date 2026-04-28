import { body } from "express-validator";

/**
 * Reglas de validación para los campos comunes del formulario de reporte
 */
export const submitReportValidation = [
    body("documentType")
        .trim()
        .notEmpty().withMessage("El tipo de documento es obligatorio")
        .isIn(["CC", "CE", "PA", "TI", "CD", "PE", "PT", "RC", "SC"]).withMessage("Tipo de documento no válido."),
    body("documentNumber")
        .trim()
        .notEmpty().withMessage("El número de documento es obligatorio"),
    body("fullName")
        .trim()
        .notEmpty().withMessage("El nombre completo es obligatorio"),
    body("eps")
        .trim()
        .notEmpty().withMessage("La EPS es obligatoria"),
    body("email")
        .trim()
        .notEmpty().withMessage("El correo es obligatorio")
        .isEmail().withMessage("Correo electrónico no válido"),
    body("documentIssueDate")
        .trim()
        .notEmpty().withMessage("La fecha de expedición del documento es obligatoria")
        .isISO8601().withMessage("Fecha de expedición no válida (debe ser AAAA-MM-DD)"),
    body("platform")
        .trim()
        .notEmpty().withMessage("La plataforma es obligatoria")
        .isIn(["soi", "aportes_en_linea", "asopagos", "mi_planilla"])
        .withMessage("Plataforma no válida. Usa: soi, aportes_en_linea, asopagos o mi_planilla"),
    body("platformData")
        .notEmpty().withMessage("Los datos de la plataforma son obligatorios"),
    body("supervisorId")
        .trim()
        .notEmpty().withMessage("El supervisor es obligatorio")
        .isMongoId().withMessage("ID de supervisor no válido"),
];
