/**
 * Motor reactivo atómico para el control de la sesión del usuario.
 * Provee almacenamiento persistente e hilo de difusión síncrono para mutaciones de estado.
 */
class AuthStore {
    constructor() {
        this.listeners = new Set();
        this.state = {
            isAuthenticated: !!localStorage.getItem('tx_inv_token'),
            token: localStorage.getItem('tx_inv_token') || null,
            refreshToken: localStorage.getItem('tx_inv_refresh') || null,
            user: JSON.parse(localStorage.getItem('tx_inv_user')) || null,
            capabilities: JSON.parse(localStorage.getItem('tx_inv_caps')) || []
        };
    }

    getSnapshot() {
        return { ...this.state };
    }

    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getSnapshot()); // Ejecución inmediata en hidratación inicial
        return () => {
            this.listeners.delete(listener);
        };
    }

    emit() {
        const snapshot = this.getSnapshot();
        this.listeners.forEach(listener => listener(snapshot));
    }

    setSession(accessToken, refreshToken, user, capabilities) {
        this.state = { isAuthenticated: true, token: accessToken, refreshToken, user, capabilities };
        localStorage.setItem('tx_inv_token', accessToken);
        localStorage.setItem('tx_inv_refresh', refreshToken);
        localStorage.setItem('tx_inv_user', JSON.stringify(user));
        localStorage.setItem('tx_inv_caps', JSON.stringify(capabilities));
        this.emit();
    }

    updateTokens(accessToken, refreshToken) {
        this.state.token = accessToken;
        this.state.refreshToken = refreshToken;
        localStorage.setItem('tx_inv_token', accessToken);
        localStorage.setItem('tx_inv_refresh', refreshToken);
        this.emit();
    }

    clearSession() {
        this.state = { isAuthenticated: false, token: null, refreshToken: null, user: null, capabilities: [] };
        localStorage.removeItem('tx_inv_token');
        localStorage.removeItem('tx_inv_refresh');
        localStorage.removeItem('tx_inv_user');
        localStorage.removeItem('tx_inv_caps');
        this.emit();
    }
}

const authStore = new AuthStore();
export default authStore;