import authStore from '../../core/store/authStore.js';
import { CreateResguardo } from './components/CreateResguardo.js';
import { ReadResguardos } from './components/ReadResguardos.js';
import { UpdateResguardo } from './components/UpdateResguardo.js';
import { DeleteResguardo } from './components/DeleteResguardo.js';
import { SelectorUbicaciones } from '../ubicaciones/components/SelectorUbicaciones.js';

export class HistorialResguardos {
    constructor(containerId) {
        this.containerId = containerId;
        this.estaDesmontado = false;
        
        // Estado Global
        this.capacidadGlobal = false;
        this.puedeModificar = false;
        this.ubicacionActual = null;
        
        // Estado de Edición
        this.modoEdicion = false;
        this.idAsignacionEnEdicion = null;
        
        // Módulos CRUD
        this.createModule = new CreateResguardo();
        this.readModule = new ReadResguardos();
        this.updateModule = new UpdateResguardo();
        this.deleteModule = new DeleteResguardo();
        this.selectorUbicaciones = null;
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // 1. Verificación de Autenticación y Permisos
        const state = authStore.getSnapshot();
        if (!state || !state.isAuthenticated || !state.user) {
            this._renderizarMensaje(container, "Identidad no verificada. Inicie sesión para establecer canal patrimonial seguro.", true);
            return;
        }

        const permisos = state.capabilities || [];
        this.capacidadGlobal = permisos.includes('resguardos:leer') || permisos.includes('resguardos:crear');
        const puedeListarPropios = permisos.includes('resguardos:leer');
        this.puedeModificar = permisos.includes('resguardos:editar') || permisos.includes('resguardos:crear');

        if (!this.capacidadGlobal && !puedeListarPropios) {
            this._renderizarMensaje(container, "Acceso Denegado: Su perfil no cuenta con capacidades explícitas de lectura en la matriz de resguardos patrimoniales.", true);
            return;
        }

        // 2. Renderizado de la estructura principal (Layout)
        container.innerHTML = this._obtenerPlantillaPrincipal();

        // 3. Inicializar Formulario (Create / Update)
        if (this.capacidadGlobal && this.puedeModificar) {
            const formContainer = container.querySelector('#resguardos-form-container');
            formContainer.innerHTML = this.createModule.obtenerPlantillaFormulario();
            
            const subContainer = formContainer.querySelector('#contenedor-selector-ubicacion-resguardo');
            if (subContainer) {
                this.selectorUbicaciones = new SelectorUbicaciones(subContainer, (geoData) => {
                    this.ubicacionActual = geoData;
                });
                await this.selectorUbicaciones.inicializar();
            }

            this._vincularEventosFormulario(formContainer);
        }

        // 4. Inicializar Tabla (Read y triggers para D)
        const tableContainer = container.querySelector('#resguardos-table-container');
        await this.readModule.inicializar(tableContainer, this.capacidadGlobal, this.puedeModificar, {
            onEdit: (item) => this._prepararEdicion(item),
            onRelease: async (id) => {
                const exito = await this.deleteModule.liberar(id);
                if (exito) this.readModule.cargarTabla();
            },
            onDelete: async (id) => {
                const exito = await this.deleteModule.eliminar(id);
                if (exito) this.readModule.cargarTabla();
            }
        });
    }

    _obtenerPlantillaPrincipal() {
        const titulo = this.capacidadGlobal ? 'Panel Maestro de Custodia e Inventario Institucional' : 'Mis Resguardos y Asignaciones Vigentes';
        const subtitulo = this.capacidadGlobal ? 'Consola global de fiscalización, liberación, y timbrado de actas de resguardo.' : 'Listado oficial de activos asignados bajo su responsabilidad legal.';

        return `
            <div class="module-card" style="padding:20px; background:white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin-top:0; color:#1a237e; font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px; font-weight:700;">${titulo}</h3>
                <p style="font-size:12px; color:#546e7a; margin:8px 0 15px 0; font-weight: 500;">${subtitulo}</p>
                
                <div id="resguardos-form-container"></div>
                <div id="resguardos-table-container"></div>
            </div>
        `;
    }

    _vincularEventosFormulario(formContainer) {
        const form = formContainer.querySelector('#form-crear-resguardo');
        const btnCancelar = formContainer.querySelector('#btn-cancelar-edicion');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._handleSubmit(form);
        });

        btnCancelar.addEventListener('click', () => this._cancelarEdicion());
    }

    async _handleSubmit(form) {
        const feedback = form.querySelector('#resguardo-error-feedback');
        if (feedback) feedback.textContent = '';

        if (!this.ubicacionActual || !this.ubicacionActual.id_edificio || !this.ubicacionActual.id_aula || !this.ubicacionActual.id_departamento) {
            if (feedback) feedback.textContent = "Error: Mapeo topológico incompleto (Edificio, Aula y Depto requeridos).";
            return;
        }

        const formData = new FormData(form);
        const payload = {
            id_bien: formData.get('id_bien').trim(),
            curp: formData.get('curp').trim().toUpperCase(),
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
                if (this.selectorUbicaciones) await this.selectorUbicaciones.inicializar();
            }
            this.readModule.cargarTabla();
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
    }

    _cancelarEdicion() {
        this.modoEdicion = false;
        this.idAsignacionEnEdicion = null;
        this.updateModule.limpiarFormulario();
        if (this.selectorUbicaciones) this.selectorUbicaciones.inicializar();
    }

    _renderizarMensaje(container, mensaje, esError = false) {
        const bg = esError ? '#ffebee' : '#e8f5e9';
        const border = esError ? '#ffcdd2' : '#c8e6c9';
        const text = esError ? '#c62828' : '#2e7d32';
        const titulo = esError ? 'Acceso Restringido (403 Forbidden)' : 'Mensaje del Sistema';
        
        container.innerHTML = `
            <div style="padding:30px; background:${bg}; border:1px solid ${border}; border-radius:6px; color:${text}; font-family:sans-serif;">
                <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:700; text-transform:uppercase;">${titulo}</h4>
                <p style="margin:0; font-size:12px;">${mensaje}</p>
            </div>
        `;
    }

    unmount() {
        this.estaDesmontado = true;
        if (this.readModule) this.readModule.unmount();
        if (this.selectorUbicaciones) this.selectorUbicaciones.unmount();
    }
}