import axios from 'https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm';

const bffClient = axios.create({
    // Obligatorio: Ruta relativa para pasar a través del proxy inverso perimetral de Nginx.
    // Evita problemas de CORS y centraliza el tráfico en el puerto 80/8080 del contenedor del frontend.
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Bandera y cola para mitigar múltiples solicitudes de refresco simultáneas
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

// Interceptor de Peticiones: Inyección del Token Portador (Bearer Token)
bffClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('bff_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de Respuestas: Centralización de Errores, CapBAC y Refresco Automático de Tokens
bffClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (!error.response) {
            console.error('Fallo de red severo o caída perimetral del BFF:', error.message);
            return Promise.reject(error);
        }

        const status = error.response.status;

        // Manejo de Expiración de Token (401 Unauthorized) con reintento automático
        if (status === 401 && !originalRequest._retry) {
            if (originalRequest.url === '/auth/refresh') {
                // Si el propio endpoint de refresco falla con 401, el token de refresco caducó. Expulsión inmediata.
                localStorage.removeItem('bff_token');
                localStorage.removeItem('bff_refresh_token');
                window.dispatchEvent(new CustomEvent('auth-expired'));
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Encolar las solicitudes mientras se resuelve el refresco del token en curso
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

            const refreshToken = localStorage.getItem('bff_refresh_token');
            if (!refreshToken) {
                isRefreshing = false;
                window.dispatchEvent(new CustomEvent('auth-expired'));
                return Promise.reject(error);
            }

            try {
                // Realizar la solicitud de renovación al BFF
                const response = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken }, {
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const tokenData = response.data;
                localStorage.setItem('bff_token', tokenData.access_token);
                if (tokenData.refresh_token) {
                    localStorage.setItem('bff_refresh_token', tokenData.refresh_token);
                }

                processQueue(null, tokenData.access_token);
                isRefreshing = false;

                // Re-ejecutar la petición original fallida con el nuevo token inyectado
                originalRequest.headers['Authorization'] = `Bearer ${tokenData.access_token}`;
                return bffClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                isRefreshing = false;
                localStorage.removeItem('bff_token');
                localStorage.removeItem('bff_refresh_token');
                window.dispatchEvent(new CustomEvent('auth-expired'));
                return Promise.reject(refreshError);
            }
        }

        // Manejo de Violación de Políticas de CapBAC (403 Forbidden)
        if (status === 403) {
            console.error('Violación de CapBAC: El usuario no posee la capacidad requerida.');
            alert('Acceso denegado: Tu rol actual no cuenta con las capacidades suficientes para ejecutar esta acción.');
        }

        return Promise.reject(error);
    }
);

export default bffClient;