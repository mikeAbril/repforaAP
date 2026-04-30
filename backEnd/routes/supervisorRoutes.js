import { Router } from "express";
import { 
    listSupervisorsPublic, 
    getProfile, 
    updateProfile, 
    adminCreateSupervisor, 
    adminUpdateSupervisor, 
    adminListAllSupervisors 
} from "../controllers/supervisorController.js";
import { authMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

// GET /api/supervisors/list — público para el formulario de contratistas
router.get("/list", listSupervisorsPublic);

// Rutas protegidas de perfil (Cualquier supervisor)
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

// Rutas de administración (Solo Admin)
router.get("/admin/all", authMiddleware, roleMiddleware(["admin"]), adminListAllSupervisors);
router.post("/admin", authMiddleware, roleMiddleware(["admin"]), adminCreateSupervisor);
router.put("/admin/:id", authMiddleware, roleMiddleware(["admin"]), adminUpdateSupervisor);

export default router;
