import { Router } from "express";
import { loginValidation } from "../validations/auth.validation.js";
import { login, changePassword, forgotPassword, verifyCodeAndReset } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// POST /api/auth/login — público
router.post("/login", loginValidation, login);

// POST /api/auth/forgot-password — público (envía código al correo)
router.post("/forgot-password", forgotPassword);

// POST /api/auth/verify-code — público (verifica código y restablece contraseña)
router.post("/verify-code", verifyCodeAndReset);

// POST /api/auth/change-password — protegido
router.post("/change-password", authMiddleware, changePassword);

export default router;
