import authStore from './store/authStore.js';
import { renderLoginView } from './views/LoginViews.js';
import { renderDashboardView } from './views/DashboardViews.js';

class AppOrchestrator {
    constructor() {
        this.appContainer = document.getElementById('app');
        if (!this.appContainer) {
            throw new Error("Error fatal de infraestructura: El contenedor '#app' no existe en el DOM.");
        }
    }

    inicializar() {
        // Enlazar el ciclo de vida reactivo del Store al contenedor principal
        authStore.subscribe((state) => {
            this.renderizarSegunEstado(state);
        });

        // Delegar la evaluación inicial al gestor central de contexto
        authStore.checkSessionContext();
    }

    renderizarSegunEstado(state) {
        this.appContainer.innerHTML = '';

        if (!state.isAuthenticated) {
            const loginNode = renderLoginView();
            this.appContainer.appendChild(loginNode);
        } else {
            const dashboardFragment = renderDashboardView(state);
            this.appContainer.appendChild(dashboardFragment);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new AppOrchestrator();
    app.inicializar();
});