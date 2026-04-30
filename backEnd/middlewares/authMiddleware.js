import { verifyToken } from "../helpers/jwt.js";

/**
 * Middleware que protege rutas verificando el JWT.
 * Espera el header: Authorization: Bearer <token>
 * Si es válido, agrega req.supervisor con { id, documentNumber } y continúa.
 * Si no, responde 401.
 */
export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Acceso denegado. Token no proporcionado.",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = verifyToken(token);
        req.supervisor = { 
            id: decoded.id, 
            documentNumber: decoded.documentNumber,
            role: decoded.role || "supervisor"
        };
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token inválido o expirado.",
        });
    }
};

/**
 * Middleware para autorizar por roles.
 * @param {string[]} roles - Lista de roles permitidos.
 */
export const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.supervisor || !roles.includes(req.supervisor.role)) {
            return res.status(403).json({
                success: false,
                message: "No tienes permisos para realizar esta acción.",
            });
        }
        next();
    };
};
