import bffClient from '../api/client.js';

export const bienesService = {
    async listar(limit = 10, offset = 0, incluirInactivos = false) {
        const response = await bffClient.get('/bienes', {
            params: { limit, offset, incluir_inactivos: incluirInactivos }
        });
        return response.data;
    },

    async obtenerPorId(idBien) {
        const response = await bffClient.get(`/bienes/${idBien}`);
        return response.data;
    },

    async crear(bienData) {
        const response = await bffClient.post('/bienes', bienData);
        return response.data;
    },

    async actualizar(idBien, bienData) {
        const response = await bffClient.patch(`/bienes/${idBien}`, bienData);
        return response.data;
    },

    async eliminar(idBien) {
        await bffClient.delete(`/bienes/${idBien}`);
        return true;
    }
};