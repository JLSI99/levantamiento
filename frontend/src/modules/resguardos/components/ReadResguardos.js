import { resguardosService } from '/src/services/resguardos.js';
import { ubicacionesService } from '/src/services/ubicaciones.js';
import { QrScannerModal } from './QrScannerModal.js';
import { DevolucionModal } from './DevolucionModal.js';
import { ResguardosTemplate } from './ResguardosTemplate.js';
import { ResguardosFiltros } from './ResguardosFiltros.js';
import { MultiSelectDropdown } from './MultiSelectDropdown.js';

export class ReadResguardos {
    constructor() {
        this.container = null;
        this.capacidadGlobal = false;
        this.puedeModificar = false;
        this.callbacks = {};
        
        this.tokenConcurrenciaId = 0;
        this.estaDesmontado = false;
        this.asignacionesMemoria = new Map();
        this.datosOriginales = [];
        this.paginacion = { limit: 100, offset: 0 };

        this.filtros = new ResguardosFiltros();
        this._departamentosCatalogo = [];
        this._edificiosCatalogo = [];

        this.dropdownDeptos = null;
        this.dropdownEdificios = null;

        this.handleOutsideClick = (e) => {
            ['deptos', 'edificios'].forEach(tipo => {
                const cont = this.container?.querySelector(`#dropdown-filtro-${tipo}-container`);
                const panel = this.container?.querySelector(`#dropdown-filtro-${tipo}-panel`);
                if (cont && panel && !cont.contains(e.target)) panel.style.display = 'none';
            });
        };

        this.devolucionModal = new DevolucionModal(
            async (id) => this.callbacks.onRelease?.(id),
            (item) => this.callbacks.onEdit?.(item)
        );

        this.qrScanner = new QrScannerModal('reader-qr-devolucion', 'modal-scanner-devolucion', (txt) => this.procesarCodigoEscaneado(txt));
    }

    async inicializar(container, capacidadGlobal, puedeModificar, callbacks) {
        this._limpiarEventos();
        this.container = container;
        this.capacidadGlobal = capacidadGlobal;
        this.puedeModificar = puedeModificar;
        this.callbacks = callbacks;

        this.container.innerHTML = ResguardosTemplate.obtenerEstructuraPrincipal(capacidadGlobal, puedeModificar);
        this._vincularEventos();
        
        if (this.capacidadGlobal) {
            this._inicializarDropdowns();
            await this.cargarCatalogosUbicaciones();
        }

        await this.cargarTabla();
    }

    _inicializarDropdowns() {
        this.dropdownDeptos = new MultiSelectDropdown(
            this.container, 'dropdown-filtro-deptos', 'Filtrar Deptos', 
            (ids) => { this.filtros.departamentosSeleccionados = ids; this.procesarYRenderizarTabla(); }
        );
        this.dropdownDeptos.vincularEventos();

        this.dropdownEdificios = new MultiSelectDropdown(
            this.container, 'dropdown-filtro-edificios', 'Filtrar Edificios', 
            (ids) => { this.filtros.edificiosSeleccionados = ids; this.procesarYRenderizarTabla(); }
        );
        this.dropdownEdificios.vincularEventos();
    }

    async cargarCatalogosUbicaciones() {
        try {
            const [respDeptos, respEdificios] = await Promise.all([
                ubicacionesService.listarDepartamentos(100, 0, true).catch(() => []),
                ubicacionesService.listarEdificios(100, 0, true).catch(() => [])
            ]);

            this._departamentosCatalogo = Array.isArray(respDeptos) ? respDeptos : (respDeptos?.data || []);
            this._edificiosCatalogo = Array.isArray(respEdificios) ? respEdificios : (respEdificios?.data || []);

            this.dropdownDeptos?.actualizarCatalogo(this._departamentosCatalogo);
            this.dropdownEdificios?.actualizarCatalogo(this._edificiosCatalogo);
        } catch (e) {
            console.error("Error al cargar catálogos:", e);
        }
    }

    async cargarTabla() {
        const tbody = this.container.querySelector('#tabla-resguardos-personales tbody');
        if (!tbody) return;

        this.tokenConcurrenciaId++;
        const currentTokenId = this.tokenConcurrenciaId;
        const totalCols = this.capacidadGlobal ? 5 : (this.puedeModificar ? 4 : 3);

        try {
            const resp = this.capacidadGlobal 
                ? await resguardosService.listarTodosLosResguardosInstitucionales(this.paginacion)
                : await resguardosService.listarMisResguardos(this.paginacion.limit, this.paginacion.offset);
            
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;

            this.datosOriginales = Array.isArray(resp) ? resp : (resp?.data || []);
            this.procesarYRenderizarTabla();
        } catch (error) {
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;
            tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center; padding:15px; color:#c62828; font-weight:600;">Error al recuperar asignaciones.</td></tr>`;
        }
    }

