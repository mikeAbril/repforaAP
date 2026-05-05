import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getReports, getStats, deleteReport } from "../controllers/dashboardController.js";

const router = Router();

// Todas las rutas del dashboard requieren JWT
router.use(authMiddleware);

// GET /api/dashboard/reports — lista reportes con filtros
router.get("/reports", getReports);
router.delete("/reports/:id", deleteReport);
router.get("/stats", getStats);

export default router;
