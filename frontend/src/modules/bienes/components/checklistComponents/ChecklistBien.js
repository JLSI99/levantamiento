import { bienesService } from '/src/services/bienes.js';
import { QrScannerModal } from '/src/modules/bienes/components/activosComponents/QrScannerModal.js';
import { GaleriaModal } from '/src/modules/bienes/components/activosComponents/GaleriaModal.js';

export class ChecklistBien {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || { leer: true, borrar: false };
        this._abortController = new AbortController();

        this.bienSeleccionado = null;
        this.bienesCatalogo = [];
        this.inspeccionesRecientes = [];
        this.historialPaginado = [];
        this.historialOffset = 0;
        this.historialLimit = 15;
        this.historialTotal = 0;
        this.vistaDerechaActiva = 'checklist'; // 'checklist' | 'historial'

        this.galeriaModal = new GaleriaModal();
        this.qrScannerModal = new QrScannerModal((decodedText) => {
            this.buscarBienPorCodigo(decodedText, true);
        });
    }

    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    _obtenerUrlImagen(img) {
        if (!img) return '';
        return img.url || (img.path_archivo ? `/media/${img.path_archivo}` : '');
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: minmax(330px, 390px) 1fr; gap: 20px; align-items: start;">
                
                <!-- PANEL IZQUIERDO: ESCÁNER QR Y DICTAMEN -->
                <div class="module-card" style="margin-bottom: 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color, #e0e0e0); padding-bottom:10px; margin-bottom:14px;">
                        <h3 style="margin:0; color:var(--primary, #1a237e); font-size:15px;">
                            Verificación Física (Checklist)
                        </h3>
                        <button type="button" id="btn-chk-abrir-qr" 
                            style="background:var(--primary, #1a237e); color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; display:flex; align-items:center; gap:5px;">
                            📷 Escanear QR
                        </button>
                    </div>

                    <!-- Búsqueda manual por Número de Inventario -->
                    <div style="margin-bottom:12px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">
                            Número de Inventario o Código QR *
                        </label>
                        <div style="display:flex; gap:6px;">
                            <input type="text" id="chk-input-inventario" placeholder="Ej. INV-TIC-2026-001" autocomplete="off"
                                style="flex:1; padding:7px 9px; border:1px solid #ccc; border-radius:4px; font-size:12px; box-sizing:border-box;">
                            <button type="button" id="btn-chk-buscar-inv" 
                                style="background:#37474f; color:white; border:none; padding:7px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                                Buscar
                            </button>
                        </div>
                    </div>

                    <!-- Ficha Visual del Bien Localizado -->
                    <div id="chk-ficha-bien-preview" style="margin-bottom:14px; padding:10px; border:1px dashed #cfd8dc; border-radius:6px; background:#f8fafc;">
                        <div style="font-size:11px; color:var(--text-muted, #607d8b); text-align:center;">
                            Escanee un QR, busque un número de inventario o seleccione un activo de la lista derecha para verificarlo.
                        </div>
                    </div>

                    <!-- Formulario de Dictamen -->
                    <form id="form-chk-inspeccion">
                        <div style="margin-bottom:12px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:6px;">
                                1. ¿El bien se encuentra físicamente en sitio? *
                            </label>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                                <label id="lbl-presente-si" style="display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border:2px solid #2e7d32; background:#e8f5e9; color:#1b5e20; border-radius:5px; cursor:pointer; font-size:12px; font-weight:700;">
                                    <input type="radio" name="chk_esta_presente" value="true" checked style="margin:0;">
                                    ✅ Sí, está
                                </label>
                                <label id="lbl-presente-no" style="display:flex; align-items:center; justify-content:center; gap:6px; padding:8px; border:1px solid #ccc; background:#fff; color:#424242; border-radius:5px; cursor:pointer; font-size:12px; font-weight:600;">
                                    <input type="radio" name="chk_esta_presente" value="false" style="margin:0;">
                                    ❌ No está
                                </label>
                            </div>
                        </div>

                        <div id="wrapper-chk-estado-fisico" style="margin-bottom:12px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:6px;">
                                2. Estado físico del activo *
                            </label>
                            <select id="chk-select-estado" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:12px; font-weight:600; background:#fff;">
                                <option value="BUENO">🟢 BUENO — Óptimas condiciones</option>
                                <option value="NORMAL">🟡 NORMAL — Desgaste habitual de uso</option>
                                <option value="MALO">🔴 MALO — Dañado / Requiere atención</option>
                            </select>
                        </div>

                        <div style="margin-bottom:12px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">
                                3. Observaciones (Opcional)
                            </label>
                            <textarea id="chk-textarea-obs" rows="2" maxlength="255" placeholder="Notas sobre condición física, ubicación o motivo de ausencia..."
                                style="width:100%; padding:7px; border:1px solid #ccc; border-radius:4px; font-size:12px; box-sizing:border-box; resize:vertical;"></textarea>
                        </div>

                        <div style="margin-bottom:14px; display:flex; align-items:center; gap:6px; background:#f1f8e9; padding:7px 9px; border-radius:4px; border:1px solid #dcedc8;">
                            <input type="checkbox" id="chk-modo-rafaga" style="cursor:pointer;">
                            <label for="chk-modo-rafaga" style="font-size:11px; color:#33691e; font-weight:600; cursor:pointer;">
                                Abrir cámara QR automáticamente al guardar (escaneo continuo)
                            </label>
                        </div>

                        <button type="submit" id="btn-chk-guardar" 
                            style="width:100%; padding:10px; background:var(--primary, #1a237e); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:700; font-size:13px;">
                            Guardar Verificación en Checklist
                        </button>
                    </form>
                </div>

                <!-- PANEL DERECHO: LISTA DE CHEQUEO SEMESTRAL E HISTORIAL -->
                <div class="module-card" style="margin-bottom: 0; overflow-x: auto;">
                    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; border-bottom:1px solid var(--border-color, #e0e0e0); padding-bottom:10px; margin-bottom:12px;">
                        <div style="display:flex; gap:8px;">
                            <button type="button" id="btn-subtab-checklist" 
                                style="padding:6px 12px; border:none; border-radius:4px; background:var(--primary, #1a237e); color:white; font-size:12px; font-weight:600; cursor:pointer;">
                                ☑️ Lista de Chequeo (Semestral)
                            </button>
                            <button type="button" id="btn-subtab-historial" 
                                style="padding:6px 12px; border:none; border-radius:4px; background:#eceff1; color:#455a64; font-size:12px; font-weight:600; cursor:pointer;">
                                📋 Bitácora Histórica
                            </button>
                        </div>
                        <div id="chk-resumen-avance" style="font-size:11px; font-weight:700; color:#1b5e20; background:#e8f5e9; padding:4px 10px; border-radius:12px;">
                            Calculando avance...
                        </div>
                    </div>

                    <!-- SUBVISTA A: LISTA DE CHEQUEO SEMESTRAL -->
                    <div id="subview-checklist-semestral">
                        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                            <input type="text" id="chk-filtro-texto" placeholder="Filtrar por inventario o descripción..." 
                                style="flex:1; min-width:180px; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                            <select id="chk-filtro-avance" style="padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                                <option value="TODOS">Todos los bienes activos</option>
                                <option value="PENDIENTES">⬜ Pendientes este semestre</option>
                                <option value="VERIFICADOS">✅ Ya verificados este semestre</option>
                                <option value="ALERTAS">⚠️ Faltantes o en Mal Estado</option>
                            </select>
                            <button type="button" id="btn-chk-recargar-todo" 
                                style="padding:6px 10px; background:#455a64; color:white; border:none; border-radius:4px; font-size:12px; cursor:pointer;">
                                🔄 Actualizar
                            </button>
                        </div>
                        <div id="tabla-checklist-semestral-container">
                            <div style="text-align:center; padding:20px; color:#757575; font-size:12px;">Cargando lista de chequeo...</div>
                        </div>
                    </div>

                    <!-- SUBVISTA B: BITÁCORA HISTÓRICA DE INSPECCIONES -->
                    <div id="subview-historial-auditorias" style="display:none;">
                        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                            <input type="text" id="hist-filtro-inv" placeholder="Buscar N° Inventario..." 
                                style="flex:1; min-width:150px; padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                            <select id="hist-filtro-presencia" style="padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                                <option value="">Presencia: Todas</option>
                                <option value="true">✅ Presentes</option>
                                <option value="false">❌ Faltantes</option>
                            </select>
                            <select id="hist-filtro-estado" style="padding:6px 8px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                                <option value="">Estado: Todos</option>
                                <option value="BUENO">Bueno</option>
                                <option value="NORMAL">Normal</option>
                                <option value="MALO">Malo</option>
                                <option value="N/A">N/A (Faltante)</option>
                            </select>
                            <button type="button" id="btn-hist-filtrar" 
                                style="padding:6px 12px; background:var(--primary, #1a237e); color:white; border:none; border-radius:4px; font-size:12px; cursor:pointer; font-weight:600;">
                                Filtrar
                            </button>
                        </div>
                        <div id="tabla-historial-auditorias-container">
                            <div style="text-align:center; padding:20px; color:#757575; font-size:12px;">Cargando historial...</div>
                        </div>
                        <div id="paginacion-historial-container" style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:11px;"></div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.cargarDatosIniciales();
    }

    bindEvents() {
        const signal = this._abortController.signal;

        // Botón Escanear QR
        document.getElementById('btn-chk-abrir-qr')?.addEventListener('click', () => {
            this.qrScannerModal.iniciar();
        }, { signal });

        // Botón Buscar Inventario manual y tecla Enter
        const inputInv = document.getElementById('chk-input-inventario');
        document.getElementById('btn-chk-buscar-inv')?.addEventListener('click', () => {
            const val = inputInv?.value.trim();
            if (val) this.buscarBienPorCodigo(val, false);
        }, { signal });

        inputInv?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const val = inputInv.value.trim();
                if (val) this.buscarBienPorCodigo(val, false);
            }
        }, { signal });

        // Cambio en radio buttons de presencia (Sí / No)
        const radios = document.getElementsByName('chk_esta_presente');
        const lblSi = document.getElementById('lbl-presente-si');
        const lblNo = document.getElementById('lbl-presente-no');
        const wrapperEstado = document.getElementById('wrapper-chk-estado-fisico');

        radios.forEach((radio) => {
            radio.addEventListener('change', (e) => {
                const esPresente = e.target.value === 'true';
                if (esPresente) {
                    if (wrapperEstado) wrapperEstado.style.display = 'block';
                    if (lblSi) {
                        lblSi.style.border = '2px solid #2e7d32';
                        lblSi.style.background = '#e8f5e9';
                        lblSi.style.color = '#1b5e20';
                    }
                    if (lblNo) {
                        lblNo.style.border = '1px solid #ccc';
                        lblNo.style.background = '#fff';
                        lblNo.style.color = '#424242';
                    }
                } else {
                    if (wrapperEstado) wrapperEstado.style.display = 'none';
                    if (lblNo) {
                        lblNo.style.border = '2px solid #c62828';
                        lblNo.style.background = '#ffebee';
                        lblNo.style.color = '#b71c1c';
                    }
                    if (lblSi) {
                        lblSi.style.border = '1px solid #ccc';
                        lblSi.style.background = '#fff';
                        lblSi.style.color = '#424242';
                    }
                }
            }, { signal });
        });

        // Guardar Verificación
        document.getElementById('form-chk-inspeccion')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.guardarVerificacion();
        }, { signal });

        // Cambio de sub-pestañas en panel derecho
        const btnSubChecklist = document.getElementById('btn-subtab-checklist');
        const btnSubHistorial = document.getElementById('btn-subtab-historial');
        const subviewChecklist = document.getElementById('subview-checklist-semestral');
        const subviewHistorial = document.getElementById('subview-historial-auditorias');

        btnSubChecklist?.addEventListener('click', () => {
            this.vistaDerechaActiva = 'checklist';
            btnSubChecklist.style.background = 'var(--primary, #1a237e)';
            btnSubChecklist.style.color = 'white';
            btnSubHistorial.style.background = '#eceff1';
            btnSubHistorial.style.color = '#455a64';
            subviewChecklist.style.display = 'block';
            subviewHistorial.style.display = 'none';
        }, { signal });

        btnSubHistorial?.addEventListener('click', () => {
            this.vistaDerechaActiva = 'historial';
            btnSubHistorial.style.background = 'var(--primary, #1a237e)';
            btnSubHistorial.style.color = 'white';
            btnSubChecklist.style.background = '#eceff1';
            btnSubChecklist.style.color = '#455a64';
            subviewHistorial.style.display = 'block';
            subviewChecklist.style.display = 'none';
            this.cargarHistorialPaginado(0);
        }, { signal });

        // Filtros de Lista de Chequeo Semestral
        document.getElementById('chk-filtro-texto')?.addEventListener('input', () => {
            this.renderTablaChecklistSemestral();
        }, { signal });

        document.getElementById('chk-filtro-avance')?.addEventListener('change', () => {
            this.renderTablaChecklistSemestral();
        }, { signal });

        document.getElementById('btn-chk-recargar-todo')?.addEventListener('click', () => {
            this.cargarDatosIniciales();
        }, { signal });

        // Filtros de Bitácora Histórica
        document.getElementById('btn-hist-filtrar')?.addEventListener('click', () => {
            this.cargarHistorialPaginado(0);
        }, { signal });

        // Delegación de clics en el panel derecho (Ver Fotos, Auditar fila, Eliminar inspección)
        const container = document.getElementById(this.containerId);
        container?.addEventListener('click', async (e) => {
            const btnAuditar = e.target.closest('.btn-chk-auditar-fila');
            if (btnAuditar) {
                const inv = btnAuditar.getAttribute('data-inventario');
                if (inv) {
                    const bienLocal = this.bienesCatalogo.find(b => b.numero_inventario === inv);
                    if (bienLocal) {
                        this.seleccionarBien(bienLocal);
                    } else {
                        await this.buscarBienPorCodigo(inv, false);
                    }
                    document.getElementById('chk-input-inventario')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            const btnFotoPreview = e.target.closest('#btn-chk-ver-fotos-preview');
            if (btnFotoPreview && this.bienSeleccionado?.imagenes?.length > 0) {
                this.galeriaModal.abrir(this.bienSeleccionado.imagenes);
                return;
            }

            const btnFotoTabla = e.target.closest('.btn-chk-ver-galeria');
            if (btnFotoTabla) {
                const origen = btnFotoTabla.getAttribute('data-origen');
                const idRef = btnFotoTabla.getAttribute('data-id');
                if (origen === 'catalogo') {
                    const bien = this.bienesCatalogo.find(b => String(b.id_bien) === idRef);
                    if (bien?.imagenes?.length) this.galeriaModal.abrir(bien.imagenes);
                } else if (origen === 'historial') {
                    const insp = this.historialPaginado.find(i => String(i.id_inspeccion) === idRef);
                    if (insp?.bien?.imagenes?.length) this.galeriaModal.abrir(insp.bien.imagenes);
                }
                return;
            }

            const btnEliminarInsp = e.target.closest('.btn-chk-eliminar-inspeccion');
            if (btnEliminarInsp) {
                const idInsp = btnEliminarInsp.getAttribute('data-id');
                if (idInsp && confirm('¿Está seguro de eliminar este registro de inspección física?')) {
                    try {
                        await bienesService.eliminarInspeccion(idInsp);
                        await this.cargarDatosIniciales();
                        if (this.vistaDerechaActiva === 'historial') {
                            await this.cargarHistorialPaginado(this.historialOffset);
                        }
                    } catch (err) {
                        alert('Error al eliminar inspección: ' + (err.response?.data?.detail || err.message));
                    }
                }
            }
        }, { signal });
    }

    async buscarBienPorCodigo(codigoLimpio, desdeQr = false) {
        const codigo = String(codigoLimpio || '').trim();
        if (!codigo) return;

        const previewBox = document.getElementById('chk-ficha-bien-preview');
        if (previewBox) {
            previewBox.innerHTML = `<div style="font-size:12px; color:#1a237e; text-align:center;">Buscando activo "${this._escapeHtml(codigo)}"...</div>`;
        }

        try {
            const bien = await bienesService.obtenerBienPorQr(codigo);
            this.seleccionarBien(bien);
        } catch (err) {
            this.bienSeleccionado = null;
            if (previewBox) {
                previewBox.innerHTML = `
                    <div style="color:#c62828; font-size:12px; font-weight:600; text-align:center;">
                        ⚠️ No se encontró ningún bien con el código "${this._escapeHtml(codigo)}".
                    </div>
                `;
            }
            if (desdeQr) {
                alert(`El código QR escaneado (${codigo}) no corresponde a un activo registrado.`);
            }
        }
    }

    seleccionarBien(bien) {
        this.bienSeleccionado = bien;
        const inputInv = document.getElementById('chk-input-inventario');
        if (inputInv) inputInv.value = bien.numero_inventario;

        const previewBox = document.getElementById('chk-ficha-bien-preview');
        if (!previewBox) return;

        const imagenes = bien.imagenes || [];
        const thumbUrl = imagenes.length > 0 ? this._obtenerUrlImagen(imagenes[0]) : '';

        const bloqueImagen = thumbUrl
            ? `
                <div id="btn-chk-ver-fotos-preview" title="Clic para ampliar galería (${imagenes.length} foto/s)"
                    style="position:relative; width:74px; height:74px; border-radius:6px; overflow:hidden; border:1px solid #b0bec5; cursor:pointer; flex-shrink:0; background:#000;">
                    <img src="${this._escapeHtml(thumbUrl)}" alt="Foto bien" style="width:100%; height:100%; object-fit:cover;">
                    <span style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); color:#fff; font-size:9px; text-align:center; padding:2px 0;">
                        🔍 ${imagenes.length} foto${imagenes.length > 1 ? 's' : ''}
                    </span>
                </div>
            `
            : `
                <div style="width:74px; height:74px; border-radius:6px; border:1px dashed #b0bec5; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#eceff1; color:#78909c; font-size:10px; text-align:center; padding:4px;">
                    Sin foto
                </div>
            `;

        previewBox.style.borderStyle = 'solid';
        previewBox.style.borderColor = '#90caf9';
        previewBox.style.background = '#e3f2fd';
        previewBox.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center;">
                ${bloqueImagen}
                <div style="flex:1; min-width:0;">
                    <div style="font-size:11px; font-weight:700; color:#0d47a1;">
                        ${this._escapeHtml(bien.numero_inventario)}
                        ${!bien.esta_activo ? '<span style="background:#ffcdd2; color:#b71c1c; padding:1px 5px; border-radius:3px; font-size:9px; margin-left:4px;">BAJA</span>' : ''}
                    </div>
                    <div style="font-size:12px; font-weight:600; color:#212121; margin:2px 0; word-break:break-word;">
                        ${this._escapeHtml(bien.descripcion)}
                    </div>
                    <div style="font-size:10px; color:#455a64;">
                        ${bien.marca ? `Marca: ${this._escapeHtml(bien.marca)} · ` : ''}
                        ${bien.modelo ? `Mod: ${this._escapeHtml(bien.modelo)} · ` : ''}
                        ${bien.serie ? `S/N: ${this._escapeHtml(bien.serie)}` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async guardarVerificacion() {
        const inputInv = document.getElementById('chk-input-inventario');
        const numeroInventario = inputInv?.value.trim();

        if (!numeroInventario) {
            alert('Ingrese o escanee primero el número de inventario del bien.');
            return;
        }

        const radioPresente = document.querySelector('input[name="chk_esta_presente"]:checked');
        const estaPresente = radioPresente ? radioPresente.value === 'true' : true;
        const estadoFisico = estaPresente
            ? (document.getElementById('chk-select-estado')?.value || 'BUENO')
            : 'N/A';
        const observaciones = document.getElementById('chk-textarea-obs')?.value.trim() || null;

        const btnGuardar = document.getElementById('btn-chk-guardar');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
        }

        try {
            await bienesService.registrarInspeccion({
                numero_inventario: numeroInventario,
                esta_presente: estaPresente,
                estado_fisico: estadoFisico,
                observaciones
            });

            // Limpiar observaciones y recargar tablas
            const txtObs = document.getElementById('chk-textarea-obs');
            if (txtObs) txtObs.value = '';

            await this.cargarDatosIniciales();
            if (this.vistaDerechaActiva === 'historial') {
                await this.cargarHistorialPaginado(0);
            }

            const modoRafaga = document.getElementById('chk-modo-rafaga')?.checked;
            if (modoRafaga) {
                this.qrScannerModal.iniciar();
            } else {
                alert(`✅ Verificación registrada para el activo ${numeroInventario}.`);
            }
        } catch (err) {
            alert('Error al guardar verificación: ' + (err.response?.data?.detail || err.message));
        } finally {
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Guardar Verificación en Checklist';
            }
        }
    }

    async cargarDatosIniciales() {
        try {
            const [resBienes, resInspecciones] = await Promise.all([
                bienesService.listarBienes(100, 0, false),
                bienesService.listarInspecciones({ limit: 100, offset: 0 })
            ]);

            this.bienesCatalogo = resBienes?.data || [];
            this.inspeccionesRecientes = resInspecciones?.data || [];

            this.renderTablaChecklistSemestral();
        } catch (err) {
            const cont = document.getElementById('tabla-checklist-semestral-container');
            if (cont) {
                cont.innerHTML = `<div style="color:var(--danger, #c62828); font-size:12px; padding:12px;">Error al cargar datos del checklist: ${this._escapeHtml(err.message)}</div>`;
            }
        }
    }

    _obtenerUltimaInspeccionPorBien(idBien) {
        // inspeccionesRecientes viene ordenado por fecha_inspeccion DESC
        return this.inspeccionesRecientes.find(i => String(i.id_bien) === String(idBien)) || null;
    }

    _esDelSemestreActual(fechaIso) {
        if (!fechaIso) return false;
        const fecha = new Date(fechaIso);
        const limite = new Date();
        limite.setDate(limite.getDate() - 180); // Últimos 6 meses (semestre)
        return fecha >= limite;
    }

    renderTablaChecklistSemestral() {
        const cont = document.getElementById('tabla-checklist-semestral-container');
        const badgeAvance = document.getElementById('chk-resumen-avance');
        if (!cont) return;

        const texto = (document.getElementById('chk-filtro-texto')?.value || '').trim().toLowerCase();
        const filtroAvance = document.getElementById('chk-filtro-avance')?.value || 'TODOS';

        let totalActivos = this.bienesCatalogo.length;
        let verificadosSemestre = 0;

        const enriquecidos = this.bienesCatalogo.map((bien) => {
            const ultima = this._obtenerUltimaInspeccionPorBien(bien.id_bien);
            const verificadoReciente = ultima ? this._esDelSemestreActual(ultima.fecha_inspeccion) : false;
            if (verificadoReciente) verificadosSemestre++;
            return { bien, ultima, verificadoReciente };
        });

        if (badgeAvance) {
            const pct = totalActivos > 0 ? Math.round((verificadosSemestre / totalActivos) * 100) : 0;
            badgeAvance.textContent = `Avance Semestral: ${verificadosSemestre} / ${totalActivos} (${pct}%)`;
        }

        const filtrados = enriquecidos.filter(({ bien, ultima, verificadoReciente }) => {
            if (texto) {
                const coincideInv = bien.numero_inventario?.toLowerCase().includes(texto);
                const coincideDesc = bien.descripcion?.toLowerCase().includes(texto);
                const coincideMarca = bien.marca?.toLowerCase().includes(texto);
                if (!coincideInv && !coincideDesc && !coincideMarca) return false;
            }
            if (filtroAvance === 'PENDIENTES' && verificadoReciente) return false;
            if (filtroAvance === 'VERIFICADOS' && !verificadoReciente) return false;
            if (filtroAvance === 'ALERTAS') {
                if (!ultima) return false;
                if (ultima.esta_presente && ultima.estado_fisico !== 'MALO') return false;
            }
            return true;
        });

        if (filtrados.length === 0) {
            cont.innerHTML = `<div style="text-align:center; padding:20px; color:#757575; font-size:12px;">No hay bienes que coincidan con el filtro seleccionado.</div>`;
            return;
        }

        const filasHtml = filtrados.map(({ bien, ultima, verificadoReciente }) => {
            const imgs = bien.imagenes || [];
            const thumbUrl = imgs.length > 0 ? this._obtenerUrlImagen(imgs[0]) : '';
            const celdaFoto = thumbUrl
                ? `<img src="${this._escapeHtml(thumbUrl)}" class="btn-chk-ver-galeria" data-origen="catalogo" data-id="${bien.id_bien}" title="Ver ${imgs.length} foto(s)"
                    style="width:36px; height:36px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid #cfd8dc;">`
                : `<span style="font-size:10px; color:#9e9e9e;">Sin foto</span>`;

            let estadoHtml = `<span style="color:#757575; font-size:11px;">Sin revisiones previas</span>`;
            if (ultima) {
                const fechaFmt = new Date(ultima.fecha_inspeccion).toLocaleDateString('es-MX');
                const badgeEstado = !ultima.esta_presente
                    ? `<span style="background:#ffebee; color:#c62828; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">FALTANTE</span>`
                    : ultima.estado_fisico === 'BUENO'
                        ? `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">BUENO</span>`
                        : ultima.estado_fisico === 'NORMAL'
                            ? `<span style="background:#fff8e1; color:#f57f17; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">NORMAL</span>`
                            : `<span style="background:#ffebee; color:#c62828; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">MALO</span>`;

                estadoHtml = `
                    <div>${badgeEstado} <span style="font-size:10px; color:#616161;">(${fechaFmt})</span></div>
                    <div style="font-size:10px; color:#757575;">Por: ${this._escapeHtml(ultima.auditor?.apellidos || '')}</div>
                `;
            }

            const checkIcon = verificadoReciente
                ? `<span title="Verificado en este semestre" style="font-size:16px;">☑️</span>`
                : `<span title="Pendiente de verificar" style="font-size:16px; opacity:0.45;">⬜</span>`;

            return `
                <tr style="border-bottom:1px solid #eee; background:${verificadoReciente ? '#fafffa' : '#fff'};">
                    <td style="padding:8px 6px; text-align:center;">${checkIcon}</td>
                    <td style="padding:8px 6px; text-align:center;">${celdaFoto}</td>
                    <td style="padding:8px 6px;">
                        <div style="font-weight:700; font-size:11px; color:#1a237e;">${this._escapeHtml(bien.numero_inventario)}</div>
                        <div style="font-size:12px; color:#212121;">${this._escapeHtml(bien.descripcion)}</div>
                        <div style="font-size:10px; color:#757575;">${this._escapeHtml([bien.marca, bien.modelo].filter(Boolean).join(' · '))}</div>
                    </td>
                    <td style="padding:8px 6px;">${estadoHtml}</td>
                    <td style="padding:8px 6px; text-align:right;">
                        <button type="button" class="btn-chk-auditar-fila" data-inventario="${this._escapeHtml(bien.numero_inventario)}"
                            style="padding:5px 10px; background:#0277bd; color:white; border:none; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">
                            Auditar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        cont.innerHTML = `
            <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                <thead>
                    <tr style="background:#f5f5f5; border-bottom:2px solid #e0e0e0; font-size:11px; color:#424242;">
                        <th style="padding:8px 6px; text-align:center; width:40px;">Check</th>
                        <th style="padding:8px 6px; text-align:center; width:50px;">Foto</th>
                        <th style="padding:8px 6px;">Activo / Inventario</th>
                        <th style="padding:8px 6px;">Última Verificación</th>
                        <th style="padding:8px 6px; text-align:right;">Acción</th>
                    </tr>
                </thead>
                <tbody>${filasHtml}</tbody>
            </table>
        `;
    }

    async cargarHistorialPaginado(offset = 0) {
        const cont = document.getElementById('tabla-historial-auditorias-container');
        const pagCont = document.getElementById('paginacion-historial-container');
        if (!cont) return;

        this.historialOffset = offset;
        cont.innerHTML = `<div style="text-align:center; padding:20px; color:#757575; font-size:12px;">Consultando bitácora de auditorías...</div>`;

        const inv = document.getElementById('hist-filtro-inv')?.value.trim() || null;
        const pres = document.getElementById('hist-filtro-presencia')?.value || null;
        const est = document.getElementById('hist-filtro-estado')?.value || null;

        try {
            const res = await bienesService.listarInspecciones({
                limit: this.historialLimit,
                offset: this.historialOffset,
                numero_inventario: inv,
                esta_presente: pres,
                estado_fisico: est
            });

            this.historialPaginado = res?.data || [];
            this.historialTotal = res?.total || 0;

            if (this.historialPaginado.length === 0) {
                cont.innerHTML = `<div style="text-align:center; padding:20px; color:#757575; font-size:12px;">No se encontraron registros de inspección.</div>`;
                if (pagCont) pagCont.innerHTML = '';
                return;
            }

            const rows = this.historialPaginado.map((item) => {
                const fechaStr = new Date(item.fecha_inspeccion).toLocaleString('es-MX');
                const imgs = item.bien?.imagenes || [];
                const thumbUrl = imgs.length > 0 ? this._obtenerUrlImagen(imgs[0]) : '';
                const celdaFoto = thumbUrl
                    ? `<img src="${this._escapeHtml(thumbUrl)}" class="btn-chk-ver-galeria" data-origen="historial" data-id="${item.id_inspeccion}" title="Ver ${imgs.length} foto(s)"
                        style="width:36px; height:36px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid #cfd8dc;">`
                    : `<span style="font-size:10px; color:#9e9e9e;">Sin foto</span>`;

                const badgePresencia = item.esta_presente
                    ? `<span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">PRESENTE</span>`
                    : `<span style="background:#ffebee; color:#c62828; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">FALTANTE</span>`;

                const auditorNombre = `${item.auditor?.apellidos || ''}, ${item.auditor?.nombres || ''}`.trim();

                return `
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:7px 6px; font-size:11px; white-space:nowrap;">${fechaStr}</td>
                        <td style="padding:7px 6px; text-align:center;">${celdaFoto}</td>
                        <td style="padding:7px 6px;">
                            <div style="font-weight:700; font-size:11px; color:#1a237e;">${this._escapeHtml(item.bien?.numero_inventario)}</div>
                            <div style="font-size:11px; color:#333;">${this._escapeHtml(item.bien?.descripcion)}</div>
                        </td>
                        <td style="padding:7px 6px; text-align:center;">${badgePresencia}</td>
                        <td style="padding:7px 6px; font-weight:700; font-size:11px;">${this._escapeHtml(item.estado_fisico)}</td>
                        <td style="padding:7px 6px; font-size:11px;">
                            <div>${this._escapeHtml(auditorNombre)}</div>
                            <div style="font-size:9px; color:#757575;">${this._escapeHtml(item.auditor?.curp)}</div>
                        </td>
                        <td style="padding:7px 6px; font-size:11px; color:#555;">${this._escapeHtml(item.observaciones || '—')}</td>
                        ${this.permisos.borrar ? `
                        <td style="padding:7px 6px; text-align:center;">
                            <button type="button" class="btn-chk-eliminar-inspeccion" data-id="${item.id_inspeccion}" title="Eliminar registro"
                                style="background:#ffebee; color:#c62828; border:1px solid #ffcdd2; border-radius:4px; padding:3px 7px; cursor:pointer; font-size:11px;">
                                🗑️
                            </button>
                        </td>` : ''}
                    </tr>
                `;
            }).join('');

            cont.innerHTML = `
                <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                    <thead>
                        <tr style="background:#f5f5f5; border-bottom:2px solid #e0e0e0; font-size:11px; color:#424242;">
                            <th style="padding:7px 6px;">Fecha / Hora</th>
                            <th style="padding:7px 6px; text-align:center;">Foto</th>
                            <th style="padding:7px 6px;">Bien</th>
                            <th style="padding:7px 6px; text-align:center;">Presencia</th>
                            <th style="padding:7px 6px;">Estado</th>
                            <th style="padding:7px 6px;">Auditor</th>
                            <th style="padding:7px 6px;">Observaciones</th>
                            ${this.permisos.borrar ? '<th style="padding:7px 6px; text-align:center;">Acción</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;

            if (pagCont) {
                const fin = Math.min(this.historialOffset + this.historialLimit, this.historialTotal);
                pagCont.innerHTML = `
                    <span>Mostrando ${this.historialOffset + 1}–${fin} de ${this.historialTotal} revisiones</span>
                    <div style="display:flex; gap:6px;">
                        <button type="button" id="btn-hist-prev" ${this.historialOffset === 0 ? 'disabled' : ''} 
                            style="padding:4px 8px; border:1px solid #ccc; border-radius:3px; cursor:pointer;">◀ Anterior</button>
                        <button type="button" id="btn-hist-next" ${fin >= this.historialTotal ? 'disabled' : ''} 
                            style="padding:4px 8px; border:1px solid #ccc; border-radius:3px; cursor:pointer;">Siguiente ▶</button>
                    </div>
                `;
                document.getElementById('btn-hist-prev')?.addEventListener('click', () => {
                    this.cargarHistorialPaginado(Math.max(0, this.historialOffset - this.historialLimit));
                });
                document.getElementById('btn-hist-next')?.addEventListener('click', () => {
                    this.cargarHistorialPaginado(this.historialOffset + this.historialLimit);
                });
            }
        } catch (err) {
            cont.innerHTML = `<div style="color:var(--danger, #c62828); font-size:12px; padding:12px;">Error al consultar historial: ${this._escapeHtml(err.message)}</div>`;
        }
    }

    unmount() {
        this._abortController.abort();
        this.qrScannerModal?.unmount();
        this.galeriaModal?.unmount();
    }
}