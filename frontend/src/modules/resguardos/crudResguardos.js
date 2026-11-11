import authStore from '/src/core/store/authStore.js';
import { checkAccess } from '/src/core/security/CanRender.js';
import { CreateResguardo } from '/src/modules/resguardos/components/CreateResguardo.js';
import { ReadResguardos } from '/src/modules/resguardos/components/ReadResguardos.js';
import { UpdateResguardo } from '/src/modules/resguardos/components/UpdateResguardo.js';
import { DeleteResguardo } from '/src/modules/resguardos/components/DeleteResguardo.js';
import { SelectorUbicaciones } from '/src/modules/ubicaciones/components/SelectorUbicaciones.js';
import { SolicitarResguardoModal } from '/src/modules/resguardos/components/SolicitarResguardoModal.js';
import { ReadSolicitudes } from '/src/modules/resguardos/components/ReadSolicitudes.js';

export class HistorialResguardos {
    constructor(containerId) {
        this.containerId = containerId;
        this.estaDesmontado = false;
        
        this.capacidadGlobal = false;
        this.puedeModificar = false;
        this.puedeSolicitar = false;
        this.puedeAprobar = false;
        
        this.ubicacionActual = null;
        this.modoEdicion = false;
        this.idAsignacionEnEdicion = null;
        
        this.createModule = new CreateResguardo();
        this.readModule = new ReadResguardos();
        this.updateModule = new UpdateResguardo();
        this.deleteModule = new DeleteResguardo();
        this.selectorUbicaciones = null;

        this.readMisSolicitudesModule = new ReadSolicitudes(false);
        this.readBandejaAprobacionModule = new ReadSolicitudes(true);
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const state = authStore.getSnapshot();
        if (!state || !state.isAuthenticated || !state.user) {
            this._renderizarMensaje(container, "Identidad no verificada. Inicie sesión para acceder al módulo de resguardos.", true);
            return;
        }

        this.capacidadGlobal = checkAccess('resguardos:leer', state);
        const puedeListarPropios = checkAccess('MisResguardos:leer', state);
        this.puedeModificar = checkAccess(['resguardos:editar', 'resguardos:crear'], state, false);
        
        this.puedeSolicitar = checkAccess('solicitudes_resguardo:crear', state);
        this.puedeAprobar = checkAccess('solicitudes_resguardo:aprobar', state);

        if (!this.capacidadGlobal && !puedeListarPropios && !this.puedeSolicitar) {
            this._renderizarMensaje(container, "Acceso Denegado: Su perfil no posee capacidades asignadas para operar en la matriz de resguardos.", true);
            return;
        }

        container.innerHTML = this._obtenerPlantillaPrincipal();
        this._bindTabEvents(container);

        if (this.puedeSolicitar) {
            const btnSolicitar = container.querySelector('#btn-abrir-modal-solicitud');
            if (btnSolicitar) {
                btnSolicitar.addEventListener('click', () => {
                    const modal = new SolicitarResguardoModal(async () => {
                        const misSolContainer = container.querySelector('#tab-mis-solicitudes');
                        if (misSolContainer) await this.readMisSolicitudesModule.cargarTabla(misSolContainer);
                    });
                    modal.render();
                });
            }
        }

        if (this.capacidadGlobal && this.puedeModificar) {
            const formContainer = container.querySelector('#resguardos-form-container');
            formContainer.innerHTML = this.createModule.obtenerPlantillaFormulario();
            this.createModule.bindEvents(formContainer);

            const subContainer = formContainer.querySelector('#contenedor-selector-ubicacion-resguardo');
            if (subContainer) {
                this.selectorUbicaciones = new SelectorUbicaciones(subContainer, (geoData) => {
                    this.ubicacionActual = geoData;
                });
                await this.selectorUbicaciones.inicializar();
            }
            this._vincularEventosFormulario(formContainer);
        }

        const tableContainer = container.querySelector('#resguardos-table-container');
        await this.readModule.inicializar(tableContainer, this.capacidadGlobal, this.puedeModificar, {
            onEdit: (item) => this._prepararEdicion(item),
            onRelease: async (id) => {
                const exito = await this.updateModule.concluirDevolucion(id);
                if (exito) await this.readModule.cargarTabla(); 
            },
            onDelete: async (id) => {
                const exito = await this.deleteModule.eliminar(id);
                if (exito) await this.readModule.cargarTabla();
            }
        });

        const misSolContainer = container.querySelector('#tab-mis-solicitudes');
        if (misSolContainer) await this.readMisSolicitudesModule.cargarTabla(misSolContainer);

        if (this.puedeAprobar) {
            const bandejaContainer = container.querySelector('#tab-bandeja-aprobacion');
            if (bandejaContainer) await this.readBandejaAprobacionModule.cargarTabla(bandejaContainer);
        }
    }

