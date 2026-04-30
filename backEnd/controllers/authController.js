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

        const { documentType, documentNumber, password } = req.body;

        // Buscar supervisor por tipo y número de documento
        const supervisor = await Supervisor.findOne({ 
            documentType, 
            documentNumber: documentNumber.trim() 
        });
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
        const token = generateToken({ 
            id: supervisor._id, 
            documentNumber: supervisor.documentNumber,
            role: supervisor.role,
            mustChangePassword: supervisor.mustChangePassword
        });

        res.json({
            success: true,
            token,
            supervisor: {
                id: supervisor._id,
                documentType: supervisor.documentType,
                documentNumber: supervisor.documentNumber,
                name: supervisor.name,
                email: supervisor.email,
                role: supervisor.role,
                apiKey: supervisor.apiKey,
                mustChangePassword: supervisor.mustChangePassword,
                isConfigured: supervisor.isConfigured
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/change-password
 * Permite cambiar la contraseña obligatoria en el primer ingreso.
 */
export const changePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        const supervisorId = req.supervisor.id;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "La nueva contraseña debe tener al menos 6 caracteres."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await Supervisor.findByIdAndUpdate(supervisorId, {
            password: hashedPassword,
            mustChangePassword: false
        });

        // Generar un nuevo token que refleje que ya no debe cambiar la contraseña
        const updatedSupervisor = await Supervisor.findById(supervisorId);
        const token = generateToken({ 
            id: updatedSupervisor._id, 
            documentNumber: updatedSupervisor.documentNumber,
            role: updatedSupervisor.role,
            mustChangePassword: false
        });

        res.json({
            success: true,
            message: "Contraseña actualizada exitosamente.",
            token
        });
    } catch (error) {
        next(error);
    }
};
