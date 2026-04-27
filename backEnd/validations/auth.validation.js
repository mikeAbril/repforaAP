import { body } from "express-validator";

/**
 * Reglas de validación para login
 */
export const loginValidation = [
    body("documentNumber")
        .trim()
        .notEmpty().withMessage("El número de documento es obligatorio"),
    body("password")
        .notEmpty().withMessage("La contraseña es obligatoria"),
];

