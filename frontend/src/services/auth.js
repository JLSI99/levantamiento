import bffClient from '../api/client.js';

export const authService = {
    /**
     * Transmite las credenciales de acceso perimetral cumpliendo de forma simétrica
     * el esquema Pydantic UserLoginBFF del backend (/auth/login).
     * @param {string} username - Usuario o Email Institucional capturado en interfaz.
     * @param {string} password - Contraseña en texto plano.
     * @returns {Promise<Object>} Estructura TokenBFF firmada por el backend.
     */
    async login(username, password) {
        try {
            // El backend exige estrictamente la clave 'identifier' y 'password' en un JSON plano.
            // bffClient (Axios) serializa el objeto de forma automática y asienta 'application/json'.
            const response = await bffClient.post('/auth/login', { 
                identifier: username.trim(), 
                password: password 
            });
            
            return response.data;
        } catch (error) {
            console.error('Fallo en el servicio de autenticación perimetral (Login):', error);
            throw error;
        }
    },

    /**
     * Resuelve el contexto de capacidades del usuario bajo el estándar CapBAC (/auth/me).
     * @returns {Promise<Object>} Contexto mapeado simétricamente desde UserSessionContextOut
     */
    async obtenerContextoMe() {
        try {
            const response = await bffClient.get('/auth/me');
            return response.data;
        } catch (error) {
            console.error('Incapacidad de resolver el contexto criptográfico de sesión (/me):', error);
            throw error;
        }
    },

    /**
     * Destruye de forma segura la sesión activa en el servidor perimetral.
     * @returns {Promise<boolean>}
     */
    async logout() {
        try {
            await bffClient.post('/auth/logout');
            return true;
        } catch (error) {
            console.warn('El backend no pudo procesar el flujo de logout, procediendo con limpieza local:', error);
            return false;
        }
    },

    /**
     * Esquema de entrada obligatorio para la renovación de tokens expirados.
     * Mapea de forma idéntica la clave 'refresh_token' exigida por TokenRefreshBFF.
     * @param {string} refreshToken - Token criptográfico de refresco.
     * @returns {Promise<Object>} Nuevo par de claves TokenBFF.
     */
    async refrescarSesion(refreshToken) {
        try {
            const response = await bffClient.post('/auth/refresh', { refresh_token: refreshToken });
            return response.data;
        } catch (error) {
            console.error('Fallo crítico en la cadena de refresco de tokens perimetrales:', error);
            throw error;
        }
    }
};