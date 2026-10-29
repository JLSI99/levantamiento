import authStore from '/src/core/store/authStore.js';
import { checkAccess } from '/src/core/security/CanRender.js';
import { CrudEdificios } from '/src/modules/ubicaciones/components/crudEdificios.js';
import { CrudAulas } from '/src/modules/ubicaciones/components/crudAulas.js';
import { CrudDepartamentos } from '/src/modules/ubicaciones/components/crudDepartamentos.js';

export class CrudUbicaciones {
    constructor(containerId) {
        this.containerId = containerId;
        this._abortController = new AbortController();

        this.modEdificios = null;
        this.modAulas = null;
        this.modDepartamentos = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const state = authStore.getSnapshot();

        // Evaluación unificada y robusta utilizando CapBAC a través de CanRender.js
        const permisos = {
            crear: checkAccess('ubicaciones:crear', state),
            editar: checkAccess('ubicaciones:editar', state),
            borrar: checkAccess('ubicaciones:borrar', state),
            leer: checkAccess('ubicaciones:leer', state)
        };

        if (!permisos.crear && !permisos.editar && !permisos.borrar && !permisos.leer) {
            container.innerHTML = `
                <div class="forbidden-container" style="margin-top: 20px;">
                    <h4>ACCESO DENEGADO (403 FORBIDDEN)</h4>
                    <p>Su token institucional no cuenta con la capacidad necesaria para gestionar la infraestructura o el organigrama.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="width: 100%;">
                <!-- Control de Pestañas Adaptativo -->
                <div style="display: flex; flex-wrap: wrap; gap: 10px; border-bottom: 2px solid var(--border-color); margin-bottom: 20px;">
                    <button id="tab-btn-infra" style="padding: 10px 20px; border: none; background: var(--secondary); color: white; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Infraestructura Física (Edificios y Aulas)
                    </button>
                    <button id="tab-btn-deptos" style="padding: 10px 20px; border: none; background: var(--border-color); color: var(--text-muted); cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Organigrama (Departamentos)
                    </button>
                </div>

                <!-- SECCIÓN 1: INFRAESTRUCTURA FÍSICA -->
                <div id="section-infraestructura" class="grid-dos-columnas">
                    <div class="module-card">
                        <div id="container-form-edificios"></div>
                        <hr class="form-divider-section" style="border:0; border-top:1px solid var(--border-color); margin:20px 0;">
                        <div id="container-form-aulas"></div>
                    </div>
                    <div id="container-tabla-infra"></div>
                </div>

                <!-- SECCIÓN 2: ORGANIGRAMA DE DEPARTAMENTOS -->
                <div id="section-departamentos" class="grid-dos-columnas" style="display: none;"></div>
            </div>
        `;

        this.bindEvents();
        this.initModules(permisos);
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const btnTabInfra = document.getElementById('tab-btn-infra');
        const btnTabDeptos = document.getElementById('tab-btn-deptos');
        const secInfra = document.getElementById('section-infraestructura');
        const secDeptos = document.getElementById('section-departamentos');

        if (btnTabInfra && btnTabDeptos) {
            btnTabInfra.addEventListener('click', () => {
                btnTabInfra.style.background = 'var(--secondary)';
                btnTabInfra.style.color = 'white';
                btnTabDeptos.style.background = 'var(--border-color)';
                btnTabDeptos.style.color = 'var(--text-muted)';
                secInfra.style.display = 'grid';
                secDeptos.style.display = 'none';
            }, { signal });

            btnTabDeptos.addEventListener('click', () => {
                btnTabDeptos.style.background = 'var(--secondary)';
                btnTabDeptos.style.color = 'white';
                btnTabInfra.style.background = 'var(--border-color)';
                btnTabInfra.style.color = 'var(--text-muted)';
                secDeptos.style.display = 'grid';
                secInfra.style.display = 'none';
            }, { signal });
        }
    }

    initModules(permisos) {
        this.modAulas = new CrudAulas('container-form-aulas', permisos, () => {
            this.modEdificios.cargarDatos();
        });

        this.modEdificios = new CrudEdificios(
            'container-form-edificios', 
            'container-tabla-infra', 
            permisos,
            (edificios) => this.modAulas.actualizarOpcionesEdificios(edificios),
            (idAula, idEdificio, nombre) => this.modAulas.activarEdicion(idAula, idEdificio, nombre)
        );

        this.modEdificios.onDeleteAulaRequest = (idAula) => this.modAulas.eliminarAula(idAula);

        this.modDepartamentos = new CrudDepartamentos('section-departamentos', permisos);

        this.modEdificios.render();
        this.modAulas.render();
        this.modDepartamentos.render();
    }

    unmount() {
        this._abortController.abort();
        this.modEdificios?.unmount?.();
        this.modAulas?.unmount?.();
        this.modDepartamentos?.unmount?.();
    }
}