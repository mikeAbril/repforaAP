import { Router } from "express";
import {
    listSupervisorsPublic,
    getProfile,
    updateProfile,
    getDecryptedApiKey,
    adminCreateSupervisor,
    adminUpdateSupervisor,
    adminListAllSupervisors,
    adminDeleteSupervisor,
    getDriveLink
} from "../controllers/supervisorController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /api/supervisors/list — público para el formulario de contratistas
router.get("/list", listSupervisorsPublic);

// Rutas protegidas de perfil (Cualquier supervisor)
router.get("/profile", authMiddleware, getProfile);
router.get("/profile/apikey", authMiddleware, getDecryptedApiKey);
router.get("/profile/drive-link", authMiddleware, getDriveLink);
router.put("/profile", authMiddleware, updateProfile);

// Rutas de administración (Solo Admin)
router.get("/admin/all", authMiddleware, roleMiddleware(["admin"]), adminListAllSupervisors);
router.post("/admin", authMiddleware, roleMiddleware(["admin"]), adminCreateSupervisor);
router.put("/admin/:id", authMiddleware, roleMiddleware(["admin"]), adminUpdateSupervisor);
router.delete("/admin/:id", authMiddleware, roleMiddleware(["admin"]), adminDeleteSupervisor);

export default router;
