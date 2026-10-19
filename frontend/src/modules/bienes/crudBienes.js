import authStore from '/src/core/store/authStore.js';
import { CrudTiposBien } from '/src/modules/bienes/components/crudTiposBien.js';
import { CrudActivos } from '/src/modules/bienes/components/crudActivos.js';
import { CrudTagsBien } from '/src/modules/bienes/components/crudTagsBien.js';

export class CrudBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this._abortController = new AbortController();

        this.crudTiposBien = null;
        this.crudActivos = null;
        this.crudTagsBien = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const estadoAuth = authStore.getSnapshot();
        const usuario = estadoAuth?.user;
        const capabilities = estadoAuth?.capabilities || [];
        const permisosRaw = usuario?.permisos || [];
        const esAdmin = usuario && (usuario.rol === 1 || usuario.rol_id === 1);

        const permisos = {
            crear: esAdmin || permisosRaw.includes('bienes:crear') || capabilities.includes('bienes:crear'),
            editar: esAdmin || permisosRaw.includes('bienes:editar') || capabilities.includes('bienes:editar'),
            borrar: esAdmin || permisosRaw.includes('bienes:borrar') || capabilities.includes('bienes:borrar'),
            leer: esAdmin || permisosRaw.includes('bienes:leer') || capabilities.includes('bienes:leer')
        };

        if (!permisos.crear && !permisos.editar && !permisos.borrar && !permisos.leer) {
            container.innerHTML = `
                <div class="forbidden-container" style="padding: 20px; background: #ffebee; border: 1px solid #c62828; border-radius: 4px; margin-top: 20px; font-family: sans-serif;">
                    <h4 style="color:#c62828; margin: 0 0 10px 0; font-weight: 700;">ACCESO DENEGADO (403 FORBIDDEN)</h4>
                    <p style="font-size: 13px; color: #37474f; margin: 0;">Su token institucional no cuenta con la capacidad necesaria para acceder al módulo patrimonial.</p>
                </div>
            `;
            return;
        }

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
                    <button id="tab-btn-tags" style="padding: 10px 20px; border: none; background: #e0e0e0; color: #424242; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Catálogo de Etiquetas (Tags)
                    </button>
                </div>

                <!-- Sección 1: Activos -->
                <div id="section-activos" style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <div id="wrapper-form-activos"></div>
                    <div id="wrapper-tabla-activos"></div>
                </div>

                <!-- Sección 2: Tipos de Bien -->
                <div id="section-tipos" style="display: none; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <div id="wrapper-form-tipos"></div>
                    <div id="wrapper-tabla-tipos"></div>
                </div>

                <!-- Sección 3: Etiquetas (Tags) -->
                <div id="section-tags" style="display: none; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <div id="wrapper-form-tags"></div>
                    <div id="wrapper-tabla-tags"></div>
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
        const btnTabTags = document.getElementById('tab-btn-tags');

        const secActivos = document.getElementById('section-activos');
        const secTipos = document.getElementById('section-tipos');
        const secTags = document.getElementById('section-tags');

        const alternarPestana = (activa) => {
            const tabs = [
                { btn: btnTabActivos, sec: secActivos, key: 'activos' },
                { btn: btnTabTipos, sec: secTipos, key: 'tipos' },
                { btn: btnTabTags, sec: secTags, key: 'tags' }
            ];

            tabs.forEach(t => {
                if (t.btn && t.sec) {
                    if (t.key === activa) {
                        t.btn.style.background = '#1a237e';
                        t.btn.style.color = 'white';
                        t.sec.style.display = 'grid';
                    } else {
                        t.btn.style.background = '#e0e0e0';
                        t.btn.style.color = '#424242';
                        t.sec.style.display = 'none';
                    }
                }
            });
        };

        if (btnTabActivos) btnTabActivos.addEventListener('click', () => alternarPestana('activos'), { signal });
        if (btnTabTipos) btnTabTipos.addEventListener('click', () => alternarPestana('tipos'), { signal });
        if (btnTabTags) btnTabTags.addEventListener('click', () => alternarPestana('tags'), { signal });
    }

    initModules(permisos) {
        this.crudTiposBien = new CrudTiposBien('wrapper-form-tipos', 'wrapper-tabla-tipos', permisos);
        this.crudActivos = new CrudActivos('wrapper-form-activos', 'wrapper-tabla-activos', permisos);
        this.crudTagsBien = new CrudTagsBien('wrapper-form-tags', 'wrapper-tabla-tags', permisos);

        // Sincronización de Tipos de Bien -> Formulario de Activos
        this.crudTiposBien.onTiposLoaded = (tipos) => {
            if (this.crudActivos?.actualizarSelectTipos) {
                this.crudActivos.actualizarSelectTipos(tipos);
            }
        };

        this.crudTiposBien.onTiposChanged = () => {
            this.crudTiposBien.cargarDatos();
            this.crudActivos.cargarDatos();
        };

        // Sincronización de Etiquetas (Tags) -> Formulario de Activos
        this.crudTagsBien.onTagsLoaded = (tags) => {
            if (this.crudActivos?.actualizarSelectTags) {
                this.crudActivos.actualizarSelectTags(tags);
            }
        };

        this.crudTagsBien.onTagsChanged = () => {
            this.crudTagsBien.cargarDatos();
            this.crudActivos.cargarDatos();
        };

        this.crudTiposBien.render();
        this.crudActivos.render();
        this.crudTagsBien.render();
    }

    unmount() {
        this._abortController.abort();
        this.crudTiposBien?.unmount();
        this.crudActivos?.unmount();
        this.crudTagsBien?.unmount();
    }
}