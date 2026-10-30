import { resguardosService } from '/src/services/resguardos.js';
import { bienesService } from '/src/services/bienes.js';
import { adminService } from '/src/services/admin.js';
import { QrScannerModal } from './QrScannerModal.js';

export class CreateResguardo {
    constructor() {
        this.qrScanner = new QrScannerModal('reader-qr-resguardo', 'modal-scanner-resguardo', (decodedText) => {
            const containerElement = this._containerActual;
            if (containerElement) {
                const inputNumeroInventario = containerElement.querySelector('#input-numero-inventario');
                if (inputNumeroInventario) {
                    inputNumeroInventario.value = decodedText;
                    this.validarYMostrarBien(decodedText, containerElement);
                }
            }
        });
        this._containerActual = null;
    }

    obtenerPlantillaFormulario() {
        return `
            <div class="module-card" style="background:var(--bg-card, #f8f9fa); padding:15px; border:1px solid var(--border-color, #e0e0e0); border-radius:4px; margin-bottom:20px; width:100%; box-sizing:border-box;">
                <h4 id="form-titulo" style="margin:0 0 10px 0; font-size:14px; font-weight:700; color:var(--text-main, #37474f); border-bottom:1px solid var(--border-color, #e0e0e0); padding-bottom:8px;">Nueva Asignación de Resguardo</h4>
                <form id="form-crear-resguardo" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                    <div style="display:flex; gap:15px; flex-wrap:wrap; width:100%;">
                        <div style="flex:1; min-width:240px; box-sizing:border-box;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">No de Inventario *</label>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <!-- BOTÓN DE ESCANEAR QR AL INICIO -->
                                <button type="button" id="btn-camara-qr-resguardo" style="background:var(--primary, #0288d1); color:white; border:none; padding:8px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; white-space:nowrap;">
                                    📷 Escanear QR
                                </button>
                                <input type="text" id="input-numero-inventario" name="numero_inventario" required placeholder="Número de inventario del bien" style="flex:1; min-width:140px; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main); box-sizing:border-box;">
                            </div>
                            <div id="preview-bien-info" style="margin-top:4px; font-size:11px; min-height:16px;"></div>
                        </div>

                        <!-- Buscador predictivo por nombre -->
                        <div style="flex:1; min-width:240px; position:relative; box-sizing:border-box;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Responsable (Búsqueda por Nombre) *</label>
                            <input type="text" id="input-busqueda-persona-resguardo" placeholder="Escriba el nombre del responsable..." autocomplete="off" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; font-size:12px; margin-bottom:6px; background:var(--bg-input, #fff); color:var(--text-main); box-sizing:border-box;">
                            <div id="dropdown-resultados-resguardo" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-card, white); border:1px solid var(--border-color, #ccc); border-radius:0 0 4px 4px; max-height:150px; overflow-y:auto; z-index:1000; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                            
                            <input type="text" id="input-curp" name="curp" required maxlength="18" minlength="18" readonly class="input-monospace" placeholder="CURP de 18 caracteres" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; text-transform:uppercase; background:var(--bg-disabled, #f5f5f5); color:var(--text-main); font-size:11px; box-sizing:border-box;">
                        </div>
                    </div>
                    
                    <div id="contenedor-selector-ubicacion-resguardo" style="width:100%; box-sizing:border-box;"></div>
                    
                    <div style="margin-top:6px; display:flex; gap:10px; flex-wrap:wrap;">
                        <button type="submit" id="btn-submit-resguardo" style="background:var(--success, #00796b); color:white; border:none; padding:10px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; flex:1; min-width:140px;">
                            Emitir Acta de Resguardo
                        </button>
                        <button type="button" id="btn-cancelar-edicion" style="display:none; background:var(--text-muted, #757575); color:white; border:none; padding:10px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; flex:1; min-width:140px;">
                            Cancelar Edición
                        </button>
                    </div>
                    <div id="resguardo-error-feedback" style="color:var(--danger, #c62828); font-size:11px; margin-top:5px;"></div>
                </form>
            </div>
        `;
    }

