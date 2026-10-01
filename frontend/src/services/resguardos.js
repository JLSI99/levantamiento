import bffClient from '/src/core/api/client.js';

export const resguardosService = {
    async listarMisResguardos(limit = 10, offset = 0) {
        try {
            const response = await bffClient.get('/resguardos/mis-resguardos', {
                params: { limit, offset }
            });
            return response.data;
        } catch (error) {
            console.error('Error al recuperar resguardos personales:', error);
            throw error;
        }
    },

    async listarTodosLosResguardosInstitucionales(filtros = {}) {
        try {
            const { limit = 100, offset = 0, soloVigentes = true, incluirBorrados = false, curp = null } = filtros;
            const params = { limit, offset, solo_vigentes: soloVigentes, incluir_borrados: incluirBorrados };
            
            if (curp && curp.trim() !== '') {
                params['curp'] = curp.trim().toUpperCase();
            }

            const response = await bffClient.get('/resguardos', { params });
            return response.data;
        } catch (error) {
            console.error('Error al recuperar inventario institucional de resguardos:', error);
            throw error;
        }
    },

    async crearAsignacion(resguardoCreateData) {
        try {
            const response = await bffClient.post('/resguardos', resguardoCreateData);
            return response.data;
        } catch (error) {
            console.error('Error al emitir acta de resguardo:', error);
            throw error;
        }
    },

    async modificarAsignacion(idAsignacion, datosCambio) {
        try {
            const response = await bffClient.patch(`/resguardos/${idAsignacion}`, datosCambio);
            return response.data;
        } catch (error) {
            console.error(`Error al modificar asignación de resguardo [ID: ${idAsignacion}]:`, error);
            throw error;
        }
    },

    async concluirResguardoOrdinario(idAsignacion) {
        try {
            const response = await bffClient.post(`/resguardos/${idAsignacion}/cerrar`);
            return response.data;
        } catch (error) {
            console.error(`Error al cerrar resguardo ordinario [ID: ${idAsignacion}]:`, error);
            throw error;
        }
    },

    async eliminarBajaLogica(idAsignacion) {
        try {
            await bffClient.delete(`/resguardos/${idAsignacion}`);
            return true;
        } catch (error) {
            console.error(`Error al aplicar baja lógica de resguardo [ID: ${idAsignacion}]:`, error);
            throw error;
        }
    }
};