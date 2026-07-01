import bffClient from '../api/client.js';

export const authService = {
    async login(username, password) {
        try {
            const response = await bffClient.post('/auth/login', { username, password });
            return response.data;
        } catch (error) {
            console.error('Fallo en el servicio de autenticación perimetral (Login):', error);
            throw error;
        }
    },

    async obtenerContextoMe() {
        try {
            const response = await bffClient.get('/auth/me');
            return response.data;
        } catch (error) {
            console.error('Incapacidad de resolver el contexto criptográfico de sesión (/me):', error);
            throw error;
        }
    },

    async logout() {
        try {
            await bffClient.post('/auth/logout');
            return true;
        } catch (error) {
            console.warn('El backend no pudo procesar el flujo de logout, procediendo con limpieza local:', error);
            return false;
        }
    },

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