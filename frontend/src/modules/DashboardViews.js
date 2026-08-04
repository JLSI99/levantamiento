import authStore from '../store/authStore.js';
import { authService } from '../services/auth.js';
import { CrudUsuariosPersonas } from './usuariosPersonas/crudUsuariosPersonas.js';
import { CrudUbicaciones } from './ubicaciones/crudUbicaciones.js';
import { CrudBienes } from './bienes/crudBienes.js';
import { CrudResguardos } from './resguardos/crudResguardos.js';
import { guardElement, checkAccess } from '../core/security/CanRender.js';

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
                <div style="width:var(--sidebar-width, 260px); background-color:var(--primary, #1a365d); color:white; display:flex; flex-direction:column; padding:15px; box-sizing:border-box;">
                    <div style="padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:20px;">
                        <h3 style="margin:0; font-size:16px;">Control Patrimonial</h3>
                        <p style="margin:5px 0 0 0; font-size:11px; color:rgba(255,255,255,0.7);" id="user-display-profile"></p>
                    </div>
                    <nav style="display:flex; flex-direction:column; gap:8px; flex-grow:1;" id="sidebar-nav"></nav>
                    <button id="btn-logout" style="background:transparent; border:1px solid rgba(255,255,255,0.4); color:white; padding:8px; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">Cerrar Sesión</button>
                </div>
                
                <div style="flex-grow:1; display:flex; flex-direction:column; background-color:var(--bg-main, #f7fafc);">
                    <header style="background-color:white; padding:15px 20px; border-bottom:1px solid var(--border-color, #e2e8f0); display:flex; justify-content:space-between; align-items:center;">
                        <h2 id="workspace-title" style="margin:0; font-size:18px; color:var(--primary, #1a365d);">Inicio</h2>
                        <span style="font-size:11px; background-color:var(--bg-main, #f7fafc); padding:4px 8px; border-radius:12px; font-weight:600; color:var(--text-muted, #718096);">Nodo: TecNM Comalcalco</span>
                    </header>
                    <main id="workspace-content" style="padding:20px; flex-grow:1; box-sizing:border-box;"></main>
                </div>
            </div>
        `;

        const userProfile = document.getElementById('user-display-profile');
        if (userProfile) {
            userProfile.textContent = snapshot.user?.username || 'Operador No Identificado';
        }

        this.generarMenuSeguro();
        this.vincularGlobales();
        this.enrutarModuloInicial(snapshot);
    }

    generarMenuSeguro() {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        
        const linksConfiguration = [

    {
        id: "usuarios", label: "Usuarios", caps: ["usuarios:leer"], view: CrudUsuariosPersonas
    },
    {
        id: "personas", label: "Personas", caps: ["personas:leer"], view: CrudUsuariosPersonas
    },
    {
        id: "ubicaciones", label: "Ubicaciones", caps: ["ubicaciones:leer"], view: CrudUbicaciones
    },
    {
        id: "bienes",
        label: "Bienes",
        caps: ["bienes:leer"],
        view: CrudBienes
    },
    {
        id: "resguardos", label: "Resguardos", caps: ["resguardos:leer"], view: CrudResguardos
    }

];

        linksConfiguration.forEach(config => {
            const btn = document.createElement('button');
            btn.id = `nav-link-${config.id}`;
            btn.textContent = config.label;
            btn.style.cssText = "background:transparent; border:none; color:rgba(255,255,255,0.8); text-align:left; padding:10px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:500; width:100%; transition: background 0.2s;";
            
            btn.onclick = () => {
                this.seleccionarBotonMenu(btn);
                this.cargarModulo(config.view, config.label);
            };

            const guardedBtn = guardElement(config.caps, btn);
            
            if (guardedBtn) {
                nav.appendChild(guardedBtn);
            }
        });
    }

    seleccionarBotonMenu(targetButton) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        nav.querySelectorAll('button').forEach(b => {
            b.style.backgroundColor = 'transparent';
            b.style.color = 'rgba(255,255,255,0.8)';
        });
        if (targetButton) {
            targetButton.style.backgroundColor = 'rgba(255,255,255,0.15)';
            targetButton.style.color = '#ffffff';
        }
    }

    enrutarModuloInicial(snapshot) {

    let initialView = null;
    let initialTitle = '';
    let targetLinkId = '';

    if (checkAccess('usuarios:leer', snapshot)) {

        initialView = CrudUsuariosPersonas;
        initialTitle = 'Usuarios';
        targetLinkId = 'nav-link-usuarios';

    } else if (checkAccess('personas:leer', snapshot)) {

        initialView = CrudUsuariosPersonas;
        initialTitle = 'Personas';
        targetLinkId = 'nav-link-personas';

    } else if (checkAccess('ubicaciones:leer', snapshot)) {

        initialView = CrudUbicaciones;
        initialTitle = 'Ubicaciones';
        targetLinkId = 'nav-link-ubicaciones';

    } else if (checkAccess('bienes:leer', snapshot)) {

        initialView = CrudBienes;
        initialTitle = 'Bienes';
        targetLinkId = 'nav-link-bienes';

    } else if (checkAccess('resguardos:leer', snapshot)) {

        initialView = CrudResguardos;
        initialTitle = 'Resguardos';
        targetLinkId = 'nav-link-resguardos';

    }

    if (initialView) {

        this.cargarModulo(initialView, initialTitle);

        setTimeout(() => {

            const activeBtn = document.getElementById(targetLinkId);

            if (activeBtn) {
                this.seleccionarBotonMenu(activeBtn);
            }

        }, 50);

    } else {

        const content = document.getElementById('workspace-content');

        if (content) {

            content.innerHTML = `
                <div style="background:white;padding:20px;border-radius:6px;border:1px solid var(--border-color,#e2e8f0);">
                    <p style="margin:0;">
                        Su cuenta no tiene permisos para acceder a ningún módulo.
                    </p>
                </div>
            `;

        }

    }

}

    cargarModulo(ViewClass, title) {
        if (this.activeModule && typeof this.activeModule.unmount === 'function') {
            try {
                this.activeModule.unmount();
            } catch (err) {
                console.error("Error al de-indexar el módulo secundario:", err);
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