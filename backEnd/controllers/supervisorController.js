import Supervisor from "../models/Supervisor.js";

/**
 * Extrae el ID de la carpeta de una URL de Google Drive si es necesario.
 */
const extractFolderId = (input) => {
  if (!input) return null;
  const match = input.match(/folders\/([a-zA-Z0-9_-]{25,})|id=([a-zA-Z0-9_-]{25,})/);
  return match ? (match[1] || match[2]) : input.trim();
};

/**
 * GET /api/supervisors/list
 * Retorna una lista simple de supervisores (solo nombre e ID) 
 * para llenar el select del formulario del contratista.
 */
export const listSupervisorsPublic = async (req, res, next) => {
    try {
        const supervisors = await Supervisor.find({}, "name _id").sort({ name: 1 });
        
        res.status(200).json({
            success: true,
            supervisors
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/supervisors/profile
 * Retorna el perfil completo del supervisor autenticado.
 */
export const getProfile = async (req, res, next) => {
    try {
        const supervisor = await Supervisor.findById(req.supervisor.id).select("-password");
        if (!supervisor) {
            return res.status(404).json({ success: false, message: "Supervisor no encontrado" });
        }
        res.json({ success: true, supervisor });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/supervisors/profile
 * Actualiza nombre y número de documento del supervisor.
 */
export const updateProfile = async (req, res, next) => {
    return res.status(403).json({ 
        success: false, 
        message: "Actualización de perfil deshabilitada. Los datos están vinculados a la estructura de Drive." 
    });
};
