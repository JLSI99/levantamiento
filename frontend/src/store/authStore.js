import { authService } from '../services/auth.js';

const state = {
    usuario: null,
    roles: [],
    capabilities: [],
    isAuthenticated: false,
    isLoaded: false
};

const listeners = new Set();

const authStore = {
    /**
     * @param {Function} listener 
     * @returns {Function} 
     */
    subscribe(listener) {
        listeners.add(listener);
        listener({ ...state });
        return () => listeners.delete(listener);
    },

    /**
     * @private
     */
    _notify() {
        const stateCopy = { ...state };
        for (const listener of listeners) {
            listener(stateCopy);
        }
    },

    /**
     * @param {Object} newState 
     */
    setState(newState) {
        Object.assign(state, newState);
        this._notify();
    },

    /**
     * Resuelve de forma centralizada la sesión contra el esquema UserSessionContextOut del BFF.
     * @returns {Promise<boolean>}
     */
    async checkSessionContext() {
        const token = localStorage.getItem('bff_token');
        if (!token) {
            this.clearLocalSession();
            return false;
        }

        try {
            const data = await authService.obtenerContextoMe();
            // Mapeo simétrico del payload UserSessionContextOut
            this.setState({
                usuario: data.usuario,
                roles: data.roles,
                capabilities: data.capabilities,
                isAuthenticated: true,
                isLoaded: true
            });
            return true;
        } catch (error) {
            this.clearLocalSession();
            return false;
        }
    },

    /**
     * Operación atómica de autenticación.
     * @param {string} username 
     * @param {string} password 
     */
    async login(username, password) {
        try {
            const tokenData = await authService.login(username, password);
            
            // Seteo de tokens basado en las claves de TokenBFF
            localStorage.setItem('bff_token', tokenData.access_token);
            if (tokenData.refresh_token) {
                localStorage.setItem('bff_refresh_token', tokenData.refresh_token);
            }
            
            return await this.checkSessionContext();
        } catch (error) {
            this.clearLocalSession();
            throw error;
        }
    },

    async logout() {
        try {
            await authService.logout();
        } catch (e) {
            console.warn('Cierre de sesión remoto fallido; purgando estado local de forma restrictiva.');
        } finally {
            this.clearLocalSession();
        }
    },

    clearLocalSession() {
        localStorage.removeItem('bff_token');
        localStorage.removeItem('bff_refresh_token');
        this.setState({
            usuario: null,
            roles: [],
            capabilities: [],
            isAuthenticated: false,
            isLoaded: true
        });
    },

    /**
     * Interceptor lógico para protección de rutas y renderizado CapBAC.
     * @param {string} capability 
     * @returns {boolean}
     */
    hasCapability(capability) {
        return state.capabilities.includes(capability);
    }
};

// Escucha perimetral de caducidad del token (disparado por los interceptores de red)
window.addEventListener('auth-expired', () => {
    authStore.clearLocalSession();
});

export default authStore;