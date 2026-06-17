// frontend/src/services/auth.js
import bffClient from '../api/client.js';

export const authService = {
    /**
     * Envía las credenciales crudas a la pasarela del BFF para iniciar sesión.
     * @param {string} username - Nombre de usuario de la cuenta.
     * @param {string} password - Contraseña en texto plano.
     * @returns {Promise<Object>} TokenBFF: { access_token, refresh_token, token_type }
     */
    async login(username, password) {
        try {
            const response = await bffClient.post('/auth/login', { username, password });
            // El backend retorna schemas_auth.TokenBFF
            return response.data;
        } catch (error) {
            console.error('Fallo en el servicio de autenticación perimetral (Login):', error);
            throw error;
        }
    },

    /**
     * Recupera la identidad y el set atómico de capacidades (CapBAC) del usuario actual.
     * Este endpoint valida el token internamente contra ms-auth.
     * @returns {Promise<Object>} Contexto: { usuario: {...}, roles: [...], capabilities: [...] }
     */
    async obtenerContextoMe() {
        try {
            const response = await bffClient.get('/auth/me');
            // El backend retorna schemas_auth.ContextoUsuarioBFF
            return response.data;
        } catch (error) {
            console.error('Incapacidad de resolver el contexto criptográfico de sesión (/me):', error);
            throw error;
        }
    },

    /**
     * Invalida de forma síncrona/asíncrona la sesión en el servidor BFF.
     * @returns {Promise<boolean>} True si el asentamiento fue exitoso.
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
     * Solicita una renovación del token de acceso utilizando un token de refresco válido.
     * @param {string} refreshToken - Token criptográfico de refresco.
     * @returns {Promise<Object>} Nuevo TokenBFF.
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