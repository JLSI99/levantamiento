class AuthStore {
    constructor() {
        this.listeners = new Set();
        this.state = {
            isAuthenticated: !!localStorage.getItem('tx_inv_token'),
            token: localStorage.getItem('tx_inv_token') || null,
            refreshToken: localStorage.getItem('tx_inv_refresh') || null,
            user: this._safeParse(localStorage.getItem('tx_inv_user')),
            capabilities: this._safeParse(localStorage.getItem('tx_inv_caps')) || []
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (event) => this._handleStorageChange(event));
        }
    }

    _safeParse(jsonString) {
        try {
            return jsonString ? JSON.parse(jsonString) : null;
        } catch (e) {
            console.error('Error de parseo en la recuperación del medio de almacenamiento físico:', e);
            return null;
        }
    }

    getSnapshot() {
        return structuredClone(this.state);
    }

    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getSnapshot());   
        return () => {
            this.listeners.delete(listener);
        };
    }

    emit() {
        const snapshot = this.getSnapshot();
        this.listeners.forEach(listener => {
            try {
                listener(snapshot);
            } catch (error) {
                console.error('Fallo en la ejecución de la cadena de listeners del DOM:', error);
            }
        });
    }

    setSession(accessToken, refreshToken, user, capabilities) {
        this.state = { 
            isAuthenticated: true, 
            token: accessToken, 
            refreshToken, 
            user, 
            capabilities: capabilities || [] 
        };
        localStorage.setItem('tx_inv_token', accessToken);
        localStorage.setItem('tx_inv_refresh', refreshToken);
        localStorage.setItem('tx_inv_user', JSON.stringify(user));
        localStorage.setItem('tx_inv_caps', JSON.stringify(capabilities || []));
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
        this.state = { 
            isAuthenticated: false, 
            token: null, 
            refreshToken: null, 
            user: null, 
            capabilities: [] 
        };
        localStorage.removeItem('tx_inv_token');
        localStorage.removeItem('tx_inv_refresh');
        localStorage.removeItem('tx_inv_user');
        localStorage.removeItem('tx_inv_caps');
        this.emit();
    }

    _handleStorageChange(event) {
        const keysToSync = ['tx_inv_token', 'tx_inv_refresh', 'tx_inv_user', 'tx_inv_caps'];
        if (!keysToSync.includes(event.key)) return;

        this.state = {
            isAuthenticated: !!localStorage.getItem('tx_inv_token'),
            token: localStorage.getItem('tx_inv_token') || null,
            refreshToken: localStorage.getItem('tx_inv_refresh') || null,
            user: this._safeParse(localStorage.getItem('tx_inv_user')),
            capabilities: this._safeParse(localStorage.getItem('tx_inv_caps')) || []
        };
        this.emit();
    }
}

const authStore = new AuthStore();
export default authStore;