    bindEvents(containerElement) {
        if (!containerElement) return;
        this._containerActual = containerElement;

        const inputNumeroInventario = containerElement.querySelector('#input-numero-inventario');
        const btnCamara = containerElement.querySelector('#btn-camara-qr-resguardo');

        // Lógica de autocompletado para el responsable
        const inputBusqueda = containerElement.querySelector('#input-busqueda-persona-resguardo');
        const inputCurp = containerElement.querySelector('#input-curp');
        const dropdown = containerElement.querySelector('#dropdown-resultados-resguardo');

        if (inputBusqueda && dropdown && inputCurp) {
            let debounceTimer = null;
            inputBusqueda.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                clearTimeout(debounceTimer);

                if (query.length < 2) {
                    dropdown.style.display = 'none';
                    dropdown.innerHTML = '';
                    return;
                }

                debounceTimer = setTimeout(async () => {
                    try {
                        const resp = await adminService.listarPersonas(10, 0, false, null, query);
                        const personas = Array.isArray(resp) ? resp : (resp?.data || []);

                        if (personas.length === 0) {
                            dropdown.innerHTML = '<div style="padding:8px; color:var(--text-muted, #757575); font-size:11px;">No se encontraron personas registradas.</div>';
                            dropdown.style.display = 'block';
                            return;
                        }

                        dropdown.innerHTML = personas.map(p => `
                            <div class="item-persona-sugerida" data-curp="${p.curp}" data-nombre="${p.nombres} ${p.apellidos}"
                                style="padding:8px; font-size:11px; border-bottom:1px solid var(--border-color, #f0f0f0); cursor:pointer;"
                                onmouseover="this.style.background='var(--hover-bg, #f5f5f5)'" onmouseout="this.style.background='var(--bg-card, #fff)'">
                                <div style="font-weight:600; color:var(--text-main, #212121);">${p.nombres} ${p.apellidos}</div>
                                <div style="font-family:monospace; color:var(--primary, #0288d1);">CURP: ${p.curp}</div>
                            </div>
                        `).join('');
                        dropdown.style.display = 'block';

                        dropdown.querySelectorAll('.item-persona-sugerida').forEach(item => {
                            item.addEventListener('click', () => {
                                const curp = item.getAttribute('data-curp');
                                const nombre = item.getAttribute('data-nombre');
                                inputCurp.value = curp;
                                inputBusqueda.value = `${nombre} (${curp})`;
                                dropdown.style.display = 'none';
                            });
                        });
                    } catch (err) {
                        console.error("Error en búsqueda autocompletada de resguardo:", err);
                    }
                }, 300);
            });

            document.addEventListener('click', (ev) => {
                if (!inputBusqueda.contains(ev.target) && !dropdown.contains(ev.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }

        if (btnCamara) {
            btnCamara.addEventListener('click', () => this.qrScanner.iniciar());
        }

        if (inputNumeroInventario) {
            let timeoutId = null;
            inputNumeroInventario.addEventListener('input', (e) => {
                clearTimeout(timeoutId);
                const val = e.target.value.trim();
                if (val.length >= 3) {
                    timeoutId = setTimeout(() => this.validarYMostrarBien(val, containerElement), 300);
                } else {
                    this.limpiarPreviewBien(containerElement);
                }
            });

            inputNumeroInventario.addEventListener('change', (e) => {
                const val = e.target.value.trim();
                if (val) this.validarYMostrarBien(val, containerElement);
            });
        }
    }

    async validarYMostrarBien(numeroInventario, containerElement) {
        const preview = containerElement.querySelector('#preview-bien-info');
        if (!preview) return;

        try {
            preview.innerHTML = '<span style="color:var(--warning, #f57c00);">Consultando datos del activo...</span>';
            const bien = await bienesService.obtenerBienPorNumeroInventario(numeroInventario);
            if (bien) {
                const detalles = [bien.marca, bien.modelo, bien.serie ? `S/N: ${bien.serie}` : null].filter(Boolean).join(' | ');
                preview.innerHTML = `<span style="color:var(--success, #2e7d32); font-weight:600;">✓ ${bien.descripcion}</span> <span style="color:var(--text-muted, #666);">(${detalles || 'Sin más detalles'})</span>`;
            } else {
                preview.innerHTML = '<span style="color:var(--danger, #c62828);">Bien no encontrado.</span>';
            }
        } catch (error) {
            preview.innerHTML = '<span style="color:var(--danger, #c62828);">Bien no encontrado o número de inventario no válido.</span>';
        }
    }

    limpiarPreviewBien(containerElement) {
        const preview = containerElement.querySelector('#preview-bien-info');
        if (preview) preview.innerHTML = '';
    }

    async crear(payload) {
        return await resguardosService.crearAsignacion(payload);
    }

    unmount() {
        this.qrScanner.detener();
        this._containerActual = null;
    }
}