/**
 * supervisorController.js — Gestión de supervisores
 *
 * Endpoints públicos:
 *  GET /api/supervisors/list → Lista supervisores (solo nombre e ID) para el formulario
 *
 * Endpoints protegidos (cualquier supervisor autenticado):
 *  GET  /api/supervisors/profile          → Perfil completo del supervisor
 *  GET  /api/supervisors/profile/apikey   → API Key desencriptada de 2Captcha
 *  GET  /api/supervisors/profile/drive-link → Link de la carpeta de Drive del supervisor
 *  PUT  /api/supervisors/profile          → Actualizar apiKey (valida contra 2Captcha)
 *
 * Endpoints de admin (solo rol "admin"):
 *  GET    /api/supervisors/admin/all  → Lista todos los supervisores
 *  POST   /api/supervisors/admin      → Crear supervisor (contraseña = documentNumber)
 *  PUT    /api/supervisors/admin/:id  → Editar supervisor
 *  DELETE /api/supervisors/admin/:id  → Eliminar supervisor
 */
import Supervisor from "../models/Supervisor.js";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "../utils/crypto.js";
import { getDriveClient, getRootFolderId } from "../services/driveService.js";

/**
 * GET /api/supervisors/list
 * Retorna una lista simple de supervisores (solo nombre e ID) 
 * para llenar el select del formulario del contratista.
 */
