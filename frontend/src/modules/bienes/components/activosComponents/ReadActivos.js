import { bienesService } from '/src/services/bienes.js';

export class ReadActivos {
    constructor(containerId, permisos, onEdit, onDelete) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onEdit = onEdit;
        this.onDelete = onDelete;
        
        this._cache = new Map();
        this._abortController = new AbortController();
        this._html5QrCodeScanner = null;

        this._galeriaActual = [];
        this._indexGaleriaActual = 0;
    }

    render() {
        const tableContainer = document.getElementById(this.containerId);
        if (!tableContainer) return;

        tableContainer.innerHTML = `
            <div style="background:white; border: 1px solid #e0e0e0; border-radius: 4px; padding:15px; overflow-x: auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h4 style="margin:0; color:#424242;">Inventario Patrimonial</h4>
                    
                    <!-- Barra de Búsqueda y Escaneo QR -->
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="input-buscar-qr" placeholder="Buscar por ID / Serie / QR..." 
                            style="padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:12px; width:220px;">
                        <button id="btn-camara-qr" style="background:#0288d1; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            📷 Escanear QR
                        </button>
                    </div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:12px; min-width: 650px;">
                    <thead>
                        <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                            <th style="padding:8px; width:65px; text-align:center;">Foto</th>
                            <th style="padding:8px;">Descripción / ID</th>
                            <th style="padding:8px;">Detalles (Marca/Mod/Serie)</th>
                            <th style="padding:8px;">Costo</th>
                            <th style="padding:8px;">Categorías</th>
                            <th style="padding:8px; text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-activos">
                        <tr><td colspan="6" style="padding:15px; text-align:center;">Cargando inventario...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Modal Visualizador / Carrusel de Galería de Imágenes -->
            <div id="modal-img-preview" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); justify-content:center; align-items:center; z-index:9999;">
                <div style="position:relative; background:white; padding:15px; border-radius:8px; max-width:85vw; max-height:85vh; display:flex; flex-direction:column; align-items:center; min-width:320px;">
                    <button id="btn-cerrar-img-modal" style="position:absolute; top:-12px; right:-12px; background:#c62828; color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.3);">&times;</button>
                    
                    <!-- Imagen Principal del Carrusel -->
                    <div style="position:relative; display:flex; align-items:center; justify-content:center; width:100%; height:60vh; background:#111; border-radius:6px; overflow:hidden;">
                        <button id="btn-galeria-prev" style="position:absolute; left:10px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; font-weight:bold; font-size:16px; z-index:10;">◀</button>
                        
                        <img id="img-modal-target" src="" alt="Vista previa del bien" style="max-width:100%; max-height:100%; object-fit:contain; display:block;">
                        
                        <button id="btn-galeria-next" style="position:absolute; right:10px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; font-weight:bold; font-size:16px; z-index:10;">▶</button>
                    </div>

                    <!-- Indicador y Miniaturas de la Galería -->
                    <div id="galeria-contador" style="margin-top:8px; font-size:12px; font-weight:600; color:#424242;"></div>
                    <div id="galeria-thumbs-modal" style="display:flex; gap:8px; margin-top:8px; overflow-x:auto; max-width:100%; padding:4px;"></div>
                </div>
            </div>

            <!-- Modal Generador e Impresor de Etiqueta QR -->
            <div id="modal-qr-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999;">
                <div style="background:white; padding:20px; border-radius:8px; max-width:420px; width:90%; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                    <h4 style="margin-top:0; color:#1a237e;">Etiqueta Patrimonial del Bien</h4>
                    
                    <div id="print-sticker-area" style="border:2px dashed #000; padding:15px; border-radius:6px; margin:15px 0; background:#fff; text-align:center;">
                        <div style="font-size:10px; font-weight:bold; text-transform:uppercase; color:#333; margin-bottom:4px;">TecNM - Patrimonio Institucional</div>
                        <div id="qr-code-box" style="display:flex; justify-content:center; margin:10px 0;"></div>
                        <div id="qr-info-desc" style="font-weight:bold; font-size:12px; margin-bottom:2px;"></div>
                        <div id="qr-info-details" style="font-size:10px; color:#555;"></div>
                        <div id="qr-info-id" style="font-family:monospace; font-size:10px; margin-top:4px; font-weight:600;"></div>
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button id="btn-imprimir-qr" style="background:#2e7d32; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">
                            🖨️ Imprimir Etiqueta
                        </button>
                        <button id="btn-cerrar-modal-qr" style="background:#757575; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal Escáner de Cámara QR -->
            <div id="modal-scanner-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999;">
                <div style="background:white; padding:20px; border-radius:8px; max-width:400px; width:90%; text-align:center;">
                    <h4 style="margin-top:0; color:#0288d1;">Escanear Código QR</h4>
                    <div id="reader-qr-camera" style="width:100%; min-height:250px; background:#000; margin:10px 0; border-radius:4px;"></div>
                    <button id="btn-cerrar-scanner" style="background:#c62828; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">
                        Cancelar Escaneo
                    </button>
                </div>
            </div>
        `;

        this.injectPrintStyles();
        this.bindEvents();
        this.cargarDatos();
    }

    injectPrintStyles() {
        if (!document.getElementById('style-print-qr')) {
            const style = document.createElement('style');
            style.id = 'style-print-qr';
            style.innerHTML = `
                @media print {
                    body * { visibility: hidden !important; }
                    #print-sticker-area, #print-sticker-area * { visibility: visible !important; }
                    #print-sticker-area { 
                        position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; border: 2px solid #000 !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const tbody = document.getElementById('tbody-activos');
        
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.btn-edit-act');
                const btnDel = e.target.closest('.btn-del-act');
                const btnQr = e.target.closest('.btn-qr-act');
                const imgThumb = e.target.closest('.img-thumb-preview');

                if (btnEdit) {
                    const id = btnEdit.getAttribute('data-id');
                    const item = this._cache.get(id);
                    if (this.onEdit) this.onEdit(id, item);
                } else if (btnDel && this.permisos.borrar) {
                    if (this.onDelete) this.onDelete(btnDel.getAttribute('data-id'));
                } else if (btnQr) {
                    this.abrirModalQR(btnQr.getAttribute('data-id'));
                } else if (imgThumb) {
                    const idBien = imgThumb.getAttribute('data-id-bien');
                    if (idBien) this.abrirGaleriaModal(idBien);
                }
            }, { signal });
        }

        const inputBuscar = document.getElementById('input-buscar-qr');
        if (inputBuscar) {
            inputBuscar.addEventListener('input', (e) => this.filtrarTabla(e.target.value.trim()), { signal });
        }

        document.getElementById('btn-galeria-prev')?.addEventListener('click', () => this.cambiarImagenGaleria(-1), { signal });
        document.getElementById('btn-galeria-next')?.addEventListener('click', () => this.cambiarImagenGaleria(1), { signal });

        document.getElementById('galeria-thumbs-modal')?.addEventListener('click', (e) => {
            const thumb = e.target.closest('.modal-thumb-item');
            if (thumb) {
                const idx = parseInt(thumb.getAttribute('data-index'), 10);
                if (!isNaN(idx)) this.mostrarImagenGaleria(idx);
            }
        }, { signal });

        document.getElementById('btn-imprimir-qr')?.addEventListener('click', () => window.print(), { signal });
        document.getElementById('btn-cerrar-modal-qr')?.addEventListener('click', () => {
            document.getElementById('modal-qr-container').style.display = 'none';
        }, { signal });

        document.getElementById('btn-cerrar-img-modal')?.addEventListener('click', () => {
            document.getElementById('modal-img-preview').style.display = 'none';
        }, { signal });

        document.getElementById('btn-camara-qr')?.addEventListener('click', () => this.iniciarEscanerCamara(), { signal });
        document.getElementById('btn-cerrar-scanner')?.addEventListener('click', () => this.detenerEscanerCamara(), { signal });
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-activos');
        if (!tbody) return;
        try {
            const resp = await bienesService.listarBienes(100, 0, false);
            const data = resp.data || [];
            
            this._cache.clear();
            data.forEach(d => this._cache.set(d.id_bien, d));

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px;">No hay activos registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(d => {
                const idCorto = d.id_bien.substring(0, 8);
                const categorias = (d.tipos || []).map(t => `<span style="background:#e3f2fd; color:#1565c0; padding:2px 6px; border-radius:3px; margin:2px; display:inline-block;">${t.nombre}</span>`).join('');
                const detalles = [d.marca, d.modelo, d.serie].filter(Boolean).join(' / ') || '<span style="color:#9e9e9e;">Sin detalles</span>';
                
                const imagenes = d.imagenes || [];
                const totalImagenes = imagenes.length;
                const primeraImgObj = totalImagenes > 0 ? imagenes[0] : null;
                const primeraImagenUrl = primeraImgObj 
                    ? (primeraImgObj.url || (primeraImgObj.path_archivo ? `/media/${primeraImgObj.path_archivo}` : null))
                    : null;

                const badgeHtml = totalImagenes > 1 
                    ? `<span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.75); color:white; font-size:9px; font-weight:bold; padding:1px 4px; border-radius:3px;">+${totalImagenes - 1}</span>`
                    : '';

                const thumbHtml = primeraImagenUrl 
                    ? `<div style="position:relative; display:inline-block;">
                        <img src="${primeraImagenUrl}" class="img-thumb-preview" data-id-bien="${d.id_bien}" title="Clic para abrir galería (${totalImagenes})" style="width:42px; height:42px; object-fit:cover; border-radius:4px; border:1px solid #ccc; cursor:pointer; display:block;">
                        ${badgeHtml}
                       </div>`
                    : `<div style="width:42px; height:42px; background:#f0f0f0; border-radius:4px; display:flex; align-items:center; justify-content:center; color:#9e9e9e; font-size:16px;">📷</div>`;

                return `
                    <tr style="border-bottom:1px solid #e0e0e0; ${d.esta_activo ? '' : 'opacity:0.5;'}">
                        <td style="padding:8px; text-align:center;">${thumbHtml}</td>
                        <td style="padding:8px;">
                            <div style="font-weight:600; color:#212121;">${d.descripcion}</div>
                            <div style="font-family:monospace; color:#757575; font-size:10px;">ID: ${idCorto}...</div>
                        </td>
                        <td style="padding:8px;">${detalles}</td>
                        <td style="padding:8px; font-weight:bold;">$${parseFloat(d.costo || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                        <td style="padding:8px;">${categorias}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center;">
                                <button class="btn-qr-act" data-id="${d.id_bien}" style="background:#0288d1; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px; font-size:11px;">📌 QR</button>
                                ${this.permisos.editar ? `<button class="btn-edit-act" data-id="${d.id_bien}" style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px; font-size:11px;">Editar</button>` : ''}
                                ${d.esta_activo && this.permisos.borrar ? `<button class="btn-del-act" data-id="${d.id_bien}" style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px; font-size:11px;">Baja</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center; padding:15px;">Error al cargar inventario</td></tr>';
        }
    }

    abrirGaleriaModal(idBien) {
        const item = this._cache.get(idBien);
        if (!item || !item.imagenes || item.imagenes.length === 0) return;

        this._galeriaActual = item.imagenes.map(img => img.url || (img.path_archivo ? `/media/${img.path_archivo}` : ''));
        this._indexGaleriaActual = 0;

        const modal = document.getElementById('modal-img-preview');
        if (modal) {
            modal.style.display = 'flex';
            this.mostrarImagenGaleria(0);
        }
    }

    mostrarImagenGaleria(index) {
        if (index < 0 || index >= this._galeriaActual.length) return;
        
        this._indexGaleriaActual = index;
        const targetImg = document.getElementById('img-modal-target');
        const contador = document.getElementById('galeria-contador');
        const thumbsContainer = document.getElementById('galeria-thumbs-modal');
        const btnPrev = document.getElementById('btn-galeria-prev');
        const btnNext = document.getElementById('btn-galeria-next');

        if (targetImg) targetImg.src = this._galeriaActual[index];
        if (contador) contador.textContent = `Imagen ${index + 1} de ${this._galeriaActual.length}`;

        if (btnPrev) btnPrev.style.display = this._galeriaActual.length > 1 ? 'block' : 'none';
        if (btnNext) btnNext.style.display = this._galeriaActual.length > 1 ? 'block' : 'none';

        if (thumbsContainer) {
            thumbsContainer.innerHTML = this._galeriaActual.map((url, i) => `
                <img src="${url}" class="modal-thumb-item" data-index="${i}" 
                    style="width:45px; height:45px; object-fit:cover; border-radius:4px; cursor:pointer; border: 2px solid ${i === index ? '#0288d1' : '#ccc'}; opacity: ${i === index ? '1' : '0.6'};">
            `).join('');
        }
    }

    cambiarImagenGaleria(delta) {
        const nuevoIndex = this._indexGaleriaActual + delta;
        if (nuevoIndex >= 0 && nuevoIndex < this._galeriaActual.length) {
            this.mostrarImagenGaleria(nuevoIndex);
        } else if (nuevoIndex < 0) {
            this.mostrarImagenGaleria(this._galeriaActual.length - 1);
        } else if (nuevoIndex >= this._galeriaActual.length) {
            this.mostrarImagenGaleria(0);
        }
    }

    filtrarTabla(termino) {
        const query = termino.toLowerCase();
        const tbody = document.getElementById('tbody-activos');
        if (!tbody) return;

        const filas = tbody.querySelectorAll('tr');
        filas.forEach(fila => {
            const texto = fila.textContent.toLowerCase();
            fila.style.display = texto.includes(query) ? '' : 'none';
        });
    }

    abrirModalQR(idBien) {
        const item = this._cache.get(idBien);
        if (!item) return;

        const qrBox = document.getElementById('qr-code-box');
        qrBox.innerHTML = '';

        if (window.QRCode) {
            new window.QRCode(qrBox, {
                text: item.id_bien,
                width: 130, height: 130,
                colorDark: "#000000", colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.H
            });
        }

        document.getElementById('qr-info-desc').textContent = item.descripcion;
        document.getElementById('qr-info-details').textContent = [item.marca, item.modelo, item.serie ? `S/N: ${item.serie}` : null].filter(Boolean).join(' | ');
        document.getElementById('qr-info-id').textContent = `ID: ${item.id_bien}`;
        document.getElementById('modal-qr-container').style.display = 'flex';
    }

    iniciarEscanerCamara() {
        if (!window.Html5Qrcode) {
            alert('Librería de escáner no disponible.'); return;
        }

        document.getElementById('modal-scanner-container').style.display = 'flex';
        this._html5QrCodeScanner = new window.Html5Qrcode("reader-qr-camera");
        this._html5QrCodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                this.detenerEscanerCamara();
                const inputBuscar = document.getElementById('input-buscar-qr');
                if (inputBuscar) {
                    inputBuscar.value = decodedText;
                    this.filtrarTabla(decodedText);
                }
            },
            () => {}
        ).catch(err => {
            alert('No se pudo acceder a la cámara: ' + err);
            this.detenerEscanerCamara();
        });
    }

    detenerEscanerCamara() {
        if (this._html5QrCodeScanner) {
            this._html5QrCodeScanner.stop().then(() => {
                this._html5QrCodeScanner = null;
                document.getElementById('modal-scanner-container').style.display = 'none';
            }).catch(() => {
                const container = document.getElementById('modal-scanner-container');
                if (container) container.style.display = 'none';
            });
        } else {
            const container = document.getElementById('modal-scanner-container');
            if (container) container.style.display = 'none';
        }
    }

    unmount() {
        this.detenerEscanerCamara();
        this._abortController.abort();
    }
}