import axios from 'axios';
import authStore from '../store/authStore.js';

const bffClient = axios.create({
    baseURL: 'http://localhost:8000/api/v1', // URL base del Backend-for-Frontend (BFF)
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Interceptor de Salida: Inyección Dinámica del Token Criptográfico
bffClient.interceptors.request.use(
    (config) => {
        const state = authStore.getSnapshot();
        if (state.token) {
            config.headers['Authorization'] = `Bearer ${state.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor de Entrada: Manejo de Expiración de Sesión y Reintento Atómico
bffClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then(token => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return bffClient(originalRequest);
                })
                .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const state = authStore.getSnapshot();
                if (!state.refreshToken) throw new Error('No existe un token de refresco local.');

                // Llamada directa usando axios plano para evitar interceptores cíclicos
                const res = await axios.post('http://localhost:8000/api/v1/auth/refresh', {
                    refresh_token: state.refreshToken
                });

                const { access_token, refresh_token } = res.data;
                
                authStore.updateTokens(access_token, refresh_token);
                processQueue(null, access_token);
                
                originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
                return bffClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                authStore.clearSession(); // Forzar cierre de sesión local (Fail-Safe)
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default bffClient;