import { Router } from "express";
import { listSupervisorsPublic, getProfile, updateProfile } from "../controllers/supervisorController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /api/supervisors/list — público para el formulario de contratistas
router.get("/list", listSupervisorsPublic);

// Rutas protegidas de perfil
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;
