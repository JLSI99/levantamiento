import axios from 'https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm';
import authStore from '../store/authStore.js';

const BASE_URL_BFF = 'http://localhost:8081/api/v1';

const bffClient = axios.create({
    baseURL: BASE_URL_BFF,
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

// =========================================================================
// INTERCEPTOR DE PETICIONES (Inyección de Estado de Sesión)
// =========================================================================
bffClient.interceptors.request.use(
    (config) => {
        const state = authStore.getSnapshot();
        if (state.token) {
            config.headers = config.headers || {};
            config.headers['Authorization'] = `Bearer ${state.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// =========================================================================
// INTERCEPTOR DE RESPUESTAS (Ciclo de Vida de Refresco de Token / Concurrencia)
// =========================================================================
bffClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Validar el código de error 401 HTTP sin caer en loops infinitos de reintentos
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            
            // Si ya existe una petición de refresco en vuelo, encolar los demás requests concurrentes
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                .then(token => {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return bffClient(originalRequest);
                })
                .catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const state = authStore.getSnapshot();
                if (!state.refreshToken) {
                    throw new Error('Invariante de sesión roto: No existe un token de refresco local.');
                }

                // Sincronización de Red: Apuntar a la variable dinámica con puerto 8081
                const res = await axios.post(`${BASE_URL_BFF}/auth/refresh`, {
                    refresh_token: state.refreshToken
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                });

                const { access_token, refresh_token } = res.data;
                
                // Actualizar la máquina de estados e invalidar instantáneas previas
                authStore.updateTokens(access_token, refresh_token);
                
                // Resolver de forma masiva la cola de promesas en espera con el nuevo JWT
                processQueue(null, access_token);
                
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
                return bffClient(originalRequest);
                
            } catch (refreshError) {
                processQueue(refreshError, null);
                authStore.clearSession();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default bffClient;