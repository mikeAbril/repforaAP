import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const ALGORITHM = "aes-256-cbc";
// La clave secreta debe tener 32 caracteres. Si no existe en el env, usamos una por defecto (no recomendado en prod)
const SECRET_KEY = process.env.CRYPTO_KEY || "12345678901234567890123456789012";
const IV_LENGTH = 16; // Para AES, siempre es 16

/**
 * Encripta un texto plano
 * @param {string} text 
 * @returns {string} Texto encriptado en formato iv:encrypted
 */
export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
};

/**
 * Desencripta un texto encriptado
 * @param {string} text Formato iv:encrypted
 * @returns {string} Texto plano
 */
export const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(":");
        const iv = Buffer.from(textParts.shift(), "hex");
        const encryptedText = Buffer.from(textParts.join(":"), "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error("Error al desencriptar:", error.message);
        return null;
    }
};
