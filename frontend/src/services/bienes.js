import bffClient from '/src/core/api/client.js';

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

    async listarTagsBien(limit = 10, offset = 0, incluirInactivos = false) {
        try {
            const response = await bffClient.get('/bienes/tags-bien', {
                params: { limit, offset, incluir_inactivos: incluirInactivos }
            });
            return response.data;
        } catch (error) {
            console.error('Error al recuperar el catálogo de etiquetas (tags):', error);
            throw error;
        }
    },

    async obtenerTagBienPorId(idTag) {
        try {
            const response = await bffClient.get(`/bienes/tags-bien/${idTag}`);
            return response.data;
        } catch (error) {
            console.error(`Error al recuperar la etiqueta [ID: ${idTag}]:`, error);
            throw error;
        }
    },

    async crearTagBien(tagData) {
        try {
            const response = await bffClient.post('/bienes/tags-bien', tagData);
            return response.data;
        } catch (error) {
            console.error('Error de persistencia al crear etiqueta (tag):', error);
            throw error;
        }
    },

    async modificarTagBien(idTag, camposModificados) {
        try {
            const response = await bffClient.patch(`/bienes/tags-bien/${idTag}`, camposModificados);
            return response.data;
        } catch (error) {
            console.error(`Fallo en la modificación de la etiqueta [ID: ${idTag}]:`, error);
            throw error;
        }
    },

    async darDeBajaTagBien(idTag) {
        try {
            await bffClient.delete(`/bienes/tags-bien/${idTag}`);
            return true;
        } catch (error) {
            console.error(`Error al dar de baja la etiqueta [ID: ${idTag}]:`, error);
            throw error;
        }
    },

    async listarBienes(limit = 100, offset = 0, incluirInactivos = false) {
        try {
            const response = await bffClient.get('/bienes/', {
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

    async obtenerBienPorNumeroInventario(numeroInventario) {
        try {
            const response = await bffClient.get(`/bienes/por-inventario/${encodeURIComponent(numeroInventario)}`);
            return response.data;
        } catch (error) {
            console.error(`Error al consultar detalle del bien por número de inventario [${numeroInventario}]:`, error);
            throw error;
        }
    },

    async obtenerBienPorQr(numeroInventarioOId) {
        try {
            return await this.obtenerBienPorNumeroInventario(numeroInventarioOId);
        } catch (e) {
            return await this.obtenerBienPorId(numeroInventarioOId);
        }
    },

    async crearNuevoBien(bienData) {
        try {
            const response = await bffClient.post('/bienes/', bienData);
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
    },

    async subirImagenBien(idBien, fileOrFiles) {
        try {
            const formData = new FormData();

            if (Array.isArray(fileOrFiles)) {
                fileOrFiles.forEach((file) => {
                    formData.append('files', file);
                });
            } else {
                formData.append('files', fileOrFiles);
            }

            const response = await bffClient.post(`/bienes/${idBien}/imagenes`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`Error al subir la imagen para el bien [ID: ${idBien}]:`, error);
            throw error;
        }
    },

    async eliminarImagenBien(idBien, idImagen) {
        try {
            await bffClient.delete(`/bienes/${idBien}/imagenes/${idImagen}`);
            return true;
        } catch (error) {
            console.error(`Error al eliminar la imagen [ID: ${idImagen}] del bien [ID: ${idBien}]:`, error);
            throw error;
        }
    },

    // ==========================================
    // CHECKLIST / INSPECCIONES FÍSICAS
    // ==========================================

    async registrarInspeccion(inspeccionData) {
        try {
            const response = await bffClient.post('/bienes/inspecciones', inspeccionData);
            return response.data;
        } catch (error) {
            console.error('Error al registrar inspección física del bien:', error);
            throw error;
        }
    },

    async listarInspecciones({
        limit = 20,
        offset = 0,
        numero_inventario = null,
        esta_presente = null,
        estado_fisico = null
    } = {}) {
        try {
            const params = { limit, offset };
            if (numero_inventario) params.numero_inventario = numero_inventario;
            if (esta_presente !== null && esta_presente !== '') params.esta_presente = esta_presente;
            if (estado_fisico) params.estado_fisico = estado_fisico;

            const response = await bffClient.get('/bienes/inspecciones', { params });
            return response.data;
        } catch (error) {
            console.error('Error al consultar historial de inspecciones físicas:', error);
            throw error;
        }
    },

    async eliminarInspeccion(idInspeccion) {
        try {
            await bffClient.delete(`/bienes/inspecciones/${idInspeccion}`);
            return true;
        } catch (error) {
            console.error(`Error al eliminar inspección [ID: ${idInspeccion}]:`, error);
            throw error;
        }
    }
};