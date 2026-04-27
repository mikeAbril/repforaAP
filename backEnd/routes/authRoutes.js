import { Router } from "express";
import { loginValidation } from "../validations/auth.validation.js";
import { login } from "../controllers/authController.js";

const router = Router();

// POST /api/auth/login — público
router.post("/login", loginValidation, login);

export default router;
