import { authService } from '../services/auth.js';
import authStore from '../store/auhtStore.js';
import { crearModuloAltaBienes } from './modules/AltaBienes.js';
import { crearModuloAsistenteAdministrativo } from './modules/AsistenteAdmin.js';
import { crearModuloHistorialResguardos } from './modules/HistorialResguardos.js';

export function renderDashboardView(state) {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('header');
    header.className = 'main-header';
    header.innerHTML = `
        <h1>Ecosistema de Control de Activos - TecNM</h1>
        <div style="display: flex; align-items: center; gap: 20px;">
            <span>Usuario: <strong>${state.user?.username || 'Operador'}</strong></span>
            <button id="btn-cerrar-sesion">Cerrar Sesión</button>
        </div>
    `;

    header.querySelector('#btn-cerrar-sesion').onclick = async () => {
        try {
            await authService.logout();
        } catch (e) {
            console.error('Error durante la terminación de sesión remota:', e);
        } finally {
            authStore.setState({ isAuthenticated: false, user: null, capabilities: [] });
        }
    };
    fragment.appendChild(header);

    const grid = document.createElement('main');
    grid.className = 'dashboard-grid';

    grid.appendChild(crearModuloAltaBienes());
    grid.appendChild(crearModuloAsistenteAdministrativo());
    grid.appendChild(crearModuloHistorialResguardos());

    fragment.appendChild(grid);
    return fragment;
}