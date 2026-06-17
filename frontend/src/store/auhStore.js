// src/store/authStore.js
import bffClient from '../api/client.js';

// Estado privado inicial
const state = {
    usuario: null,
    roles: [],
    capabilities: [],
    isAuthenticated: false,
    isLoaded: false
};

// Subscriptores para actualizaciones reactivas en la UI
const listeners = new Set();

const authStore = {
    // Suscribirse a cambios de estado
    subscribe(listener) {
        listeners.add(listener);
        // Ejecutar inmediatamente con el estado actual
        listener({ ...state });
        return () => listeners.delete(listener);
    },

    // Notificar a la UI
    _notify() {
        for (const listener of listeners) {
            listener({ ...state });
        }
    },

    // Sincronizar estado con el endpoint de contexto /auth/me
    async checkSessionContext() {
        const token = localStorage.getItem('bff_token');
        if (!token) {
            state.usuario = null;
            state.roles = [];
            state.capabilities = [];
            state.isAuthenticated = false;
            state.isLoaded = true;
            this._notify();
            return false;
        }

        try {
            // Invoca directamente el router auth.py -> /me
            const response = await bffClient.get('/auth/me');
            const data = response.data;

            state.usuario = data.usuario;
            state.roles = data.roles;
            state.capabilities = data.capabilities; // Almacenamos las capacidades CapBAC
            state.isAuthenticated = true;
            state.isLoaded = true;
            this._notify();
            return true;
        } catch (error) {
            state.usuario = null;
            state.roles = [];
            state.capabilities = [];
            state.isAuthenticated = false;
            state.isLoaded = true;
            this._notify();
            return false;
        }
    },

    // Login orquestado a través del BFF
    async login(username, password) {
        try {
            const response = await bffClient.post('/auth/login', { username, password });
            const tokenData = response.data; // Espera esquema schemas_auth.TokenBFF
            
            localStorage.setItem('bff_token', tokenData.access_token);
            if (tokenData.refresh_token) {
                localStorage.setItem('bff_refresh_token', tokenData.refresh_token);
            }
            
            return await this.checkSessionContext();
        } catch (error) {
            console.error('Error en las credenciales provistas al BFF:', error);
            throw error;
        }
    },

    // Cierre de sesión perimetral
    async logout() {
        try {
            await bffClient.post('/auth/logout');
        } catch (e) {
            console.warn('Cierre de sesión asentado de forma puramente perimetral.');
        } finally {
            localStorage.removeItem('bff_token');
            localStorage.removeItem('bff_refresh_token');
            state.usuario = null;
            state.roles = [];
            state.capabilities = [];
            state.isAuthenticated = false;
            this._notify();
        }
    },

    // Método utilitario síncrono para verificar una capacidad en la UI
    hasCapability(capability) {
        return state.capabilities.includes(capability);
    }
};

export default authStore;