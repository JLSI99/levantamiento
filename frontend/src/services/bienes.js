import bffClient from '../api/client.js';

export const bienesService = {
    async listarTiposBien(limit = 10, offset = 0, incluirInactivos = false) {
        try {
            const response = await bffClient.get('/bienes/tipos-bien', {
                params: { limit, offset, incluir_inactivos: incluirInactivos }
            });
            return response.data;
        } catch (error) {
            console.error('Error al recuperar el catálogo de tipos de bien:', error);
            throw error;
        }
    },

    async obtenerTipoBienPorId(idTipo) {
        try {
            const response = await bffClient.get(`/bienes/tipos-bien/${idTipo}`);
            return response.data;
        } catch (error) {
            console.error(`Error al recuperar tipo de bien [ID: ${idTipo}]:`, error);
            throw error;
        }
    },

    async crearTipoBien(tipoBienData) {
        try {
            const response = await bffClient.post('/bienes/tipos-bien', tipoBienData);
            return response.data;
        } catch (error) {
            console.error('Error de persistencia al crear tipo de bien:', error);
            throw error;
        }
    },

    async modificarTipoBien(idTipo, camposModificados) {
        try {
            const response = await bffClient.patch(`/bienes/tipos-bien/${idTipo}`, camposModificados);
            return response.data;
        } catch (error) {
            console.error(`Fallo en la modificación parcial del tipo de bien [ID: ${idTipo}]:`, error);
            throw error;
        }
    },

    async darDeBajaTipoBien(idTipo) {
        try {
            await bffClient.delete(`/bienes/tipos-bien/${idTipo}`);
            return true;
        } catch (error) {
            console.error(`Error al aplicar baja al tipo de bien [ID: ${idTipo}]:`, error);
            throw error;
        }
    },

    async listarBienes(limit = 10, offset = 0, incluirInactivos = false) {
        try {
            const response = await bffClient.get('/bienes', {
                params: { limit, offset, incluir_inactivos: incluirInactivos }
            });
            return response.data;
        } catch (error) {
            console.error('Error al recuperar el inventario centralizado de bienes:', error);
            throw error;
        }
    },

    async obtenerBienPorId(idBien) {
        try {
            const response = await bffClient.get(`/bienes/${idBien}`);
            return response.data;
        } catch (error) {
            console.error(`Error al consultar detalle del bien instrumental [ID: ${idBien}]:`, error);
            throw error;
        }
    },

    async crearNuevoBien(bienData) {
        try {
            const response = await bffClient.post('/bienes', bienData);
            return response.data;
        } catch (error) {
            console.error('Error al dar de alta el activo en la base de inventario:', error);
            throw error;
        }
    },

    async modificarBien(idBien, camposModificados) {
        try {
            const response = await bffClient.patch(`/bienes/${idBien}`, camposModificados);
            return response.data;
        } catch (error) {
            console.error(`Fallo al intentar parchar el registro del bien [ID: ${idBien}]:`, error);
            throw error;
        }
    },

    async darDeBajaBien(idBien) {
        try {
            await bffClient.delete(`/bienes/${idBien}`);
            return true;
        } catch (error) {
            console.error(`Fallo en cascada al procesar la baja del activo [ID: ${idBien}]:`, error);
            throw error;
        }
    }
};