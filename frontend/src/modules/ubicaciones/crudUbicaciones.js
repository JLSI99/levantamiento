import { CrudEdificios } from './components/crudEdificios.js';
import { CrudAulas } from './components/crudAulas.js';
import { CrudDepartamentos } from './components/crudDepartamentos.js';

export class CrudUbicaciones {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this._abortController = new AbortController();

        // Instancias de los sub-módulos
        this.modEdificios = null;
        this.modAulas = null;
        this.modDepartamentos = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Estructura base con contenedores vacíos para inyectar los sub-módulos
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
                        <!-- Contenedor inyectable para el formulario de Edificios -->
                        <div id="container-form-edificios"></div>
                        
                        <hr style="border:0; border-top:1px solid #e0e0e0; margin:20px 0;">
                        
                        <!-- Contenedor inyectable para el formulario de Aulas -->
                        <div id="container-form-aulas"></div>
                    </div>

                    <!-- Contenedor inyectable para la tabla de Edificios/Aulas -->
                    <div id="container-tabla-infra"></div>
                </div>

                <!-- SECCIÓN 2: ORGANIGRAMA DE DEPARTAMENTOS -->
                <!-- Contenedor inyectable para todo el módulo de departamentos -->
                <div id="section-departamentos" style="display: none; grid-template-columns: 1fr 2fr; gap: 20px;"></div>
            </div>
        `;

        this.bindEvents();
        this.initModules();
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

    initModules() {
        // 1. Instanciamos el módulo de Aulas
        // Le pasamos un callback para que avise cuando un aula se guardó y así recargar la tabla
        this.modAulas = new CrudAulas('container-form-aulas', this.permisos, () => {
            this.modEdificios.cargarDatos(); // Actualiza la tabla de edificios
        });

        // 2. Instanciamos el módulo de Edificios
        // Le pasamos callbacks para conectar con el módulo de Aulas
        this.modEdificios = new CrudEdificios(
            'container-form-edificios', 
            'container-tabla-infra', 
            this.permisos,
            // Callback cuando se cargan edificios (para actualizar el `<select>` del form de aulas)
            (edificios) => this.modAulas.actualizarOpcionesEdificios(edificios),
            // Callback cuando se da clic en "Editar Aula" en la tabla
            (idAula, idEdificio, nombre) => this.modAulas.activarEdicion(idAula, idEdificio, nombre)
        );

        // 3. Instanciamos el módulo de Departamentos (Totalmente independiente)
        this.modDepartamentos = new CrudDepartamentos('section-departamentos', this.permisos);

        // Renderizamos e inicializamos datos
        this.modEdificios.render();
        this.modAulas.render();
        this.modDepartamentos.render();
    }
}