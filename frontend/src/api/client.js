// src/api/client.js
import axios from 'https://cdn.jsdelivr.net/npm/axios@1.6.8/+esm'; 
// Nota: Puedes importar desde node_modules si usas Vite/Webpack: import axios from 'axios';

const bffClient = axios.create({
    baseURL: window.env?.VITE_BFF_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json'
    }
});

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

// Interceptor de Respuestas: Centralización de Errores Críticos (CapBAC/Auth)
bffClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const status = error.response.status;
            
            if (status === 401) {
                console.warn('Sesión expirada o inválida. Redireccionando a login.');
                localStorage.removeItem('bff_token');
                window.dispatchEvent(new CustomEvent('auth-expired'));
            } else if (status === 403) {
                console.error('Violación de CapBAC: El usuario no posee la capacidad requerida.');
                alert('Acceso denegado: No tienes permisos para realizar esta acción.');
            }
        } else {
            console.error('Fallo de red o caída perimetral del BFF:', error.message);
        }
        return Promise.reject(error);
    }
);

export default bffClient;