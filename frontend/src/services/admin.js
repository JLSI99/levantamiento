// frontend/src/services/admin.js
import bffClient from '../api/client.js';

export const adminService = {
    // ==============================================================================
    // GESTIÓN DE IDENTIDADES (Rutas hacia ms-personas a través del BFF)
    // ==============================================================================
    
    /**
     * Registra un nuevo individuo en el censo demográfico de la institución.
     * @param {Object} personaData - { curp, nombres, apellidos }
     * @returns {Promise<Object>} PersonaOutBFF
     */
    async crearPersona(personaData) {
        try {
            const response = await bffClient.post('/admin/personas', personaData);
            return response.data;
        } catch (error) {
            console.error('Error de persistencia en ms-personas a través del BFF:', error);
            throw error;
        }
    },

    /**
     * Recupera la lista paginada de personas del sistema con filtros opcionales.
     * @param {number} limit - Cantidad de registros por página.
     * @param {number} offset - Desplazamiento de registros (paginación).
     * @param {boolean} incluirInactivos - Bandera para recuperar registros dados de baja.
     * @param {string|null} curp - Filtro por clave única de registro de población.
     * @returns {Promise<Object>} PersonaPaginatedOutBFF
     */
    async listarPersonas(limit = 50, offset = 0, incluirInactivos = false, curp = null) {
        const params = { limit, offset, incluir_inactivos: incluirInactivos };
        if (curp) params['curp'] = curp;

        try {
            const response = await bffClient.get('/admin/personas', { params });
            return response.data;
        } catch (error) {
            console.error('Error al recuperar catálogo de identidades desde ms-personas:', error);
            throw error;
        }
    },

    /**
     * Aplica una actualización parcial a los datos demográficos de una persona.
     * @param {string} idPersona - UUID de la entidad persona física.
     * @param {Object} camposModificados - Atributos opcionales a modificar.
     * @returns {Promise<Object>} PersonaOutBFF
     */
    async actualizarPersona(idPersona, camposModificados) {
        try {
            const response = await bffClient.patch(`/admin/personas/${idPersona}`, camposModificados);
            return response.data;
        } catch (error) {
            console.error(`Fallo al intentar parchar la entidad persona [ID: ${idPersona}]:`, error);
            throw error;
        }
    },

    /**
     * Ejecuta una baja lógica o eliminación de un registro de identidad.
     * @param {string} idPersona - UUID de la persona.
     * @returns {Promise<boolean>} True si ms-personas procesó la baja de forma exitosa.
     */
    async darBajaPersona(idPersona) {
        try {
            await bffClient.delete(`/admin/personas/${idPersona}`);
            return true;
        } catch (error) {
            console.error(`Fallo en cascada al eliminar la entidad persona [ID: ${idPersona}]:`, error);
            throw error;
        }
    },

    // ==============================================================================
    // GESTIÓN DE CUENTAS DE ACCESO (Rutas hacia ms-auth a través del BFF)
    // ==============================================================================

    /**
     * Genera una credencial digital y un buzón de acceso enlazado a una identidad física por CURP.
     * @param {Object} usuarioData - { username, email, password, curp }
     * @returns {Promise<Object>} UserOutBFF
     */
    async crearUsuario(usuarioData) {
        try {
            const response = await bffClient.post('/admin/usuarios', usuarioData);
            return response.data;
        } catch (error) {
            console.error('Error al persistir la cuenta digital en ms-auth:', error);
            throw error;
        }
    },

    /**
     * Recupera el catálogo de usuarios de acceso al sistema.
     * @param {number} limit - Paginación: tope.
     * @param {number} offset - Paginación: base.
     * @param {boolean} incluirInactivos - Filtro de estados de cuenta.
     * @returns {Promise<Object>} UserPaginatedOutBFF
     */
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

    /**
     * Modifica parámetros base del usuario (email, username o estado de activación).
     * @param {string} idUsuario - UUID de la cuenta de acceso en ms-auth.
     * @param {Object} usuarioCampos - Campos a actualizar.
     * @returns {Promise<Object>} UserOutBFF
     */
    async actualizarUsuario(idUsuario, usuarioCampos) {
        try {
            const response = await bffClient.patch(`/admin/usuarios/${idUsuario}`, usuarioCampos);
            return response.data;
        } catch (error) {
            console.error(`Fallo al actualizar cuenta digital [ID: ${idUsuario}]:`, error);
            throw error;
        }
    },

    /**
     * Re-asigna un set explícito de roles de seguridad a una cuenta de usuario.
     * @param {string} idUsuario - UUID del usuario en ms-auth.
     * @param {Array<string>} listaRoles - Array plano con los nombres de los nuevos roles (ej: ['revisor', 'capturista']).
     * @returns {Promise<Object>} UserOutBFF
     */
    async actualizarRolesUsuario(idUsuario, listaRoles) {
        try {
            // Refleja el endpoint @router.put("/usuarios/{id_usuario}/roles")
            const response = await bffClient.put(`/admin/usuarios/${idUsuario}/roles`, {
                roles: listaRoles
            });
            return response.data;
        } catch (error) {
            console.error(`Fallo en la re-estructuración de roles del usuario [ID: ${idUsuario}]:`, error);
            throw error;
        }
    },

    /**
     * Revoca los accesos del usuario y cambia su estado a inactivo de forma permanente.
     * @param {string} idUsuario - UUID del usuario.
     * @returns {Promise<boolean>} True ante respuesta HTTP 204 No Content.
     */
    async darBajaUsuario(idUsuario) {
        try {
            await bffClient.delete(`/admin/usuarios/${idUsuario}`);
            return true;
        } catch (error) {
            console.error(`Fallo al aplicar baja lógica a la cuenta digital [ID: ${idUsuario}]:`, error);
            throw error;
        }
    },

    // ==============================================================================
    // CONTROL DE ROLES Y PERMISOS GLOBAL (Políticas CapBAC del Motor ms-auth)
    // ==============================================================================

    /**
     * Obtiene el listado de roles registrados y sus respectivos mapeos de permisos.
     * @returns {Promise<Array>} List<schemas.RolOutBFF>
     */
    async listarRoles() {
        try {
            const response = await bffClient.get('/admin/roles');
            return response.data;
        } catch (error) {
            console.error('Fallo al recuperar la matriz global de roles institucionales:', error);
            throw error;
        }
    },

    /**
     * Reescribe de forma atómica la lista de capacidades y permisos asignados a un rol específico.
     * @param {number} idRol - Identificador numérico secuencial del rol objetivo.
     * @param {Array<string>} listaPermisos - Array de capacidades (ej: ['bienes:crear', 'bienes:leer']).
     * @returns {Promise<Array>} List<schemas.PermisoOutBFF>
     */
    async actualizarPermisosDelRol(idRol, listaPermisos) {
        try {
            // Refleja el endpoint @router.put("/roles/{id_rol}/permisos")
            const response = await bffClient.put(`/admin/roles/${idRol}/permisos`, {
                permisos: listaPermisos
            });
            return response.data;
        } catch (error) {
            console.error(`Fallo crítico al re-escribir capacidades sobre el Rol ID [${idRol}]:`, error);
            throw error;
        }
    }
};