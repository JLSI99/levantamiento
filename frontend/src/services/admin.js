import bffClient from '../api/client.js';
export const adminService = {

    async altaPersonalCentralizada(altaCompuestaData) {
        try {
            const response = await bffClient.post('/admin/alta-personal', altaCompuestaData);
            return response.data;
        } catch (error) {
            console.error('Fallo crítico en la transacción distribuida de alta compuesta (Saga):', error);
            throw error;
        }
    },

    async crearPersona(personaData) {
        try {
            const response = await bffClient.post('/admin/personas', personaData);
            return response.data;
        } catch (error) {
            console.error('Error de persistencia en ms-personas a través del BFF:', error);
            throw error;
        }
    },

    async listarPersonas(limit = 50, offset = 0, incluirInactivos = false, curp = null) {
        const params = { limit, offset, incluir_inactivos: incluirInactivos };
        if (curp) params['curp'] = curp.trim().toUpperCase();

        try {
            const response = await bffClient.get('/admin/personas', { params });
            return response.data;
        } catch (error) {
            console.error('Error al recuperar catálogo de identidades desde ms-personas:', error);
            throw error;
        }
    },

    async actualizarPersona(idPersona, camposModificados) {
        try {
            const response = await bffClient.patch(`/admin/personas/${idPersona}`, camposModificados);
            return response.data;
        } catch (error) {
            console.error(`Fallo al intentar parchar la entidad persona [ID: ${idPersona}]:`, error);
            throw error;
        }
    },

    async darBajaPersona(idPersona) {
        try {
            await bffClient.delete(`/admin/personas/${idPersona}`);
            return true;
        } catch (error) {
            console.error(`Fallo en cascada al eliminar la entidad persona [ID: ${idPersona}]:`, error);
            throw error;
        }
    },

    async crearUsuario(usuarioData) {
        try {
            const response = await bffClient.post('/admin/usuarios', usuarioData);
            return response.data;
        } catch (error) {
            console.error('Error al persistir la cuenta digital en ms-auth:', error);
            throw error;
        }
    },

    async listarUsuarios(limit = 50, offset = 0, incluirInactivos = false) {
        try {
            const response = await bffClient.get('/admin/usuarios', {
                params: { limit, offset, incluir_inactivos: incluirInactivos }
            });
            return response.data;
        } catch (error) {
            console.error('Error al listar cuentas de acceso digital:', error);
            throw error;
        }
    },

    async actualizarUsuario(idUsuario, usuarioCampos) {
        try {
            const response = await bffClient.patch(`/admin/usuarios/${idUsuario}`, usuarioCampos);
            return response.data;
        } catch (error) {
            console.error(`Fallo al actualizar cuenta digital [ID: ${idUsuario}]:`, error);
            throw error;
        }
    },

    async actualizarRolesUsuario(idUsuario, listaRoles) {
        try {
            const response = await bffClient.put(`/admin/usuarios/${idUsuario}/roles`, { roles: listaRoles });
            return response.data;
        } catch (error) {
            console.error(`Fallo en la re-estructuración de roles del usuario [ID: ${idUsuario}]:`, error);
            throw error;
        }
    },

    async darBajaUsuario(idUsuario) {
        try {
            await bffClient.delete(`/admin/usuarios/${idUsuario}`);
            return true;
        } catch (error) {
            console.error(`Fallo al aplicar baja lógica a la cuenta digital [ID: ${idUsuario}]:`, error);
            throw error;
        }
    },

    async listarRoles() {
        try {
            const response = await bffClient.get('/admin/roles');
            return response.data;
        } catch (error) {
            console.error('Fallo al recuperar la matriz global de roles institucionales:', error);
            throw error;
        }
    },

    async actualizarPermisosDelRol(idRol, listaPermisos) {
        try {
            const response = await bffClient.put(`/admin/roles/${idRol}/permisos`, { permisos: listaPermisos });
            return response.data;
        } catch (error) {
            console.error(`Fallo crítico al re-escribir capacidades sobre el Rol ID [${idRol}]:`, error);
            throw error;
        }
    }
};