    procesarYRenderizarTabla() {
        const tbody = this.container.querySelector('#tabla-resguardos-personales tbody');
        if (!tbody) return;

        const totalCols = this.capacidadGlobal ? 5 : (this.puedeModificar ? 4 : 3);
        const textoBusqueda = this.container.querySelector('#filtro-busqueda-curp')?.value || '';

        const catalogos = { departamentosCatalogo: this._departamentosCatalogo, edificiosCatalogo: this._edificiosCatalogo };
        const asignaciones = this.filtros.aplicar(this.datosOriginales, textoBusqueda, catalogos);

        this.asignacionesMemoria.clear();

        if (asignaciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align:center; padding:15px; color:#757575; font-weight:500;">No se encontraron registros vigentes.</td></tr>`;
            return;
        }

        tbody.innerHTML = asignaciones.map(item => {
            this.asignacionesMemoria.set(String(item.id_asignacion), item);
            return ResguardosTemplate.generarFila(item, this.capacidadGlobal, this.puedeModificar);
        }).join('');
    }

    _vincularEventos() {
        const filtroInput = this.container.querySelector('#filtro-busqueda-curp');
        if (filtroInput) filtroInput.addEventListener('input', () => this.procesarYRenderizarTabla());

        document.addEventListener('click', this.handleOutsideClick);

        const btnCustodio = this.container.querySelector('#btn-orden-custodio');
        if (btnCustodio) {
            btnCustodio.addEventListener('click', () => {
                if (this.filtros.criterioOrden === 'custodio') {
                    if (this.filtros.ordenAscendente) {
                        this.filtros.ordenAscendente = false;
                        btnCustodio.textContent = `Ordenar por Custodio 🔽`;
                    } else {
                        this.filtros.criterioOrden = null;
                        this.filtros.ordenAscendente = true;
                        btnCustodio.textContent = `Ordenar por Custodio ↕`;
                        btnCustodio.style.background = '#f5f5f5';
                        btnCustodio.style.color = '#333';
                    }
                } else {
                    this.filtros.criterioOrden = 'custodio';
                    this.filtros.ordenAscendente = true;
                    btnCustodio.style.background = '#0288d1';
                    btnCustodio.style.color = 'white';
                    btnCustodio.textContent = `Ordenar por Custodio 🔼`;
                }
                this.procesarYRenderizarTabla();
            });
        }

        const btnQr = this.container.querySelector('#btn-qr-devolucion-rapida');
        if (btnQr) btnQr.addEventListener('click', () => this.qrScanner.iniciar());

        const tabla = this.container.querySelector('#tabla-resguardos-personales');
        if (tabla && this.puedeModificar) {
            tabla.addEventListener('click', (e) => {
                const target = e.target;
                const idStr = target.getAttribute('data-id');
                if (!idStr) return;

                if (target.classList.contains('btn-editar-resguardo')) this.callbacks.onEdit?.(this.asignacionesMemoria.get(idStr));
                if (target.classList.contains('btn-liberar-resguardo')) this.callbacks.onRelease?.(idStr);
                if (target.classList.contains('btn-eliminar-resguardo')) this.callbacks.onDelete?.(idStr);
            });
        }
    }

    procesarCodigoEscaneado(codigo) {
        const query = codigo.trim().toUpperCase();
        let match = null;

        for (const [id, item] of this.asignacionesMemoria.entries()) {
            if (String(item.id_asignacion || '').toUpperCase() === query || 
                String(item.bien?.numero_inventario || '').toUpperCase() === query || 
                String(item.bien?.serie || '').toUpperCase() === query) {
                match = item;
                break;
            }
        }

        if (match) {
            this.devolucionModal.abrir(match);
        } else {
            const input = this.container.querySelector('#filtro-busqueda-curp');
            if (input) input.value = codigo;
            this.procesarYRenderizarTabla();
            alert(`Filtro aplicado para el código escaneado: "${codigo}".`);
        }
    }

    _limpiarEventos() {
        document.removeEventListener('click', this.handleOutsideClick);
    }

    unmount() {
        this.estaDesmontado = true;
        this.tokenConcurrenciaId++;
        this.qrScanner.detener();
        this.devolucionModal.cerrar();
        this._limpiarEventos();
        this.asignacionesMemoria.clear();
        this.container = null;
    }
}