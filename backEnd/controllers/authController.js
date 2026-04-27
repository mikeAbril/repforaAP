import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import Supervisor from "../models/Supervisor.js";
import { generateToken } from "../helpers/jwt.js";

/**
 * POST /api/auth/login
 * Autentica un supervisor y retorna un JWT.
 */
export const login = async (req, res, next) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        const { documentNumber, password } = req.body;

        // Buscar supervisor por número de documento
        const supervisor = await Supervisor.findOne({ documentNumber: documentNumber.trim() });
        if (!supervisor) {
            return res.status(401).json({
                success: false,
                message: "Credenciales incorrectas.",
            });
        }

        // Comparar contraseña
        const isMatch = await bcrypt.compare(password, supervisor.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Credenciales incorrectas.",
            });
        }

        // Generar token
        const token = generateToken({ id: supervisor._id, documentNumber: supervisor.documentNumber });

        res.json({
            success: true,
            token,
            supervisor: {
                id: supervisor._id,
                documentNumber: supervisor.documentNumber,
                name: supervisor.name,
            },
        });
    } catch (error) {
        next(error);
    }
};
