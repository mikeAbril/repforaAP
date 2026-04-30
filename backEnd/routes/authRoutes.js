import { Router } from "express";
import { loginValidation } from "../validations/auth.validation.js";
import { login, changePassword } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// POST /api/auth/login — público
router.post("/login", loginValidation, login);

// POST /api/auth/change-password — protegido
router.post("/change-password", authMiddleware, changePassword);

export default router;
