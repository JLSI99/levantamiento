import authStore from './store/authStore.js';
import { LoginView } from './views/LoginViews.js';
import { DashboardView } from './views/DashboardViews.js';

class AppKernel {
    constructor() {
        this.currentViewState = null;
        this.unsubscribeStore = null;
    }

    inicializar() {
        this.unsubscribeStore = authStore.subscribe((state) => {
            this.evaluarEstrategiaRuta(state);
        });
    }

    evaluarEstrategiaRuta(sessionState) {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        if (this.currentViewState && typeof this.currentViewState.unmount === 'function') {
            try {
                this.currentViewState.unmount();
            } catch (error) {
                console.error("Fallo crítico al ejecutar el desmontaje de la vista activa:", error);
            }
        }

        appContainer.innerHTML = '';

        if (sessionState.isAuthenticated) {
            this.currentViewState = new DashboardView('app');
            this.currentViewState.render();
        } else {
            this.currentViewState = new LoginView('app');
            this.currentViewState.render();
        }
    }

    shutdown() {
        if (this.unsubscribeStore) this.unsubscribeStore();
        if (this.currentViewState && typeof this.currentViewState.unmount === 'function') {
            this.currentViewState.unmount();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const kernel = new AppKernel();
    kernel.inicializar();
});