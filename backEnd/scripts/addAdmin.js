import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Supervisor from '../models/Supervisor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        // Datos del Admin (Miguel Duran)
        const name = 'Miguel Duran';
        const docType = 'CC';
        const docNum = '123456789';
        const email = 'miguel_duran17@outlook.com';
        const pass = '123456789';

        const hashedPassword = await bcrypt.hash(pass, 10);
        
        // Eliminar si ya existe para evitar errores de duplicado
        await Supervisor.deleteOne({ documentType: docType, documentNumber: docNum });

        const s = new Supervisor({
            name,
            documentType: docType,
            documentNumber: docNum,
            email,
            password: hashedPassword,
            role: 'admin',
            mustChangePassword: true // Volvemos al estándar: debe cambiarla al entrar
        });

        await s.save();
        console.log(`\n===========================================`);
        console.log(`✅ Admin creado exitosamente:`);
        console.log(`👤 Nombre: ${name}`);
        console.log(`🆔 Documento: ${docType} ${docNum}`);
        console.log(`📧 Correo: ${email}`);
        console.log(`🔑 Rol: admin`);
        console.log(`⚠️ Debe cambiar contraseña: Sí`);
        console.log(`===========================================\n`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
