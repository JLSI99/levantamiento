import bffClient from '../api/client.js';

export const ubicacionesService = {
    async obtenerCatalogosUnificados() {
        const response = await bffClient.get('/ubicaciones/catalogos');
        return response.data;
    },

    async crearEdificio(edificioData) {
        const response = await bffClient.post('/ubicaciones/edificios', edificioData);
        return response.data;
    },

    async listarEdificios(limit = 10, offset = 0, incluirInactivos = false) {
        const response = await bffClient.get('/ubicaciones/edificios', {
            params: { limit, offset, incluir_inactivos: incluirInactivos }
        });
        return response.data;
    }
};