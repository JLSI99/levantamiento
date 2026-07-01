import authStore from '../store/authStore.js';
import { crearModuloAltaBienes } from './modules/AltaBienes.js';
import { crearModuloAsistenteAdministrativo } from './modules/AsistenteAdmin.js';
import { crearModuloHistorialResguardos } from './modules/HistorialResguardos.js';

export function renderDashboardView(state) {
    const fragment = document.createDocumentFragment();

    const header = document.createElement('header');
    header.className = 'main-header';
    header.innerHTML = `
        <div class="header-container" style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 10px 20px; background: var(--bg-card); border-bottom: 1px solid var(--border);">
            <h1>Ecosistema de Control de Activos - TecNM</h1>
            <div style="display: flex; align-items: center; gap: 20px;">
                <span>Usuario: <strong>${state.usuario?.username || 'Operador'}</strong></span>
                <span class="badge-rol" style="background: var(--bg-main); padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                    ${state.roles?.[0] || 'Sin Rol'}
                </span>
                <button id="btn-cerrar-sesion" class="btn-secondary">Cerrar Sesión</button>
            </div>
        </div>
    `;

    header.querySelector('#btn-cerrar-sesion').onclick = async () => {
        try {
            await authStore.logout();
        } catch (e) {
            console.error('Excepción atrapada al desconectar la sesión:', e);
        }
    };
    fragment.appendChild(header);

    const grid = document.createElement('main');
    grid.className = 'dashboard-grid';
    grid.style.display = 'grid';
    grid.style.gap = '20px';
    grid.style.padding = '20px';

    grid.appendChild(crearModuloAsistenteAdministrativo(state));
    grid.appendChild(crearModuloAltaBienes(state));
    grid.appendChild(crearModuloHistorialResguardos(state));

    fragment.appendChild(grid);
    return fragment;
}