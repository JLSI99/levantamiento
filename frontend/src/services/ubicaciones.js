// src/services/ubicaciones.js
import bffClient from '../api/client.js';

export const ubicacionesService = {
    // ==========================================
    // CATALOGOS UNIFICADOS (Lectura para Selector)
    // ==========================================
    async obtenerCatalogosUnificados() {
        const response = await bffClient.get('/ubicaciones/catalogos');
        return response.data;
    },

    async obtenerEdificios() {
        const catalogos = await this.obtenerCatalogosUnificados();
        return catalogos.edificios || catalogos.data?.edificios || [];
    },

    async obtenerDepartamentos() {
        const catalogos = await this.obtenerCatalogosUnificados();
        return catalogos.departamentos || catalogos.data?.departamentos || [];
    },

    // ==========================================
    // EDIFICIOS
    // ==========================================
    async listarEdificios(limit = 50, offset = 0, incluirInactivos = false) {
        const response = await bffClient.get('/ubicaciones/edificios', {
            params: { limit, offset, incluir_inactivos: incluirInactivos }
        });
        return response.data;
    },

    async crearEdificio(data) {
        // Payload: EdificioCreateBFF { nombre, clave }
        const response = await bffClient.post('/ubicaciones/edificios', data);
        return response.data;
    },

    async actualizarEdificio(idEdificio, data) {
        // Payload: EdificioUpdateBFF { nombre, clave }
        const response = await bffClient.put(`/ubicaciones/edificios/${idEdificio}`, data);
        return response.data;
    },

    async darBajaEdificio(idEdificio) {
        const response = await bffClient.delete(`/ubicaciones/edificios/${idEdificio}`);
        return response.data;
    },

    // ==========================================
    // AULAS / ESPACIOS
    // ==========================================
    async obtenerAulasPorEdificio(idEdificio) {
        const response = await bffClient.get(`/ubicaciones/edificios/${idEdificio}/aulas`);
        return response.data;
    },

    async crearAula(idEdificio, data) {
        // Payload: AulaCreateBFF { nombre }
        const response = await bffClient.post(`/ubicaciones/edificios/${idEdificio}/aulas`, data);
        return response.data;
    },

    async actualizarAula(idAula, data) {
        // Payload: AulaUpdateBFF { nombre }
        const response = await bffClient.put(`/ubicaciones/aulas/${idAula}`, data);
        return response.data;
    },

    async darBajaAula(idAula) {
        const response = await bffClient.delete(`/ubicaciones/aulas/${idAula}`);
        return response.data;
    },

    // ==========================================
    // DEPARTAMENTOS
    // ==========================================
    async listarDepartamentos(limit = 50, offset = 0, incluirInactivos = false) {
        const response = await bffClient.get('/ubicaciones/departamentos', {
            params: { limit, offset, incluir_inactivos: incluirInactivos }
        });
        return response.data;
    },

    async crearDepartamento(data) {
        // Payload: DepartamentoCreateBFF { nombre, curp_jefe_departamento }
        const response = await bffClient.post('/ubicaciones/departamentos', data);
        return response.data;
    },

    async actualizarDepartamento(idDepartamento, data) {
        // Payload: DepartamentoUpdateBFF { nombre, curp_jefe_departamento }
        const response = await bffClient.put(`/ubicaciones/departamentos/${idDepartamento}`, data);
        return response.data;
    },

    async darBajaDepartamento(idDepartamento) {
        const response = await bffClient.delete(`/ubicaciones/departamentos/${idDepartamento}`);
        return response.data;
    }
};