export const listSupervisorsPublic = async (req, res, next) => {
    try {
        const supervisors = await Supervisor.find({ role: "supervisor" }, "name _id").sort({ name: 1 });

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
 * GET /api/supervisors/profile/apikey
 * Retorna la API Key desencriptada del supervisor autenticado.
 */
export const getDecryptedApiKey = async (req, res, next) => {
    try {
        const supervisor = await Supervisor.findById(req.supervisor.id).select("apiKey");
        if (!supervisor || !supervisor.apiKey) {
            return res.json({ success: true, apiKey: null });
        }
        const apiKey = decrypt(supervisor.apiKey);
        res.json({ success: true, apiKey });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/supervisors/profile
 * Permite al supervisor actualizar su apiKey de 2Captcha.
 * Valida la key contra 2Captcha antes de guardar.
 */
export const updateProfile = async (req, res, next) => {
    try {
        let { apiKey } = req.body;
        const supervisorId = req.supervisor.id;

        if (apiKey !== undefined && apiKey.trim() !== "") {
            apiKey = apiKey.trim();
            // Validar con 2Captcha antes de guardar
            try {
                const balanceUrl = `https://api.2captcha.com/res.php?key=${encodeURIComponent(apiKey)}&action=getbalance&json=1`;
                const response = await fetch(balanceUrl);
                const data = await response.json();

                if (data.status === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "API Key inválida. Verifique e intente de nuevo."
                    });
                }

                apiKey = encrypt(apiKey);
            } catch (fetchError) {
                console.error("Error validando API Key con 2Captcha:", fetchError.message);
                return res.status(502).json({
                    success: false,
                    message: "No se pudo validar la API Key con 2Captcha. Intente más tarde."
                });
            }
        } else if (apiKey !== undefined) {
            apiKey = null;
        }

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
        const { apiKey, ...rest } = req.body;
        // La contraseña es SIEMPRE el número de documento al crear desde el panel admin
        const hashedPassword = await bcrypt.hash(rest.documentNumber, 10);

        const newSupervisor = new Supervisor({
            ...rest,
            password: hashedPassword,
            apiKey: apiKey ? encrypt(apiKey.trim()) : null
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

        // Si viene apiKey, encriptarla
        if (updates.apiKey !== undefined) {
            if (updates.apiKey.trim() === "") {
                updates.apiKey = null;
            } else {
                updates.apiKey = encrypt(updates.apiKey.trim());
            }
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

/**
 * DELETE /api/supervisors/admin/:id
 * Elimina un supervisor (Solo Admin)
 */
export const adminDeleteSupervisor = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Opcional: Evitar que el admin se borre a sí mismo
        if (req.supervisor && req.supervisor.id === id) {
            return res.status(400).json({ success: false, message: "No puedes eliminar tu propia cuenta" });
        }

        const supervisor = await Supervisor.findByIdAndDelete(id);

        if (!supervisor) {
            return res.status(404).json({ success: false, message: "Supervisor no encontrado" });
        }

        res.json({ success: true, message: "Supervisor eliminado exitosamente" });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/supervisors/profile/drive-link
 * Obtiene o crea la carpeta de Drive del supervisor y retorna la URL.
 */
export const getDriveLink = async (req, res, next) => {
    try {
        const supervisor = await Supervisor.findById(req.supervisor.id);
        if (!supervisor) {
            return res.status(404).json({ success: false, message: "Supervisor no encontrado" });
        }

        const drive = await getDriveClient();
        const activeRootId = await getRootFolderId(drive);

        // 1. Encontrar o crear la carpeta PLANILLAS en la raíz
        const planillasRes = await drive.files.list({
            q: `name='PLANILLAS' and '${activeRootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, webViewLink)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        let planillasId = null;
        let planillasUrl = null;

        if (planillasRes.data.files.length > 0) {
            planillasId = planillasRes.data.files[0].id;
            planillasUrl = planillasRes.data.files[0].webViewLink;
        } else {
            const folder = await drive.files.create({
                requestBody: { name: "PLANILLAS", mimeType: "application/vnd.google-apps.folder", parents: [activeRootId] },
                fields: "id, webViewLink",
                supportsAllDrives: true,
            });
            planillasId = folder.data.id;
            planillasUrl = folder.data.webViewLink;
        }

        // Si es admin, devolver la carpeta pública PLANILLAS
        if (supervisor.role === "admin") {
            try {
                await drive.permissions.create({
                    fileId: planillasId,
                    requestBody: { role: "reader", type: "anyone" }
                });
            } catch (e) {
                console.error("Error asignando permisos públicos (Admin):", e.message);
            }

            if (supervisor.driveFolderUrl !== planillasUrl) {
                supervisor.driveFolderUrl = planillasUrl;
                await supervisor.save();
            }

            return res.json({ success: true, url: planillasUrl });
        }

        // Si es supervisor normal, buscamos/creamos su carpeta DENTRO de PLANILLAS
        const folderName = supervisor.name.toUpperCase().trim();

        const response = await drive.files.list({
            q: `name='${folderName}' and '${planillasId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id, webViewLink)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        });

        let folderUrl = null;
        let folderId = null;

        if (response.data.files.length > 0) {
            folderId = response.data.files[0].id;
            folderUrl = response.data.files[0].webViewLink;
        } else {
            const folder = await drive.files.create({
                requestBody: {
                    name: folderName,
                    mimeType: "application/vnd.google-apps.folder",
                    parents: [planillasId],
                },
                fields: "id, webViewLink",
                supportsAllDrives: true,
            });
            folderId = folder.data.id;
            folderUrl = folder.data.webViewLink;
        }

        // Asegurar siempre que sea pública
        try {
            await drive.permissions.create({
                fileId: folderId,
                requestBody: { role: "reader", type: "anyone" }
            });
        } catch (e) {
            console.error("Error asignando permisos públicos (Supervisor):", e.message);
        }

        // Actualizar en DB
        if (supervisor.driveFolderUrl !== folderUrl) {
            supervisor.driveFolderUrl = folderUrl;
            await supervisor.save();
        }

        res.json({ success: true, url: folderUrl });
    } catch (error) {
        console.error("Error obteniendo carpeta de Drive:", error.message);
        res.json({ success: true, url: "https://drive.google.com/drive/folders/" + process.env.GOOGLE_DRIVE_FOLDER_ID });
    }
};
