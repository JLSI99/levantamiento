import { bienesService } from '/src/services/bienes.js';
import { GaleriaModal } from './GaleriaModal.js';
import { QrModal } from './QrModal.js';
import { QrScannerModal } from './QrScannerModal.js';

export class ReadActivos {
    constructor(containerId, permisos, onEdit, onDelete) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onEdit = onEdit;
        this.onDelete = onDelete;
        
        this._cache = new Map();
        this._abortController = new AbortController();

        // Instanciar submódulos / modales
        this.galeriaModal = new GaleriaModal();
        this.qrModal = new QrModal();
        this.qrScannerModal = new QrScannerModal((decodedText) => {
            const inputBuscar = document.getElementById('input-buscar-qr');
            if (inputBuscar) {
                inputBuscar.value = decodedText;
                this.filtrarTabla(decodedText);
            }
        });
    }

    render() {
        const tableContainer = document.getElementById(this.containerId);
        if (!tableContainer) return;

        tableContainer.innerHTML = `
            <div style="background:white; border: 1px solid #e0e0e0; border-radius: 4px; padding:15px; overflow-x: auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h4 style="margin:0; color:#424242;">Inventario Patrimonial</h4>
                    
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="input-buscar-qr" placeholder="Buscar por No de Inv. / Serie / QR" 
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
                            <th style="padding:8px; text-align:center;">Descripción / No. Inventario</th>
                            <th style="padding:8px; text-align:center;">Detalles (Marca/Mod/Serie)</th>
                            <th style="padding:8px; text-align:center;">Costo</th>
                            <th style="padding:8px; text-align:center;">Tipo</th>
                            <th style="padding:8px; text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-activos">
                        <tr><td colspan="6" style="padding:15px; text-align:center;">Cargando inventario...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
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
                    const id = btnQr.getAttribute('data-id');
                    this.qrModal.abrir(this._cache.get(id));
                } else if (imgThumb) {
                    const idBien = imgThumb.getAttribute('data-id-bien');
                    const item = this._cache.get(idBien);
                    if (item && item.imagenes) {
                        this.galeriaModal.abrir(item.imagenes);
                    }
                }
            }, { signal });
        }

        const inputBuscar = document.getElementById('input-buscar-qr');
        if (inputBuscar) {
            inputBuscar.addEventListener('input', (e) => this.filtrarTabla(e.target.value.trim()), { signal });
        }

        document.getElementById('btn-camara-qr')?.addEventListener('click', () => {
            this.qrScannerModal.iniciar();
        }, { signal });
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-activos');
        if (!tbody) return;
        try {
            const resp = await bienesService.listarBienes(100, 0, false);
            const data = resp.data || [];
            
            this._cache.clear();
            data.forEach(d => {
                if (d.id_bien) this._cache.set(String(d.id_bien), d);
                if (d.numero_inventario) this._cache.set(String(d.numero_inventario), d);
            });

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px;">No hay activos registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(d => {
                const numInv = d.numero_inventario || 'S/N';
                const categorias = (d.tipos || []).map(t => `<span style="background:#e3f2fd; color:#1565c0; padding:2px 6px; border-radius:3px; margin:2px; display:inline-block;">${t.nombre}</span>`).join('');
                const detalles = [d.marca, d.modelo, d.serie ? `S/N: ${d.serie}` : null].filter(Boolean).join(' / ') || '<span style="color:#9e9e9e;">Sin detalles</span>';
                
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
                            <div style="font-family:monospace; color:#1565c0; font-size:11px; font-weight:bold;">No. Inv: ${numInv}</div>
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

    unmount() {
        this.qrScannerModal.detener();
        this._abortController.abort();
        this._cache.clear();
    }
}