    _obtenerPlantillaPrincipal() {
        const titulo = this.capacidadGlobal ? 'Panel Maestro de Custodia e Inventario Institucional' : 'Mis Resguardos y Asignaciones Vigentes';
        const subtitulo = this.capacidadGlobal ? 'Consola global de fiscalización, liberación, devolución y gestión de solicitudes.' : 'Listado oficial de activos asignados bajo su responsabilidad legal.';

        return `
            <div class="module-card">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:10px;">
                    <div>
                        <h3 style="margin-top:0; color:var(--primary); font-size:16px; font-weight:700;">${titulo}</h3>
                        <p style="font-size:12px; color:var(--text-muted); margin:4px 0 0 0;">${subtitulo}</p>
                    </div>
                    ${this.puedeSolicitar ? `
                        <button id="btn-abrir-modal-solicitud" style="background-color:var(--primary, #1976d2); color:white; border:none; padding:8px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:6px; margin-left:auto;">
                            ➕ Solicitar Resguardo
                        </button>
                    ` : ''}
                </div>

                <!-- Pestañas de Navegación -->
                <div style="display:flex; gap:10px; border-bottom:2px solid var(--border-color, #eee); margin-bottom:15px;">
                    <button class="tab-btn active" data-tab="tab-vigentes" style="padding:8px 12px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:700; border-bottom:2px solid var(--primary, #1976d2); color:var(--primary, #1976d2);">
                        Resguardos Vigentes
                    </button>
                    <button class="tab-btn" data-tab="tab-mis-solicitudes" style="padding:8px 12px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:700; color:var(--text-muted, #666);">
                        Mis Solicitudes
                    </button>
                    ${this.puedeAprobar ? `
                        <button class="tab-btn" data-tab="tab-bandeja-aprobacion" style="padding:8px 12px; border:none; background:none; cursor:pointer; font-size:12px; font-weight:700; color:var(--text-muted, #666);">
                            Bandeja de Aprobaciones
                        </button>
                    ` : ''}
                </div>

                <!-- Contenedores por Pestaña -->
                <div id="tab-vigentes" class="tab-content">
                    <div id="resguardos-form-container" style="width: 100%; margin-bottom: 15px;"></div>
                    <div id="resguardos-table-container" style="width: 100%;"></div>
                </div>

                <div id="tab-mis-solicitudes" class="tab-content" style="display:none; width:100%;"></div>

                ${this.puedeAprobar ? `
                    <div id="tab-bandeja-aprobacion" class="tab-content" style="display:none; width:100%;"></div>
                ` : ''}
            </div>
        `;
    }

    _bindTabEvents(container) {
        const tabs = container.querySelectorAll('.tab-btn');
        const tabContents = container.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.style.borderBottom = 'none';
                    t.style.color = 'var(--text-muted, #666)';
                });
                tabContents.forEach(c => c.style.display = 'none');

                tab.style.borderBottom = '2px solid var(--primary, #1976d2)';
                tab.style.color = 'var(--primary, #1976d2)';

                const selectedTab = container.querySelector(`#${tab.getAttribute('data-tab')}`);
                if (selectedTab) selectedTab.style.display = 'block';
            });
        });
    }

    _vincularEventosFormulario(formContainer) { 
        const form = formContainer.querySelector('#form-crear-resguardo');
        const btnCancelar = formContainer.querySelector('#btn-cancelar-edicion');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._handleSubmit(form);
        });

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this._cancelarEdicion());
        }
    }

    async _handleSubmit(form) {
        const feedback = form.querySelector('#resguardo-error-feedback');
        if (feedback) feedback.textContent = '';

        if (!this.ubicacionActual || !this.ubicacionActual.id_edificio || !this.ubicacionActual.id_aula || !this.ubicacionActual.id_departamento) {
            if (feedback) feedback.textContent = "Error: Mapeo topológico incompleto (Edificio, Aula y Depto requeridos).";
            return;
        }

        const formData = new FormData(form);
        const numeroInventarioVal = formData.get('numero_inventario');
        const curpVal = formData.get('curp');

        if (!numeroInventarioVal || !numeroInventarioVal.trim()) {
            if (feedback) feedback.textContent = "Error: Ingrese un número de inventario válido.";
            return;
        }

        const payload = {
            numero_inventario: numeroInventarioVal.trim(),
            curp: curpVal ? curpVal.trim().toUpperCase() : null,
            id_edificio: this.ubicacionActual.id_edificio,
            id_aula: this.ubicacionActual.id_aula,
            id_departamento: this.ubicacionActual.id_departamento
        };

        const btn = form.querySelector('#btn-submit-resguardo');
        if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

        try {
            if (this.modoEdicion) {
                await this.updateModule.actualizar(this.idAsignacionEnEdicion, payload);
                this._cancelarEdicion();
            } else {
                await this.createModule.crear(payload);
                form.reset();
                this.createModule.limpiarPreviewBien(form.parentNode);
                if (this.selectorUbicaciones) await this.selectorUbicaciones.inicializar();
            }
            await this.readModule.cargarTabla();
        } catch (err) {
            if (feedback) feedback.textContent = err.response?.data?.detail || "Fallo estructural al procesar la asignación.";
        } finally {
            if (btn) { 
                btn.disabled = false; 
                btn.textContent = this.modoEdicion ? 'Guardar Cambios' : 'Emitir Acta de Resguardo'; 
            }
        }
    }

    _prepararEdicion(item) {
        this.modoEdicion = true;
        this.idAsignacionEnEdicion = item.id_asignacion;
        this.updateModule.prepararFormulario(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _cancelarEdicion() {
        this.modoEdicion = false;
        this.idAsignacionEnEdicion = null;
        this.updateModule.limpiarFormulario();
        if (this.selectorUbicaciones) this.selectorUbicaciones.inicializar();
    }

    _renderizarMensaje(container, mensaje, esError = false) {
        const contenedorClase = esError ? 'forbidden-container' : 'module-card';
        const titulo = esError ? 'Acceso Restringido (403 Forbidden)' : 'Mensaje del Sistema';
        
        container.innerHTML = `
            <div class="${contenedorClase}" style="margin-top: 20px;">
                <h4 style="margin:0 0 10px 0; font-size:13px; font-weight:700; text-transform:uppercase;">${titulo}</h4>
                <p style="margin:0; font-size:11px;">${mensaje}</p>
            </div>
        `;
    }

    unmount() {
        this.estaDesmontado = true;
        if (this.createModule) this.createModule.unmount(document.getElementById(this.containerId));
        if (this.readModule) this.readModule.unmount();
        if (this.selectorUbicaciones) this.selectorUbicaciones.unmount();
    }
}