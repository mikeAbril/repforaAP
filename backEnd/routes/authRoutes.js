import { Router } from "express";
import { loginValidation } from "../validations/auth.validation.js";
import { login, changePassword, forgotPassword, verifyCodeAndReset } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

import Supervisor from "../models/Supervisor.js";
import bcrypt from "bcryptjs";

const router = Router();

// ⚠️ RUTA TEMPORAL - SE BORRARÁ DE INMEDIATO
// router.post("/crear-admin-temporal-xyz123", async (req, res) => {
//     try {
//         const hashedPassword = await bcrypt.hash("123456789", 10);

//         const existing = await Supervisor.findOne({ documentNumber: "123456789" });
//         if (existing) {
//             return res.json({ status: "success", msg: "El administrador ya existía." });
//         }

//         const admin = new Supervisor({
//             name: "Admin Inicial",
//             documentType: "CC",
//             documentNumber: "123456789",
//             email: "admin.inicial@sena.edu.co",
//             password: hashedPassword,
//             role: "admin",
//             mustChangePassword: false,
//             isConfigured: true
//         });

//         await admin.save();
//         res.json({ status: "success", msg: "¡Administrador inicial creado con éxito en producción!" });
//     } catch (error) {
//         res.status(500).json({ status: "error", error: error.message });
//     }
// });

// POST /api/auth/login — público
router.post("/login", loginValidation, login);

// POST /api/auth/forgot-password — público (envía código al correo)
router.post("/forgot-password", forgotPassword);

// POST /api/auth/verify-code — público (verifica código y restablece contraseña)
router.post("/verify-code", verifyCodeAndReset);

// POST /api/auth/change-password — protegido
router.post("/change-password", authMiddleware, changePassword);

export default router;
