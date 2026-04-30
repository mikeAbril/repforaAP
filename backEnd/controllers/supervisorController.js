import Supervisor from "../models/Supervisor.js";
import bcrypt from "bcryptjs";

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
 * Permite al supervisor actualizar su apiKey de 2Captcha.
 */
export const updateProfile = async (req, res, next) => {
    try {
        const { apiKey } = req.body;
        const supervisorId = req.supervisor.id;

        const supervisor = await Supervisor.findByIdAndUpdate(
            supervisorId, 
            { apiKey }, 
            { new: true }
        ).select("-password");

        res.json({
            success: true,
            message: "Perfil actualizado correctamente",
            supervisor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/supervisors/admin
 * Crea un nuevo supervisor (Solo Admin)
 */
export const adminCreateSupervisor = async (req, res, next) => {
    try {
        const { ...rest } = req.body;
        // La contraseña es SIEMPRE el número de documento al crear desde el panel admin
        const hashedPassword = await bcrypt.hash(rest.documentNumber, 10);

        const newSupervisor = new Supervisor({
            ...rest,
            password: hashedPassword
        });

        await newSupervisor.save();

        res.status(201).json({
            success: true,
            message: "Supervisor creado exitosamente",
            supervisor: {
                id: newSupervisor._id,
                name: newSupervisor.name,
                email: newSupervisor.email,
                role: newSupervisor.role
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/supervisors/admin/:id
 * Edita cualquier campo de un supervisor (Solo Admin)
 */
export const adminUpdateSupervisor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };

        // Si viene contraseña, hashearla
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        const supervisor = await Supervisor.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select("-password");

        if (!supervisor) {
            return res.status(404).json({ success: false, message: "Supervisor no encontrado" });
        }

        res.json({
            success: true,
            message: "Supervisor actualizado exitosamente",
            supervisor
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/supervisors/admin/all
 * Lista todos los supervisores con todos sus campos (Solo Admin)
 */
export const adminListAllSupervisors = async (req, res, next) => {
    try {
        const supervisors = await Supervisor.find({}).sort({ name: 1 }).select("-password");
        res.json({ success: true, supervisors });
    } catch (error) {
        next(error);
    }
};
