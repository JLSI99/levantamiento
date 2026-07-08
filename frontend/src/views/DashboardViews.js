import authStore from '../store/authStore.js';
import { authService } from '../services/auth.js';
import { AsistenteAdmin } from './modules/AsistenteAdmin.js';
import { AltaBienes } from './modules/AltaBienes.js';
import { HistorialResguardos } from './modules/HistorialResguardos.js';
import { guardElement } from '../components/CanRender.js';

export class DashboardView {
    constructor(containerId) {
        this.containerId = containerId;
        this.activeModule = null;
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
                        <p style="margin:5px 0 0 0; font-size:11px; color:rgba(255,255,255,0.7);">${snapshot.user?.username || 'Operador'}</p>
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

        this.generarMenuSeguro();
        this.vincularGlobales();
        
        // Renderizado del módulo por defecto inicial
        this.cargarModulo('mis-resguardos');
    }

    generarMenuSeguro() {
        const nav = document.getElementById('sidebar-nav');
        
        const links = [
            { id: 'mis-resguardos', label: 'Mis Resguardos', caps: ['resguardos:read_personal'], view: HistorialResguardos },
            { id: 'alta-bienes', label: 'Inventariar Activo', caps: ['bienes:create'], view: AltaBienes },
            { id: 'admin-panel', label: 'Consola de Control', caps: ['usuarios:write'], view: AsistenteAdmin }
        ];

        links.forEach(link => {
            const btn = document.createElement('button');
            btn.textContent = link.label;
            btn.style.cssText = "background:transparent; border:none; color:rgba(255,255,255,0.8); text-align:left; padding:10px; border-radius:4px; cursor:pointer; font-size:13px; font-weight:500;";
            btn.onclick = () => {
                // Limpieza visual de selección previa
                nav.querySelectorAll('button').forEach(b => b.style.backgroundColor = 'transparent');
                btn.style.backgroundColor = 'rgba(255,255,255,0.1)';
                this.cargarModulo(link.id, link.view, link.label);
            };

            // Inyección bajo el perímetro reactivo seguro CapBAC
            const guardedBtn = guardElement(link.caps, btn);
            nav.appendChild(guardedBtn);
        });
    }

    cargarModulo(id, ViewClass, title) {
        const content = document.getElementById('workspace-content');
        const titleContainer = document.getElementById('workspace-title');
        
        // Ejecución preventiva de limpieza de ataduras del módulo saliente
        if (content.firstChild && content.firstChild.__cleanupGuard) {
            content.firstChild.__cleanupGuard();
        }
        content.innerHTML = '';

        if (!ViewClass) {
            // Carga inicial por defecto automatizada
            if (id === 'mis-resguardos') {
                titleContainer.textContent = 'Historial de Resguardos';
                this.activeModule = new HistorialResguardos('workspace-content');
                this.activeModule.render();
            }
            return;
        }

        titleContainer.textContent = title;
        this.activeModule = new ViewClass('workspace-content');
        this.activeModule.render();
    }

    vincularGlobales() {
        document.getElementById('btn-logout').onclick = async () => {
            await authService.logout();
            authStore.clearSession();
        };
    }
}