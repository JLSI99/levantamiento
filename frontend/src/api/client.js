import axios from 'https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm';
import authStore from '../store/authStore.js';

const BASE_URL_BFF = '/api/v1';

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

bffClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            
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

                const res = await axios.post(`${BASE_URL_BFF}/auth/refresh`, {
                    refresh_token: state.refreshToken
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                });

                const { access_token, refresh_token } = res.data;
                
                authStore.updateTokens(access_token, refresh_token);
                
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