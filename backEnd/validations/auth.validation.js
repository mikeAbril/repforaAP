import { body } from "express-validator";

/**
 * Reglas de validación para login
 */
export const loginValidation = [
    body("documentType")
        .trim()
        .notEmpty().withMessage("El tipo de documento es obligatorio")
        .isIn(["CC", "CE", "PA", "TI", "CD", "PE", "PT", "RC", "SC"]).withMessage("Tipo de documento no válido."),
    body("documentNumber")
        .trim()
        .notEmpty().withMessage("El número de documento es obligatorio"),
    body("password")
        .notEmpty().withMessage("La contraseña es obligatoria"),
];

