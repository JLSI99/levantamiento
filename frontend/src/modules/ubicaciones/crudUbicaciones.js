import authStore from '../../core/store/authStore.js';
import { CrudEdificios } from './components/crudEdificios.js';
import { CrudAulas } from './components/crudAulas.js';
import { CrudDepartamentos } from './components/crudDepartamentos.js';

export class CrudUbicaciones {
    constructor(containerId) {
        this.containerId = containerId;
        this._abortController = new AbortController();

        // Instancias de los sub-módulos
        this.modEdificios = null;
        this.modAulas = null;
        this.modDepartamentos = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // 1. Obtener estado de autenticación y capacidades desde el authStore
        const estadoAuth = authStore.getSnapshot();
        const usuario = estadoAuth?.user;
        const capabilities = estadoAuth?.capabilities || [];
        const permisosRaw = usuario?.permisos || [];
        const esAdmin = usuario && (usuario.rol === 1 || usuario.rol_id === 1);

        // Mapeo unificado de permisos para el módulo de infraestructura/organigrama
        const permisos = {
            crear: esAdmin || permisosRaw.includes('ubicaciones:crear') || capabilities.includes('ubicaciones:create'),
            editar: esAdmin || permisosRaw.includes('ubicaciones:editar') || capabilities.includes('ubicaciones:update'),
            borrar: esAdmin || permisosRaw.includes('ubicaciones:borrar') || capabilities.includes('ubicaciones:delete'),
            leer: esAdmin || permisosRaw.includes('ubicaciones:leer') || capabilities.includes('ubicaciones:read')
        };

        // Si no tiene ningún permiso ni es admin, bloqueamos el acceso (403)
        if (!permisos.crear && !permisos.editar && !permisos.borrar && !permisos.leer) {
            container.innerHTML = `
                <div class="forbidden-container" style="padding: 20px; background: #ffebee; border: 1px solid #c62828; border-radius: 4px; margin-top: 20px; font-family: sans-serif;">
                    <h4 style="color:#c62828; margin: 0 0 10px 0; font-weight: 700;">ACCESO DENEGADO (403 FORBIDDEN)</h4>
                    <p style="font-size: 13px; color: #37474f; margin: 0;">Su token institucional no cuenta con la capacidad necesaria para gestionar la infraestructura o el organigrama.</p>
                </div>
            `;
            return;
        }

        // 2. Estructura HTML base del Orquestador
        container.innerHTML = `
            <div style="width: 100%; font-family: system-ui, -apple-system, sans-serif;">
                <!-- Control de Pestañas -->
                <div style="display: flex; gap: 10px; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px;">
                    <button id="tab-btn-infra" style="padding: 10px 20px; border: none; background: #00796b; color: white; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Infraestructura Física (Edificios y Aulas)
                    </button>
                    <button id="tab-btn-deptos" style="padding: 10px 20px; border: none; background: #e0e0e0; color: #424242; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Organigrama (Departamentos)
                    </button>
                </div>

                <!-- SECCIÓN 1: INFRAESTRUCTURA FÍSICA -->
                <div id="section-infraestructura" style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                        <div id="container-form-edificios"></div>
                        <hr style="border:0; border-top:1px solid #e0e0e0; margin:20px 0;">
                        <div id="container-form-aulas"></div>
                    </div>
                    <div id="container-tabla-infra"></div>
                </div>

                <!-- SECCIÓN 2: ORGANIGRAMA DE DEPARTAMENTOS -->
                <div id="section-departamentos" style="display: none; grid-template-columns: 1fr 2fr; gap: 20px;"></div>
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
                btnTabInfra.style.background = '#00796b';
                btnTabInfra.style.color = 'white';
                btnTabDeptos.style.background = '#e0e0e0';
                btnTabDeptos.style.color = '#424242';
                secInfra.style.display = 'grid';
                secDeptos.style.display = 'none';
            }, { signal });

            btnTabDeptos.addEventListener('click', () => {
                btnTabDeptos.style.background = '#00796b';
                btnTabDeptos.style.color = 'white';
                btnTabInfra.style.background = '#e0e0e0';
                btnTabInfra.style.color = '#424242';
                secDeptos.style.display = 'grid';
                secInfra.style.display = 'none';
            }, { signal });
        }
    }

    initModules(permisos) {
        // 1. Instanciamos Aulas pasando los permisos calculados
        this.modAulas = new CrudAulas('container-form-aulas', permisos, () => {
            this.modEdificios.cargarDatos();
        });

        // 2. Instanciamos Edificios pasando los permisos calculados
        this.modEdificios = new CrudEdificios(
            'container-form-edificios', 
            'container-tabla-infra', 
            permisos,
            (edificios) => this.modAulas.actualizarOpcionesEdificios(edificios),
            (idAula, idEdificio, nombre) => this.modAulas.activarEdicion(idAula, idEdificio, nombre)
        );

        // 3. Instanciamos Departamentos pasando los permisos calculados
        this.modDepartamentos = new CrudDepartamentos('section-departamentos', permisos);

        // Renderizamos e inicializamos datos
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