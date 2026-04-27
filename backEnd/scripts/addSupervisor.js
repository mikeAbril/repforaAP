import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import Supervisor from "../models/Supervisor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * Extrae el ID de la carpeta de una URL de Google Drive si es necesario.
 */
const createSupervisor = async (name, documentNumber, password) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Conectado a MongoDB");

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const existing = await Supervisor.findOne({ documentNumber: documentNumber.trim() });
        if (existing) {
            console.log("⚠️ El supervisor ya existe con ese número de documento.");
            process.exit(0);
        }

        const supervisor = new Supervisor({
            name,
            documentNumber: documentNumber.trim(),
            password: hashedPassword,
        });

        await supervisor.save();
        console.log(`\n===========================================`);
        console.log(`✅ Supervisor creado exitosamente:`);
        console.log(`👤 Nombre: ${name}`);
        console.log(`🆔 Documento: ${documentNumber}`);
        console.log(`===========================================\n`);

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

// Uso: node scripts/addSupervisor.js "Juan Camilo" "12345678" "password123"
const [,, name, docNum, pass] = process.argv;

if (!name || !docNum || !pass) {
    console.log("Uso: node scripts/addSupervisor.js \"Nombre\" \"Documento\" \"password\"");
} else {
    createSupervisor(name, docNum, pass);
}
