// src/services/resguardos.js
import bffClient from '../api/client.js';

export const resguardosService = {
    // VISTA DEL RESGUARDANTE: No envía CURP en parámetros, el BFF la extrae del JWT
    async listarMisResguardos(limit = 10, offset = 0) {
        const response = await bffClient.get('/resguardos/mis-resguardos', {
            params: { limit, offset }
        });
        return response.data; // schemas_resguardos.MisResguardosPaginatedOut
    },

    // VISTA DEL LEVANTADOR / ADMINISTRADOR: Data completamente hidratada (Persona, Bien, Ubicación)
    async listarTodosLosResguardosInstitucionales(filtros = {}) {
        const { limit = 10, offset = 0, soloVigentes = true, incluirBorrados = false, curp = null } = filtros;
        
        const params = { limit, offset, solo_vigentes: soloVigentes, incluir_borrados: incluirBorrados };
        if (curp) params['curp'] = curp;

        const response = await bffClient.get('/resguardos', { params });
        return response.data; // schemas_resguardos.ResguardoAdminPaginatedOutBFF
    },

    async crearAsignacion(resguardoCreateData) {
        const response = await bffClient.post('/resguardos', resguardoCreateData);
        return response.data;
    },

    // Operación de Estado de Ciclo de Vida: Cierre ordinario de resguardo
    async concluirResguardoOrdinario(idAsignacion) {
        const response = await bffClient.post(`/resguardos/${idAsignacion}/cerrar`);
        return response.data;
    },

    // Operación de eliminación por baja lógica definitiva
    async eliminarBajaLogica(idAsignacion) {
        await bffClient.delete(`/resguardos/${idAsignacion}`);
        return true;
    }
};