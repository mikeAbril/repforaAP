import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import Supervisor from "../models/Supervisor.js";
import { encrypt } from "../utils/crypto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * Extrae el ID de la carpeta de una URL de Google Drive si es necesario.
 */
const createSupervisor = async (name, documentType, documentNumber, email, password, apiKey = null) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Conectado a MongoDB");

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const existing = await Supervisor.findOne({ documentType, documentNumber: documentNumber.trim() });
        if (existing) {
            console.log("⚠️ El supervisor ya existe con ese tipo y número de documento.");
            process.exit(0);
        }

        const supervisor = new Supervisor({
            name,
            documentType,
            documentNumber: documentNumber.trim(),
            email: email.trim(),
            password: hashedPassword,
            apiKey: apiKey ? encrypt(apiKey.trim()) : null
        });

        await supervisor.save();
        console.log(`\n===========================================`);
        console.log(`✅ Supervisor creado exitosamente:`);
        console.log(`👤 Nombre: ${name}`);
        console.log(`🆔 Documento: ${documentType} ${documentNumber}`);
        console.log(`📧 Correo: ${email}`);
        if (apiKey) console.log(`🔑 API Key: ${apiKey}`);
        console.log(`===========================================\n`);

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

// Uso: node scripts/addSupervisor.js "Nombre" "CC" "12345678" "correo@ejemplo.com" "password123" ["apiKey"]
const [,, name, docType, docNum, email, pass, apiKey] = process.argv;

if (!name || !docType || !docNum || !email || !pass) {
    console.log("Uso: node scripts/addSupervisor.js \"Nombre\" \"TipoDoc\" \"Documento\" \"Email\" \"password\" [\"apiKey\"]");
} else {
    createSupervisor(name, docType, docNum, email, pass, apiKey);
}
