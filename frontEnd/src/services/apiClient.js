import axiosInstance from "@/plugins/axios";

/**
 * GET: Obtener recursos
 * @param {string} url - El endpoint (ej: 'usuarios')
 * @param {object} params - Parámetros de consulta opcionales
 */
export const getData = async (url, params = {}) => {
    const response = await axiosInstance.get(url, { params });
    return response.data;
};

/**
 * POST: Crear un nuevo recurso
 * @param {string} url - El endpoint
 * @param {object} data - El cuerpo de la petición
 */
export const postData = async (url, data) => {
    const response = await axiosInstance.post(url, data);
    return response.data;
};

/**
 * PUT: Actualizar un recurso existente
 * @param {string} url - El endpoint (ej: 'usuarios/123')
 * @param {object} data - Datos a actualizar
 */
export const putData = async (url, data) => {
    const response = await axiosInstance.put(url, data);
    return response.data;
};

/**
 * DELETE: Eliminar un recurso
 * @param {string} url - El endpoint (ej: 'usuarios/123')
 */
export const deleteData = async (url) => {
    const response = await axiosInstance.delete(url);
    return response.data;
};
