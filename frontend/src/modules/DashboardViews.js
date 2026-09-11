import authStore from '/src/core/store/authStore.js';
import { authService } from '/src/services/auth.js';
import { CrudUsuariosPersonas } from '/src/modules/usuariosPersonas/crudUsuariosPersonas.js';
import { CrudUbicaciones } from '/src/modules/ubicaciones/crudUbicaciones.js';
import { CrudBienes } from '/src/modules/bienes/crudBienes.js';
import { HistorialResguardos } from '/src/modules/resguardos/crudResguardos.js';
import { checkAccess } from '/src/core/security/CanRender.js';

const ROUTE_REGISTRY = [
    {
        id: "usuarios_personas",
        label: "Usuarios / Personas",
        caps: ["usuarios:crear", "personas:crear"],
        matchPolicy: "ALL", // Requiere ambas capacidades (Solo Admin)
        view: CrudUsuariosPersonas
    },
    {
        id: "ubicaciones",
        label: "Ubicaciones",
        caps: ["ubicaciones:crear"],
        matchPolicy: "ANY", // Solo Admin tiene ubicaciones:crear
        view: CrudUbicaciones
    },
    {
        id: "bienes",
        label: "Bienes",
        caps: ["bienes:crear", "bienes:leer"],
        matchPolicy: "ANY", 
        view: CrudBienes
    },
    {
        id: "resguardos",
        label: "Resguardos/Custodio",
        caps: ["resguardos:crear", "MisResguardos:leer"],
        matchPolicy: "ANY", // Admin/Levantador entran por crear, Resguardante entra por MisResguardos
        view: HistorialResguardos
    }
];

export class DashboardView {
    constructor(containerId) {
        this.containerId = containerId;
        this.activeModule = null;
        this.onLogoutBound = null;
    }

    /**
     * Valida si el snapshot satisface las capacidades requeridas por la ruta.
     */
    tieneAccesoARuta(routeConfig, snapshot) {
        if (!routeConfig.caps || routeConfig.caps.length === 0) return true;

        if (routeConfig.matchPolicy === "ALL") {
            return routeConfig.caps.every(cap => checkAccess(cap, snapshot));
        }
        // Fallback por defecto: policy "ANY"
        return routeConfig.caps.some(cap => checkAccess(cap, snapshot));
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

        const rutasPermitidas = ROUTE_REGISTRY.filter(route => this.tieneAccesoARuta(route, snapshot));

        this.generarMenuSeguro(rutasPermitidas);
        this.vincularGlobales();
        this.enrutarModuloInicial(rutasPermitidas);
    }

    generarMenuSeguro(rutasPermitidas) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;
        nav.innerHTML = ''; 

        rutasPermitidas.forEach(config => {
            const btn = document.createElement('button');
            btn.id = `nav-link-${config.id}`;
            btn.textContent = config.label;
            btn.style.cssText = "background:transparent; border:none; color:rgba(255,255,255,0.8); text-align:left; padding:10px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:500; width:100%; transition: background 0.2s;";
            
            btn.onclick = () => {
                this.seleccionarBotonMenu(btn);
                this.cargarModulo(config.view, config.label);
            };

            nav.appendChild(btn);
        });
    }

    enrutarModuloInicial(rutasPermitidas) {
        if (rutasPermitidas.length > 0) {
            const primeraRuta = rutasPermitidas[0];
            this.cargarModulo(primeraRuta.view, primeraRuta.label);

            const activeBtn = document.getElementById(`nav-link-${primeraRuta.id}`);
            if (activeBtn) {
                this.seleccionarBotonMenu(activeBtn);
            }
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