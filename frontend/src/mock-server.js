/**
 * @file mock-server.js
 * @description Servidor de simulación perimetral alineado con la semilla del BFF (CapBAC).
 * Sincronizado al 100% con las identidades maestros de setup_db.py.
 * @version 2.1.0
 * @year 2026
 */
(function (window) {
    'use strict';

    const MOCK_BASE_URL = "http://localhost:8000/api/v1";
    const originalFetch = window.fetch;

    // Directorio de identidades reales correlacionadas con MATRIZ_ACCESO y USUARIOS_SEMILLA del Backend
    const MOCK_DB = {
        users: {
            "adminjgomez@example.com": {
                password: "Password123",
                profile: { 
                    username: "adminjgomez", 
                    email: "adminjgomez@example.com", 
                    area: "Dirección de Tecnologías / Administración Transversal" 
                },
                // Rol 1: Matriz completa de capacidades (IDs 1 al 24 de permisos_base)
                capabilities: [
                    "usuarios:crear", "usuarios:leer", "usuarios:editar", "usuarios:borrar",
                    "roles:leer", "roles:editar",
                    "personas:crear", "personas:leer", "personas:editar", "personas:borrar",
                    "bienes:crear", "bienes:leer", "bienes:editar", "bienes:borrar",
                    "resguardos:crear", "resguardos:leer", "resguardos:editar", "resguardos:borrar",
                    "ubicaciones:crear", "ubicaciones:leer", "ubicaciones:editar", "ubicaciones:borrar",
                    "departamentos:leer", "departamentos:editar"
                ]
            },
            "levantador@example.com": {
                password: "Password123",
                profile: { 
                    username: "levantador_op", 
                    email: "levantador@example.com", 
                    area: "Operaciones y Movimientos de Campo" 
                },
                // Rol 2: Mapeo exacto del backend -> IDs: 8, 12, 15, 16, 17, 20, 23
                capabilities: [
                    "personas:leer", 
                    "bienes:leer", 
                    "resguardos:crear", "resguardos:leer", "resguardos:editar", 
                    "ubicaciones:leer", 
                    "departamentos:leer"
                ]
            },
            "registrador@example.com": {
                password: "Password123",
                profile: { 
                    username: "registrador_act", 
                    email: "registrador@example.com", 
                    area: "Alta y Control Contable de Activos Públicos" 
                },
                // Rol 3: Mapeo exacto del backend -> IDs: 7, 8, 9, 10, 11, 12, 13, 14, 20, 23
                capabilities: [
                    "personas:crear", "personas:leer", "personas:editar", "personas:borrar",
                    "bienes:crear", "bienes:leer", "bienes:editar", "bienes:borrar",
                    "ubicaciones:leer", 
                    "departamentos:leer"
                ]
            },
            "revisor@example.com": {
                password: "Password123",
                profile: { 
                    username: "revisor_aud", 
                    email: "revisor@example.com", 
                    area: "Auditoría Interna / Control General" 
                },
                // Rol 4: Mapeo exacto del backend -> IDs: 2, 5, 8, 12, 16, 20, 23
                capabilities: [
                    "usuarios:leer", 
                    "roles:leer", 
                    "personas:leer", 
                    "bienes:leer", 
                    "resguardos:leer", 
                    "ubicaciones:leer", 
                    "departamentos:leer"
                ]
            },
            "resguardante@example.com": {
                password: "Password123",
                profile: { 
                    username: "resguardante_usr", 
                    email: "resguardante@example.com", 
                    area: "Personal Universitario Custodio" 
                },
                // Rol 5: Mapeo exacto del backend -> IDs: 12, 16, 20
                capabilities: [
                    "bienes:leer", 
                    "resguardos:leer", 
                    "ubicaciones:leer"
                ]
            }
        }
    };

    window.fetch = async function (url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();

        // 1. Interceptor Atómico: POST /auth/login
        if (url === `${MOCK_BASE_URL}/auth/login` && method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const targetUser = MOCK_DB.users[body.identifier];

            if (!targetUser || targetUser.password !== body.password) {
                return new Response(JSON.stringify({
                    detail: "Credenciales inválidas en el sistema unificado de resguardos."
                }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }

            // Fijación atómica en memoria volátil global para el consumo subsiguiente de /me
            window.__ACTIVE_MOCK_SESSION__ = targetUser;

            return new Response(JSON.stringify({
                access_token: `mock_jwt_token_for_${targetUser.profile.username}`,
                refresh_token: "mock_refresh_token_transversal"
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. Interceptor Atómico: GET /auth/me
        if (url === `${MOCK_BASE_URL}/auth/me` && method === 'GET') {
            const authHeader = options.headers ? (options.headers['Authorization'] || '') : '';
            if (!authHeader.startsWith('Bearer mock_')) {
                return new Response(JSON.stringify({ detail: "Acceso no autorizado. Firmas JWT inválidas." }), { status: 401 });
            }

            // Mecanismo de persistencia reactiva por recargas de página
            const activeSession = window.__ACTIVE_MOCK_SESSION__ || 
                Object.values(MOCK_DB.users).find(u => localStorage.getItem("itsc_user")?.includes(u.profile.username));

            if (!activeSession) {
                return new Response(JSON.stringify({ detail: "Sesión expirada en la memoria volátil del Mock." }), { status: 401 });
            }

            return new Response(JSON.stringify({
                usuario: activeSession.profile,
                capabilities: activeSession.capabilities
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 3. Interceptor Atómico: POST /auth/logout
        if (url === `${MOCK_BASE_URL}/auth/logout` && method === 'POST') {
            window.__ACTIVE_MOCK_SESSION__ = null;
            return new Response(JSON.stringify({ status: "success" }), { status: 200 });
        }

        // Delegación de peticiones no interceptadas hacia la pila de red nativa
        return originalFetch(url, options);
    };

    console.log(
        "%c[MockServer v2.1.0] Entorno de simulación unificado cargado.\n" +
        "Sujetos listos: Administrador, Levantador, Registrador, Revisor y Resguardante.", 
        "color: #00ffaa; font-weight: bold;"
    );
})(window);