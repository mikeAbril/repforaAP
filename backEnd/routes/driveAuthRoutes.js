import express from "express";
import { getAuthUrl, handleAuthCallbackGet, handleAuthCallbackPost, getAuthStatus, revokeCredentials } from "../controllers/driveAuthController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Obtener URL de autorización (requiere autenticación de admin)
router.get("/auth/url", authMiddleware, getAuthUrl);

// Procesar callback (GET - desde Google)
router.get("/auth/callback", handleAuthCallbackGet);

// Procesar callback (POST - desde el frontend)
router.post("/auth/callback", handleAuthCallbackPost);

// Verificar estado (requiere autenticación)
router.get("/auth/status", authMiddleware, getAuthStatus);

// Revocar credenciales (requiere autenticación de admin)
router.delete("/auth/revoke", authMiddleware, revokeCredentials);

export default router;