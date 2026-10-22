import { resguardosService } from '/src/services/resguardos.js';
import { bienesService } from '/src/services/bienes.js';
import { adminService } from '/src/services/admin.js';

export class CreateResguardo {
    constructor() {
        this._html5QrCodeScanner = null;
    }

    obtenerPlantillaFormulario() {
        return `
            <div style="background:#f8f9fa; padding:15px; border:1px solid #e0e0e0; border-radius:4px; margin-bottom:20px;">
                <h4 id="form-titulo" style="margin:0 0 10px 0; font-size:13px; color:#37474f;">Nueva Asignación de Resguardo</h4>
                <form id="form-crear-resguardo">
                    <div style="display:flex; gap:15px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">No de Inventario</label>
                            <div style="display:flex; gap:6px;">
                                <input type="text" id="input-numero-inventario" name="numero_inventario" required placeholder="Número de inventario del bien" style="flex:1; padding:6px; border:1px solid #ccc; border-radius:4px;">
                                <button type="button" id="btn-camara-qr-resguardo" style="background:#0288d1; color:white; border:none; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; white-space:nowrap;">
                                    📷 Escanear QR
                                </button>
                            </div>
                            <div id="preview-bien-info" style="margin-top:4px; font-size:11px; min-height:16px;"></div>
                        </div>

                        <!-- Buscador predictivo por nombre -->
                        <div style="flex:1; position:relative;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Responsable (Búsqueda por Nombre) *</label>
                            <input type="text" id="input-busqueda-persona-resguardo" placeholder="Escriba el nombre del responsable..." autocomplete="off" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px; margin-bottom:4px;">
                            <div id="dropdown-resultados-resguardo" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; border-radius:0 0 4px 4px; max-height:150px; overflow-y:auto; z-index:1000; box-shadow:0 4px 6px rgba(0,0,0,0.1);"></div>
                            
                            <input type="text" id="input-curp" name="curp" required maxlength="18" minlength="18" readonly class="input-monospace" placeholder="CURP de 18 caracteres" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; text-transform:uppercase; background:#f5f5f5; font-size:11px;">
                        </div>
                    </div>
                    
                    <div id="contenedor-selector-ubicacion-resguardo"></div>
                    
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <button type="submit" id="btn-submit-resguardo" style="background:#00796b; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            Emitir Acta de Resguardo
                        </button>
                        <button type="button" id="btn-cancelar-edicion" style="display:none; background:#757575; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            Cancelar Edición
                        </button>
                    </div>
                    <div id="resguardo-error-feedback" style="color:#c62828; font-size:11px; margin-top:5px;"></div>
                </form>
            </div>

            <!-- Modal Escáner QR de Cámara -->
            <div id="modal-scanner-resguardo" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999;">
                <div style="background:white; padding:20px; border-radius:8px; max-width:400px; width:90%; text-align:center;">
                    <h4 style="margin-top:0; color:#0288d1;">Escanear Código QR del Bien</h4>
                    <div id="reader-qr-resguardo" style="width:100%; min-height:250px; background:#000; margin:10px 0; border-radius:4px;"></div>
                    <button type="button" id="btn-cerrar-scanner-resguardo" style="background:#c62828; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">
                        Cancelar Escaneo
                    </button>
                </div>
            </div>
        `;
    }

    bindEvents(containerElement) {
        if (!containerElement) return;

        const inputNumeroInventario = containerElement.querySelector('#input-numero-inventario');
        const btnCamara = containerElement.querySelector('#btn-camara-qr-resguardo');
        const btnCerrarScanner = containerElement.querySelector('#btn-cerrar-scanner-resguardo');

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
                            dropdown.innerHTML = '<div style="padding:8px; color:#757575; font-size:11px;">No se encontraron personas registradas.</div>';
                            dropdown.style.display = 'block';
                            return;
                        }

                        dropdown.innerHTML = personas.map(p => `
                            <div class="item-persona-sugerida" data-curp="${p.curp}" data-nombre="${p.nombres} ${p.apellidos}"
                                style="padding:8px; font-size:11px; border-bottom:1px solid #f0f0f0; cursor:pointer;"
                                onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='#fff'">
                                <div style="font-weight:600; color:#212121;">${p.nombres} ${p.apellidos}</div>
                                <div style="font-family:monospace; color:#0288d1;">CURP: ${p.curp}</div>
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
            btnCamara.addEventListener('click', () => this.iniciarEscanerCamara(containerElement));
        }

        if (btnCerrarScanner) {
            btnCerrarScanner.addEventListener('click', () => this.detenerEscanerCamara(containerElement));
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
            preview.innerHTML = '<span style="color:#f57c00;">Consultando datos del activo...</span>';
            const bien = await bienesService.obtenerBienPorNumeroInventario(numeroInventario);
            if (bien) {
                const detalles = [bien.marca, bien.modelo, bien.serie ? `S/N: ${bien.serie}` : null].filter(Boolean).join(' | ');
                preview.innerHTML = `<span style="color:#2e7d32; font-weight:600;">✓ ${bien.descripcion}</span> <span style="color:#666;">(${detalles || 'Sin más detalles'})</span>`;
            } else {
                preview.innerHTML = '<span style="color:#c62828;">Bien no encontrado.</span>';
            }
        } catch (error) {
            preview.innerHTML = '<span style="color:#c62828;">Bien no encontrado o número de inventario no válido.</span>';
        }
    }

    limpiarPreviewBien(containerElement) {
        const preview = containerElement.querySelector('#preview-bien-info');
        if (preview) preview.innerHTML = '';
    }

    iniciarEscanerCamara(containerElement) {
        if (!window.Html5Qrcode) {
            alert('Librería de escáner QR no disponible.');
            return;
        }

        const modalScanner = containerElement.querySelector('#modal-scanner-resguardo');
        if (modalScanner) modalScanner.style.display = 'flex';

        this._html5QrCodeScanner = new window.Html5Qrcode("reader-qr-resguardo");
        this._html5QrCodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                this.detenerEscanerCamara(containerElement);
                const inputNumeroInventario = containerElement.querySelector('#input-numero-inventario');
                if (inputNumeroInventario) {
                    inputNumeroInventario.value = decodedText;
                    this.validarYMostrarBien(decodedText, containerElement);
                }
            },
            () => {}
        ).catch(err => {
            alert('No se pudo acceder a la cámara: ' + err);
            this.detenerEscanerCamara(containerElement);
        });
    }

    detenerEscanerCamara(containerElement) {
        const modalScanner = containerElement?.querySelector('#modal-scanner-resguardo') || document.getElementById('modal-scanner-resguardo');
        if (this._html5QrCodeScanner) {
            this._html5QrCodeScanner.stop().then(() => {
                this._html5QrCodeScanner = null;
                if (modalScanner) modalScanner.style.display = 'none';
            }).catch(() => {
                if (modalScanner) modalScanner.style.display = 'none';
            });
        } else if (modalScanner) {
            modalScanner.style.display = 'none';
        }
    }

    async crear(payload) {
        return await resguardosService.crearAsignacion(payload);
    }

    unmount(containerElement) {
        this.detenerEscanerCamara(containerElement);
    }
}