import express from "express";
import { isCronActive, setCronStatus } from "../scrapers/scraperRunner.js";

const router = express.Router();

/**
 * @route GET /api/system/cron/status
 * @desc Obtiene el estado actual del cron (encendido/apagado)
 */
router.get("/cron/status", (req, res) => {
    try {
        const active = isCronActive();
        res.json({
            success: true,
            enabled: active,
            message: active ? "El cron está habilitado" : "El cron está deshabilitado"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @route POST /api/system/cron/toggle
 * @desc Habilita o deshabilita el cron manualmente
 */
router.post("/cron/toggle", (req, res) => {
    try {
        const { enabled } = req.body;
        
        if (typeof enabled !== "boolean") {
            return res.status(400).json({ 
                success: false, 
                message: "Se requiere el campo 'enabled' (boolean)" 
            });
        }

        setCronStatus(enabled);
        
        res.json({
            success: true,
            enabled: enabled,
            message: enabled ? "Cron habilitado exitosamente" : "Cron deshabilitado exitosamente"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
