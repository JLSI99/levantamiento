import authStore from './store/authStore.js';
import { LoginView } from './views/LoginViews.js';
import { DashboardView } from './views/DashboardViews.js';

/**
 * Hilo conductor y orquestador táctico del ciclo de vida de la SPA.
 * Garantiza la resiliencia en la alternancia de vistas ante mutaciones del token.
 */
class AppKernel {
    constructor() {
        this.currentViewState = null;
    }

    inicializar() {
        // Suscripción al núcleo transaccional del estado de autenticación
        authStore.subscribe((state) => {
            this.evaluarEstrategiaRuta(state);
        });
    }

    evaluarEstrategiaRuta(sessionState) {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        // Limpieza atómica preventiva del árbol del DOM en re-enrutamiento
        if (appContainer.firstChild && appContainer.firstChild.__cleanupGuard) {
            appContainer.firstChild.__cleanupGuard();
        }
        appContainer.innerHTML = '';

        if (sessionState.isAuthenticated) {
            // Usuario con sesión activa -> Inyección del entorno del sistema
            this.currentViewState = new DashboardView('app');
            this.currentViewState.render();
        } else {
            // Sesión nula o expirada -> Redirección inmediata al perímetro de login
            this.currentViewState = new LoginView('app');
            this.currentViewState.render();
        }
    }
}

// Inicialización asíncrona diferida del Kernel de presentación
document.addEventListener('DOMContentLoaded', () => {
    const kernel = new AppKernel();
    kernel.inicializar();
});