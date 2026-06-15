/**
 * @file auth.js
 * @description Motor de gestión de sesión local, interceptor de red y control de capacidades (CapBAC).
 * Corregido para soportar enrutamiento relativo en Live Server.
 * @version 1.0.2
 * @year 2026
 */
(function (window) {
    'use strict';

    const CONFIG = {
        BFF_BASE_URL: "http://localhost:8000/api/v1",
        ROUTE_LOGIN: "index.html",       // Modificado: Ruta relativa sin slash inicial
        ROUTE_DASHBOARD: "dashboard.html" // Modificado: Ruta relativa sin slash inicial
    };

    const STORAGE_KEYS = {
        ACCESS_TOKEN: "itsc_at",
        REFRESH_TOKEN: "itsc_rt",
        CAPABILITIES: "itsc_caps",
        USER_DATA: "itsc_user"
    };

    const AuthService = {
        
        /**
         * Coordina la autenticación del sujeto contra el endpoint correspondiente.
         * @param {string} identifier Usuario o Correo institucional.
         * @param {string} password Contraseña.
         */
        async login(identifier, password) {
            try {
                const response = await fetch(`${CONFIG.BFF_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Error crítico de autenticación HTTP ${response.status}`);
                }

                const tokens = await response.json();
                this._saveSession(tokens.access_token, tokens.refresh_token);
                
                // Forzar sincronización de capacidades inmediatamente tras obtener los tokens
                await this.sincronizarContextoSesion();
                return tokens;
            } catch (error) {
                console.error("[AuthService::login] Fallo en la autenticación:", error.message);
                throw error;
            }
        },

        /**
         * Extrae del BFF la matriz de capacidades firmadas y los datos de identidad.
         */
        async sincronizarContextoSesion() {
            try {
                const sessionData = await this.fetchWithAuth(`${CONFIG.BFF_BASE_URL}/auth/me`);
                
                if (!sessionData || !Array.isArray(sessionData.capabilities)) {
                    throw new Error("El payload de autorización no presenta una estructura indexable.");
                }

                localStorage.setItem(STORAGE_KEYS.CAPABILITIES, JSON.stringify(sessionData.capabilities));
                localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(sessionData.usuario));
            } catch (error) {
                console.error("[AuthService::sincronizarContextoSesion] Error al sincronizar contexto:", error.message);
                this.logout();
                throw error;
            }
        },

        /**
         * Intenta renovar la sesión utilizando el token de refresco local.
         */
        async renovarToken() {
            const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) throw new Error("No se localizó un token de refresco en el almacenamiento local.");

            try {
                const response = await fetch(`${CONFIG.BFF_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (!response.ok) throw new Error("La sesión del servidor ha expirado de forma no recuperable.");

                const tokens = await response.json();
                this._saveSession(tokens.access_token, tokens.refresh_token);
                return tokens.access_token;
            } catch (error) {
                this.logout();
                throw error;
            }
        },

        /**
         * Interceptor de Red: Inyecta tokens en las cabeceras HTTP y gestiona errores 401 de manera atómica.
         */
        async fetchWithAuth(url, options = {}) {
            options.headers = options.headers || {};
            let token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }

            let response = await fetch(url, options);

            // Manejo transparente del ciclo de expiración del token (HTTP 401)
            if (response.status === 401 && localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)) {
                try {
                    console.warn("[AuthInterceptor] Access token expirado. Intentando renovación en caliente...");
                    const nuevoToken = await this.renovarToken();
                    options.headers['Authorization'] = `Bearer ${nuevoToken}`;
                    response = await fetch(url, options); // Re-intento físico de la petición original
                } catch (refreshError) {
                    this.logout();
                    throw new Error("Su sesión ha expirado. Proceda a autenticarse de nuevo.");
                }
            }

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.detail || `Error en transacción autenticada: HTTP ${response.status}`);
            }

            return response.json();
        },

        /**
         * Determina si una capacidad semántica está presente en el almacenamiento local.
         * @param {string} capability Ejemplo: "personas:crear"
         */
        hasCapability(capability) {
            const capsRaw = localStorage.getItem(STORAGE_KEYS.CAPABILITIES);
            if (!capsRaw) return false;
            try {
                const caps = JSON.parse(capsRaw);
                return Array.isArray(caps) && caps.includes(capability);
            } catch (e) {
                return false;
            }
        },

        /**
         * Realiza la baja perimetral en el servidor y limpia el almacenamiento web de forma segura.
         */
        async logout() {
            try {
                const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
                if (token) {
                    await fetch(`${CONFIG.BFF_BASE_URL}/auth/logout`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            } catch (e) {
                console.warn("Fallo al contactar el endpoint de logout del BFF. Purgando almacenamiento local de manera forzada.");
            } finally {
                localStorage.clear();
                // Redirección relativa desacoplada del Host raíz
                window.location.href = CONFIG.ROUTE_LOGIN;
            }
        },

        _saveSession(accessToken, refreshToken) {
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        },

        /**
         * Evalúa de manera reactiva el estado del token local frente al árbol de rutas.
         */
        verificarRutaProtegida() {
            const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            const path = window.location.pathname;
            
            const enDashboard = path.endsWith(CONFIG.ROUTE_DASHBOARD);
            const enLogin = path.endsWith(CONFIG.ROUTE_LOGIN) || path.endsWith('/') || path.endsWith('index.html');

            if (!token && enDashboard) {
                window.location.href = CONFIG.ROUTE_LOGIN;
            } else if (token && enLogin) {
                window.location.href = CONFIG.ROUTE_DASHBOARD;
            }
        },

        /**
         * Aplica un barrido destructivo del DOM eliminando elementos protegidos que no cumplan con el token local.
         */
        procesarRenderizadoCapBAC() {
            const elementosProtegidos = document.querySelectorAll('[data-cap]');
            elementosProtegidos.forEach(elemento => {
                const capacidadRequerida = elemento.getAttribute('data-cap');
                if (!this.hasCapability(capacidadRequerida)) {
                    elemento.remove(); // Remoción física estructural del nodo
                }
            });
        }
    };

    // Validación reactiva inmediata al instanciar el hilo de ejecución en el DOM
    AuthService.verificarRutaProtegida();
    window.AuthService = AuthService;

})(window);