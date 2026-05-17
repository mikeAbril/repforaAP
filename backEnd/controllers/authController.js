/**
 * authController.js — Autenticación y gestión de contraseñas
 *
 * Endpoints:
 *  POST /api/auth/login           → Login con documentType + documentNumber + password → JWT
 *  POST /api/auth/change-password → Cambio obligatorio de contraseña (primer ingreso)
 *  POST /api/auth/forgot-password → Envía código de 6 dígitos al correo del supervisor
 *  POST /api/auth/verify-code     → Verifica código y restablece la contraseña
 *
 * El JWT incluye: { id, documentNumber, role, mustChangePassword }
 * Duración del token: 8 horas (configurado en helpers/jwt.js)
 */
import bcrypt from "bcryptjs";
import { validationResult } from "express-validator";
import Supervisor from "../models/Supervisor.js";
import { generateToken } from "../helpers/jwt.js";
import { sendEmail } from "../utils/nodemailer.js";

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

/**
 * POST /api/auth/forgot-password
 * Envía un correo con un código de 6 dígitos para restablecer contraseña.
 */
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "El correo es obligatorio."
            });
        }

        // Buscar supervisor por correo
        const supervisor = await Supervisor.findOne({ email: email.trim().toLowerCase() });
        if (!supervisor) {
            // Por seguridad, no revelamos si el correo existe
            return res.json({
                success: true,
                message: "Si el correo está registrado, recibirás un código para restablecer tu contraseña."
            });
        }

        // Generar código de 6 dígitos
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetExpires = new Date(Date.now() + 3600000); // 1 hora

        // Guardar código en el usuario
        supervisor.resetPasswordToken = resetCode;
        supervisor.resetPasswordExpires = resetExpires;
        await supervisor.save();

        const htmlContent = `
            <div style="text-align: center; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <h2 style="color: #318335; margin-top: 0; margin-bottom: 15px; font-size: 20px; line-height: 1.3; font-weight: 700; letter-spacing: -0.5px;">
                    Código de Recuperación
                </h2>
                <p style="color: #4b5563; margin-bottom: 25px; font-size: 15px; line-height: 1.6;">
                    Hola <strong>${supervisor.name}</strong>,<br>
                    Has solicitado restablecer tu contraseña. Usa el siguiente código:
                </p>
                <div style="margin: 20px 0; text-align: center;">
                    <code style="font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 26px; font-weight: 700; color: #318335; letter-spacing: 5px; background-color: #f3f4f6; border: 1px dashed #d1d5db; padding: 10px 20px; border-radius: 8px; display: inline-block; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; cursor: pointer;" title="Haz doble clic para copiar">${resetCode}</code>
                </div>
                <p style="color: #6b7280; margin-top: 25px; font-size: 13px; line-height: 1.5;">
                    Este código expirará en 1 hora.<br>
                    Si no solicitaste este cambio, puedes ignorar este correo con total tranquilidad.
                </p>
            </div>
        `;

        await sendEmail(supervisor.email, 'Código de Recuperación - SENA', htmlContent);

        res.json({
            success: true,
            message: "Si el correo está registrado, recibirás un código para restablecer tu contraseña."
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/verify-code
 * Verifica el código y permite restablecer la contraseña.
 */
export const verifyCodeAndReset = async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Todos los campos son obligatorios."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "La contraseña debe tener al menos 6 caracteres."
            });
        }

        // Buscar supervisor por correo y código
        const supervisor = await Supervisor.findOne({
            email: email.trim().toLowerCase(),
            resetPasswordToken: code,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!supervisor) {
            return res.status(400).json({
                success: false,
                message: "Código inválido o ha expirado."
            });
        }

        // Actualizar contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        supervisor.password = hashedPassword;
        supervisor.resetPasswordToken = null;
        supervisor.resetPasswordExpires = null;
        supervisor.mustChangePassword = false;
        await supervisor.save();

        res.json({
            success: true,
            message: "Contraseña restablecida correctamente. Ya puedes iniciar sesión."
        });
    } catch (error) {
        next(error);
    }
};
