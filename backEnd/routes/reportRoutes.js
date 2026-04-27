import { Router } from "express";
import { submitReportValidation } from "../validations/report.validation.js";
import { submitReport } from "../controllers/reportController.js";

const router = Router();

// POST /api/reports — público, sin autenticación
router.post("/", submitReportValidation, submitReport);

export default router;
