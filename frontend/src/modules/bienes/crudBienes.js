import authStore from '/src/core/store/authStore.js';
import { checkAccess } from '/src/core/security/CanRender.js';
import { CrudTiposBien } from '/src/modules/bienes/components/crudTiposBien.js';
import { CrudActivos } from '/src/modules/bienes/components/crudActivos.js';
import { CrudTagsBien } from '/src/modules/bienes/components/crudTagsBien.js';
import { ChecklistBien } from '/src/modules/bienes/components/checklistComponents/ChecklistBien.js';

export class CrudBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this._abortController = new AbortController();

        this.crudTiposBien = null;
        this.crudActivos = null;
        this.crudTagsBien = null;
        this.checklistBien = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const state = authStore.getSnapshot();

        const permisos = {
            crear: checkAccess('bienes:crear', state),
            editar: checkAccess('bienes:editar', state),
            borrar: checkAccess('bienes:borrar', state),
            leer: checkAccess('bienes:leer', state)
        };

        if (!permisos.crear && !permisos.editar && !permisos.borrar && !permisos.leer) {
            container.innerHTML = `
                <div class="forbidden-container" style="margin-top: 20px;">
                    <h4>ACCESO DENEGADO (403 FORBIDDEN)</h4>
                    <p>Su token institucional no cuenta con la capacidad necesaria para acceder al módulo patrimonial.</p>
                </div>
            `;
            return;
        }

        const puedeGestionarCatalogos = permisos.crear || permisos.editar || permisos.borrar;
        const puedeAccederChecklist = permisos.leer;

        container.innerHTML = `
            <div style="width: 100%;">
                <!-- Control de Pestañas Adaptativo por Rol -->
                <div style="display: flex; flex-wrap: wrap; gap: 10px; border-bottom: 2px solid var(--border-color); margin-bottom: 20px;">
                    <button id="tab-btn-activos" style="padding: 10px 20px; border: none; background: var(--primary); color: white; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Inventario de Activos (Bienes)
                    </button>
                    ${puedeGestionarCatalogos ? `
                    <button id="tab-btn-tipos" style="padding: 10px 20px; border: none; background: var(--border-color); color: var(--text-muted); cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Catálogo de Tipos de Bien
                    </button>
                    <button id="tab-btn-tags" style="padding: 10px 20px; border: none; background: var(--border-color); color: var(--text-muted); cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Catálogo de Etiquetas (Tags)
                    </button>
                    ` : ''}
                    ${puedeAccederChecklist ? `
                    <button id="tab-btn-checklist" style="padding: 10px 20px; border: none; background: var(--border-color); color: var(--text-muted); cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        ☑️ Checklist / Auditoría Física
                    </button>
                    ` : ''}
                </div>

                <!-- Sección 1: Activos -->
                <div id="section-activos" class="grid-dos-columnas">
                    <div id="wrapper-form-activos"></div>
                    <div id="wrapper-tabla-activos"></div>
                </div>

                ${puedeGestionarCatalogos ? `
                <!-- Sección 2: Tipos de Bien -->
                <div id="section-tipos" class="grid-dos-columnas" style="display: none;">
                    <div id="wrapper-form-tipos"></div>
                    <div id="wrapper-tabla-tipos"></div>
                </div>

                <!-- Sección 3: Etiquetas (Tags) -->
                <div id="section-tags" class="grid-dos-columnas" style="display: none;">
                    <div id="wrapper-form-tags"></div>
                    <div id="wrapper-tabla-tags"></div>
                </div>
                ` : ''}

                ${puedeAccederChecklist ? `
                <!-- Sección 4: Checklist / Auditoría Física -->
                <div id="section-checklist" style="display: none;">
                    <div id="wrapper-modulo-checklist"></div>
                </div>
                ` : ''}
            </div>
        `;

        this.bindEvents();
        this.initModules(permisos, puedeGestionarCatalogos, puedeAccederChecklist);
    }

    bindEvents() {
        const signal = this._abortController.signal;

        const btnTabActivos = document.getElementById('tab-btn-activos');
        const btnTabTipos = document.getElementById('tab-btn-tipos');
        const btnTabTags = document.getElementById('tab-btn-tags');
        const btnTabChecklist = document.getElementById('tab-btn-checklist');

        const secActivos = document.getElementById('section-activos');
        const secTipos = document.getElementById('section-tipos');
        const secTags = document.getElementById('section-tags');
        const secChecklist = document.getElementById('section-checklist');

        const alternarPestana = (activa) => {
            const tabs = [
                { btn: btnTabActivos, sec: secActivos, key: 'activos', displayStyle: 'grid' },
                { btn: btnTabTipos, sec: secTipos, key: 'tipos', displayStyle: 'grid' },
                { btn: btnTabTags, sec: secTags, key: 'tags', displayStyle: 'grid' },
                { btn: btnTabChecklist, sec: secChecklist, key: 'checklist', displayStyle: 'block' }
            ];

            tabs.forEach(t => {
                if (t.btn && t.sec) {
                    if (t.key === activa) {
                        t.btn.style.background = 'var(--primary)';
                        t.btn.style.color = 'white';
                        t.sec.style.display = t.displayStyle;
                    } else {
                        t.btn.style.background = 'var(--border-color)';
                        t.btn.style.color = 'var(--text-muted)';
                        t.sec.style.display = 'none';
                    }
                }
            });
        };

        if (btnTabActivos) btnTabActivos.addEventListener('click', () => alternarPestana('activos'), { signal });
        if (btnTabTipos) btnTabTipos.addEventListener('click', () => alternarPestana('tipos'), { signal });
        if (btnTabTags) btnTabTags.addEventListener('click', () => alternarPestana('tags'), { signal });
        if (btnTabChecklist) btnTabChecklist.addEventListener('click', () => alternarPestana('checklist'), { signal });
    }

    initModules(permisos, puedeGestionarCatalogos, puedeAccederChecklist) {
        this.crudActivos = new CrudActivos('wrapper-form-activos', 'wrapper-tabla-activos', permisos);
        this.crudActivos.render();

        if (puedeGestionarCatalogos) {
            this.crudTiposBien = new CrudTiposBien('wrapper-form-tipos', 'wrapper-tabla-tipos', permisos);
            this.crudTagsBien = new CrudTagsBien('wrapper-form-tags', 'wrapper-tabla-tags', permisos);

            this.crudTiposBien.onTiposLoaded = (tipos) => {
                this.crudActivos?.actualizarSelectTipos?.(tipos);
            };

            this.crudTiposBien.onTiposChanged = () => {
                this.crudTiposBien.cargarDatos();
                this.crudActivos.cargarDatos();
            };

            this.crudTagsBien.onTagsLoaded = (tags) => {
                this.crudActivos?.actualizarSelectTags?.(tags);
            };

            this.crudTagsBien.onTagsChanged = () => {
                this.crudTagsBien.cargarDatos();
                this.crudActivos.cargarDatos();
            };

            this.crudTiposBien.render();
            this.crudTagsBien.render();
        }

        if (puedeAccederChecklist) {
            this.checklistBien = new ChecklistBien('wrapper-modulo-checklist', permisos);
            this.checklistBien.render();
        }
    }

    unmount() {
        this._abortController.abort();
        this.crudTiposBien?.unmount();
        this.crudActivos?.unmount();
        this.crudTagsBien?.unmount();
        this.checklistBien?.unmount();
    }
}