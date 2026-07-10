import authStore from '../store/authStore.js';
import { authService } from '../services/auth.js';
import { AsistenteAdmin } from './modules/AsistenteAdmin.js';
import { AltaBienes } from './modules/AltaBienes.js';
import { HistorialResguardos } from './modules/HistorialResguardos.js';
import { guardElement, checkAccess } from '../components/CanRender.js';

export class DashboardView {
    constructor(containerId) {
        this.containerId = containerId;
        this.activeModule = null;
        this.onLogoutBound = null;
    }

    render() {
        const root = document.getElementById(this.containerId);
        if (!root) return;

        const snapshot = authStore.getSnapshot();

        root.innerHTML = `
            <div style="display:flex; min-height:100vh;">
                <div style="width:var(--sidebar-width); background-color:var(--primary); color:white; display:flex; flex-direction:column; padding:15px; box-sizing:border-box;">
                    <div style="padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:20px;">
                        <h3 style="margin:0; font-size:16px;">Control Patrimonial</h3>
                        <p style="margin:5px 0 0 0; font-size:11px; color:rgba(255,255,255,0.7);" id="user-display-profile"></p>
                    </div>
                    <nav style="display:flex; flex-direction:column; gap:8px; flex-grow:1;" id="sidebar-nav"></nav>
                    <button id="btn-logout" style="background:transparent; border:1px solid rgba(255,255,255,0.4); color:white; padding:8px; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">Cerrar Sesión</button>
                </div>
                
                <div style="flex-grow:1; display:flex; flex-direction:column; background-color:var(--bg-main);">
                    <header style="background-color:white; padding:15px 20px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                        <h2 id="workspace-title" style="margin:0; font-size:18px; color:var(--primary);">Inicio</h2>
                        <span style="font-size:11px; background-color:var(--bg-main); padding:4px 8px; border-radius:12px; font-weight:600; color:var(--text-muted);">Nodo: TecNM Comalcalco</span>
                    </header>
                    <main id="workspace-content" style="padding:20px; flex-grow:1; box-sizing:border-box;"></main>
                </div>
            </div>
        `;

        const userProfile = document.getElementById('user-display-profile');
        if (userProfile) {
            userProfile.textContent = snapshot.user?.username || 'Operador No Identificado';
        }

        this.generarMenuSeguro(snapshot.capabilities);
        this.vincularGlobales();
        this.enrutarModuloInicial(snapshot.capabilities);
    }

    generarMenuSeguro(userCapabilities) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        
        const linksConfiguration = [
            { id: 'mis-resguardos', label: 'Mis Resguardos', caps: ['resguardos:read_personal'], view: HistorialResguardos },
            { id: 'alta-bienes', label: 'Inventariar Activo', caps: ['bienes:create'], view: AltaBienes },
            { id: 'admin-panel', label: 'Consola de Control', caps: ['usuarios:write'], view: AsistenteAdmin }
        ];

        linksConfiguration.forEach(config => {
            const btn = document.createElement('button');
            btn.id = `nav-link-${config.id}`;
            btn.textContent = config.label;
            btn.style.cssText = "background:transparent; border:none; color:rgba(255,255,255,0.8); text-align:left; padding:10px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:500; width:100%;";
            
            btn.onclick = () => {
                nav.querySelectorAll('button').forEach(b => b.style.backgroundColor = 'transparent');
                btn.style.backgroundColor = 'rgba(255,255,255,0.1)';
                this.cargarModulo(config.view, config.label);
            };

            // Envoltura reactiva no invasiva utilizando el motor optimizado de CanRender
            const guardedBtn = guardElement(config.caps, btn);
            nav.appendChild(guardedBtn);
        });
    }

    enrutarModuloInicial(capabilities) {
        const state = authStore.getSnapshot();

        // Evaluación unificada utilizando la política centralizada del sistema (Bypass de admin e inyección de contexto)
        if (checkAccess('bienes:create', state)) {
            this.cargarModulo(AltaBienes, 'Alta de Activos Fijos');
        } else if (checkAccess('resguardos:read_personal', state)) {
            this.cargarModulo(HistorialResguardos, 'Historial de Resguardos');
        } else if (checkAccess('usuarios:write', state)) {
            this.cargarModulo(AsistenteAdmin, 'Consola de Control Operativo');
        } else {
            const content = document.getElementById('workspace-content');
            if (content) {
                content.innerHTML = `<p style="font-size:12px; color:var(--text-muted);">Espacio de trabajo restringido. Su token carece de capacidades funcionales.</p>`;
            }
        }
    }

    cargarModulo(ViewClass, title) {
        if (this.activeModule && typeof this.activeModule.unmount === 'function') {
            try {
                this.activeModule.unmount();
            } catch (err) {
                console.error("Error al desmontar el módulo secundario:", err);
            }
        }

        const titleContainer = document.getElementById('workspace-title');
        if (titleContainer) titleContainer.textContent = title;

        const content = document.getElementById('workspace-content');
        if (content) content.innerHTML = '';

        this.activeModule = new ViewClass('workspace-content');
        this.activeModule.render();
    }

    vincularGlobales() {
        const logoutBtn = document.getElementById('btn-logout');
        if (!logoutBtn) return;

        this.onLogoutBound = async () => {
            try {
                logoutBtn.disabled = true;
                await authService.logout();
            } catch (err) {
                console.warn("Fallo en la invalidación remota del token en el BFF:", err);
            } finally {
                authStore.clearSession();
            }
        };

        logoutBtn.addEventListener('click', this.onLogoutBound);
    }

    unmount() {
        if (this.activeModule && typeof this.activeModule.unmount === 'function') {
            this.activeModule.unmount();
        }
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn && this.onLogoutBound) {
            logoutBtn.removeEventListener('click', this.onLogoutBound);
        }
    }
}