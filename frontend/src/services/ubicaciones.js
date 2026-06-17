// src/services/ubicaciones.js
import bffClient from '../api/client.js';

export const ubicacionesService = {
    // Consume la agregación unificada para inicializar los selectores de los formularios
    async obtenerCatalogosUnificados() {
        const response = await bffClient.get('/ubicaciones/catalogos');
        return response.data; // { edificios: [], aulas: [], departments: [] }
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