import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Genera un JWT con el payload dado.
 * @param {Object} payload - Datos a incluir en el token (ej: { id, documentNumber })
 * @returns {string} Token JWT firmado
 */
export const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
};

/**
 * Verifica y decodifica un JWT.
 * @param {string} token - Token JWT a verificar
 * @returns {Object} Payload decodificado
 * @throws {Error} Si el token es inválido o expirado
 */
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
