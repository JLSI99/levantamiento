import authStore from './store/authStore.js';
import { LoginView } from './views/LoginViews.js';
import { DashboardView } from './views/DashboardViews.js';

/**
 * Orquestador central del ciclo de vida y enrutamiento de la SPA.
 * Administra el montaje/desmontaje atómico de vistas para evitar memory leaks.
 */
class AppKernel {
    constructor() {
        this.currentViewState = null;
        this.unsubscribeStore = null;
    }

    inicializar() {
        // Suscripción al núcleo transaccional del estado de autenticación
        this.unsubscribeStore = authStore.subscribe((state) => {
            this.evaluarEstrategiaRuta(state);
        });
    }

    evaluarEstrategiaRuta(sessionState) {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        // Invariante de ciclo de vida: Desmontar limpia y formalmente la vista previa
        if (this.currentViewState && typeof this.currentViewState.unmount === 'function') {
            try {
                this.currentViewState.unmount();
            } catch (error) {
                console.error("Fallo crítico al ejecutar el desmontaje de la vista activa:", error);
            }
        }

        // Limpieza atómica del árbol de nodos y referencias en el DOM
        appContainer.innerHTML = '';

        if (sessionState.isAuthenticated) {
            // Estado Autenticado: Inyección estructural de la consola del sistema
            this.currentViewState = new DashboardView('app');
            this.currentViewState.render();
        } else {
            // Estado Anónimo o Expirado: Retorno inmediato al perímetro de seguridad
            this.currentViewState = new LoginView('app');
            this.currentViewState.render();
        }
    }

    // Destructor del Kernel ante recargas en caliente o reestructuración de la app
    shutdown() {
        if (this.unsubscribeStore) this.unsubscribeStore();
        if (this.currentViewState && typeof this.currentViewState.unmount === 'function') {
            this.currentViewState.unmount();
        }
    }
}

// Inicialización asíncrona garantizada en la carga completa del árbol DOM
document.addEventListener('DOMContentLoaded', () => {
    const kernel = new AppKernel();
    kernel.inicializar();
});