import authStore from '/src/core/store/authStore.js';
import { LoginView } from '/src/modules/LoginViews.js';
import { DashboardView } from '/src/modules/DashboardViews.js';

class AppKernel {
    constructor() {
        this.currentViewState = null;
        this.unsubscribeStore = null;
    }

    inicializar() {
        const initialState = authStore.getState ? authStore.getState() : { isAuthenticated: false };
        this.evaluarEstrategiaRuta(initialState);

        this.unsubscribeStore = authStore.subscribe((state) => {
            this.evaluarEstrategiaRuta(state);
        });
    }

    evaluarEstrategiaRuta(sessionState) {
        const appContainer = document.getElementById('app');
        if (!appContainer) {
            console.error("[AppKernel] Invariante violado: DOM target '#app' no encontrado.");
            return;
        }

        if (this.currentViewState && typeof this.currentViewState.unmount === 'function') {
            try {
                this.currentViewState.unmount();
            } catch (error) {
                console.error("[AppKernel] Fallo crítico al desmontar la vista activa:", error);
            }
        }

        appContainer.innerHTML = '';

        try {
            if (sessionState && sessionState.isAuthenticated) {
                this.currentViewState = new DashboardView('app');
            } else {
                this.currentViewState = new LoginView('app');
            }
            
            this.currentViewState.render();
            
        } catch (error) {
            console.error("[AppKernel] Fallo en el pipeline de renderizado (Mounting):", error);
            appContainer.innerHTML = `<div style="color:red; padding: 20px;">Error fatal de renderizado. Revisa la consola.</div>`;
        }
    }

    shutdown() {
        if (this.unsubscribeStore) this.unsubscribeStore();
        if (this.currentViewState && typeof this.currentViewState.unmount === 'function') {
            this.currentViewState.unmount();
        }
        this.currentViewState = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const kernel = new AppKernel();
    kernel.inicializar();

});