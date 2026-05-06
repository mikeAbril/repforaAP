import { Router } from "express";
import { submitReportValidation } from "../validations/report.validation.js";
import { submitReport, lookupInstructor } from "../controllers/reportController.js";

const router = Router();

// GET /api/instructors/lookup — búsqueda pública para autocompletar formulario
router.get("/instructors/lookup", lookupInstructor);

// POST /api/reports — público, sin autenticación
router.post("/", submitReportValidation, submitReport);

export default router;
