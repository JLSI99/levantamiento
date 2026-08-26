import authStore from '../../store/authStore.js';
import { CrudTiposBien } from './components/crudTiposBien.js';
import { CrudActivos } from './components/crudActivos.js';

export class CrudBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // 1. Obtener estado de autenticación y permisos
        const estadoAuth = authStore.getSnapshot();
        const usuario = estadoAuth?.user;
        const capabilities = estadoAuth?.capabilities || [];
        const permisosRaw = usuario?.permisos || [];
        const esAdmin = usuario && (usuario.rol === 1 || usuario.rol_id === 1);

        // Mapeo unificado de permisos
        const permisos = {
            crear: esAdmin || permisosRaw.includes('bienes:crear') || capabilities.includes('bienes:create'),
            editar: esAdmin || permisosRaw.includes('bienes:editar') || capabilities.includes('bienes:update'),
            borrar: esAdmin || permisosRaw.includes('bienes:borrar') || capabilities.includes('bienes:delete')
        };

        // Si no tiene permisos de lectura ni escritura, bloqueamos el acceso
        if (!permisos.crear && !permisos.editar && !permisos.borrar && !esAdmin && !permisosRaw.includes('bienes:leer')) {
            container.innerHTML = `
                <div class="forbidden-container" style="padding: 20px; background: #ffebee; border: 1px solid #c62828; border-radius: 4px; margin-top: 20px; font-family: sans-serif;">
                    <h4 style="color:#c62828; margin: 0 0 10px 0; font-weight: 700;">ACCESO DENEGADO (403 FORBIDDEN)</h4>
                    <p style="font-size: 13px; color: #37474f; margin: 0;">Su token institucional no cuenta con la capacidad necesaria para acceder al módulo patrimonial.</p>
                </div>
            `;
            return;
        }

        // 2. Estructura HTML base del Orquestador
        container.innerHTML = `
            <div style="width: 100%; font-family: system-ui, -apple-system, sans-serif;">
                <!-- Control de Pestañas -->
                <div style="display: flex; gap: 10px; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px;">
                    <button id="tab-btn-activos" style="padding: 10px 20px; border: none; background: #1a237e; color: white; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Inventario de Activos (Bienes)
                    </button>
                    <button id="tab-btn-tipos" style="padding: 10px 20px; border: none; background: #e0e0e0; color: #424242; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Catálogo de Tipos de Bien
                    </button>
                </div>

                <!-- SECCIÓN 1: BIENES / ACTIVOS -->
                <div id="section-activos" style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <div id="wrapper-form-activos"></div>
                    <div id="wrapper-tabla-activos"></div>
                </div>

                <!-- SECCIÓN 2: TIPOS DE BIEN -->
                <div id="section-tipos" style="display: none; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <div id="wrapper-form-tipos"></div>
                    <div id="wrapper-tabla-tipos"></div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.initModules(permisos);
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const btnTabActivos = document.getElementById('tab-btn-activos');
        const btnTabTipos = document.getElementById('tab-btn-tipos');
        const secActivos = document.getElementById('section-activos');
        const secTipos = document.getElementById('section-tipos');

        if (btnTabActivos && btnTabTipos) {
            btnTabActivos.addEventListener('click', () => {
                btnTabActivos.style.background = '#1a237e';
                btnTabActivos.style.color = 'white';
                btnTabTipos.style.background = '#e0e0e0';
                btnTabTipos.style.color = '#424242';
                secActivos.style.display = 'grid';
                secTipos.style.display = 'none';
            }, { signal });

            btnTabTipos.addEventListener('click', () => {
                btnTabTipos.style.background = '#1a237e';
                btnTabTipos.style.color = 'white';
                btnTabActivos.style.background = '#e0e0e0';
                btnTabActivos.style.color = '#424242';
                secTipos.style.display = 'grid';
                secActivos.style.display = 'none';
            }, { signal });
        }
    }

    initModules(permisos) {
        // Inicializamos submódulos
        this.crudTiposBien = new CrudTiposBien('wrapper-form-tipos', 'wrapper-tabla-tipos', permisos);
        this.crudActivos = new CrudActivos('wrapper-form-activos', 'wrapper-tabla-activos', permisos);

        // ORQUESTACIÓN: Cuando cambian los Tipos de Bien, recargar el <select> de los Bienes
        this.crudTiposBien.onTiposLoaded = (tipos) => {
            this.crudActivos.actualizarSelectTipos(tipos);
        };
        
        this.crudTiposBien.onTiposChanged = () => {
            this.crudTiposBien.cargarDatos(); // Recargar la tabla de tipos
            this.crudActivos.cargarDatos(); // Recargar la tabla de bienes (para reflejar cambios de nombre)
        };

        // Render inicial
        this.crudTiposBien.render();
        this.crudActivos.render();
    }

    unmount() {
        this._abortController.abort();
        this.crudTiposBien?.unmount();
        this.crudActivos?.unmount();
    }
}