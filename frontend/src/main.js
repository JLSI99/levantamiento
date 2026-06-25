import authStore from './store/auhtStore.js';
import { authService } from './services/auth.js';
import { renderLoginView } from './views/LoginView.js';
import { renderDashboardView } from './views/DashboardView.js';

class AppOrchestrator {
    constructor() {
        this.appContainer = document.getElementById('app');
        if (!this.appContainer) {
            throw new Error("Error fatal de infraestructura: El contenedor '#app' no existe en el DOM.");
        }
    }

    inicializar() {
        authStore.subscribe((state) => {
            this.renderizarSegunEstado(state);
        });

        this.verificarSesionExistente();
    }

    async verificarSesionExistente() {
        try {
            const contexto = await authService.obtenerContextoMe();
            authStore.setState({
                isAuthenticated: true,
                user: contexto.usuario,
                capabilities: contexto.capacidades || []
            });
        } catch (error) {
            console.log('Sin sesión activa previa, direccionando a pasarela de acceso.');
            authStore.setState({ isAuthenticated: false, user: null, capabilities: [] });
        }
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