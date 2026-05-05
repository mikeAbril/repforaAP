import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import Supervisor from "../models/Supervisor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const createAdmin = async () => {
    const adminData = {
        name: "Administrador del Sistema",
        documentType: "CC",
        documentNumber: "10002000",
        email: "admin@sena.edu.co",
        password: "AdminSena2026*",
        role: "admin",
        mustChangePassword: false,
        isConfigured: true
    };

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Conectado a MongoDB");

        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        
        const existing = await Supervisor.findOne({ 
            documentType: adminData.documentType, 
            documentNumber: adminData.documentNumber 
        });

        if (existing) {
            console.log("⚠️ El administrador ya existe. Actualizando contraseña y rol...");
            existing.password = hashedPassword;
            existing.role = "admin";
            existing.mustChangePassword = false;
            existing.isConfigured = true;
            await existing.save();
        } else {
            const admin = new Supervisor({
                ...adminData,
                password: hashedPassword
            });
            await admin.save();
        }

        console.log(`\n===========================================`);
        console.log(`✅ Administrador creado/actualizado:`);
        console.log(`👤 Nombre: ${adminData.name}`);
        console.log(`🆔 Documento: ${adminData.documentType} ${adminData.documentNumber}`);
        console.log(`📧 Correo: ${adminData.email}`);
        console.log(`🔑 Contraseña: ${adminData.password}`);
        console.log(`🛡️ Rol: ${adminData.role}`);
        console.log(`===========================================\n`);

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        await mongoose.disconnect();
    }
};

createAdmin();
