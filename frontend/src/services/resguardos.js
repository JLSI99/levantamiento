import bffClient from '../api/client.js';

export const resguardosService = {
    async listarMisResguardos(limit = 10, offset = 0) {
        const response = await bffClient.get('/resguardos/mis-resguardos', {
            params: { limit, offset }
        });
        return response.data;
    },

    async listarTodosLosResguardosInstitucionales(filtros = {}) {
        const { limit = 10, offset = 0, soloVigentes = true, incluirBorrados = false, curp = null } = filtros;
        
        const params = { limit, offset, solo_vigentes: soloVigentes, incluir_borrados: incluirBorrados };
        if (curp) params['curp'] = curp;

        const response = await bffClient.get('/resguardos', { params });
        return response.data;
    },

    async crearAsignacion(resguardoCreateData) {
        const response = await bffClient.post('/resguardos', resguardoCreateData);
        return response.data;
    },

    async concluirResguardoOrdinario(idAsignacion) {
        const response = await bffClient.post(`/resguardos/${idAsignacion}/cerrar`);
        return response.data;
    },

    async eliminarBajaLogica(idAsignacion) {
        await bffClient.delete(`/resguardos/${idAsignacion}`);
        return true;
    }
};