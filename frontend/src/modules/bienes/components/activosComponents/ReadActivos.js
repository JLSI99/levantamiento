import { bienesService } from '/src/services/bienes.js';
import { GaleriaModal } from './GaleriaModal.js';
import { QrModal } from './QrModal.js';
import { QrScannerModal } from './QrScannerModal.js';
import { DropdownSelect } from './DropdownSelect.js';

export class ReadActivos {
    constructor(containerId, permisos, onEdit, onDelete) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        this.onEdit = onEdit;
        this.onDelete = onDelete;
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:actualizar') || this.permisos.includes('bienes:editar') || this.permisos.includes('activos:editar'));
        
        this.puedeBorrar = isObj 
            ? Boolean(this.permisos.borrar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:borrar') || this.permisos.includes('activos:borrar'));

        this._cache = new Map();
        this._datosOriginales = [];
        this._tagsDisponibles = [];
        this._tagsFiltroSeleccionados = [];
        this._abortController = new AbortController();

        this.tagsFiltroDropdown = null;

        this.galeriaModal = new GaleriaModal();
        this.qrModal = new QrModal();
        this.qrScannerModal = new QrScannerModal((decodedText) => {
            const inputBuscar = document.getElementById('input-buscar-qr');
            if (inputBuscar) {
                inputBuscar.value = decodedText;
                this.aplicarFiltrosYOrdenamiento();
            }
        });
    }

    render() {
        const tableContainer = document.getElementById(this.containerId);
        if (!tableContainer) return;

        tableContainer.innerHTML = `
            <div class="module-card" style="background:var(--bg-card, white); border: 1px solid var(--border-color, #e0e0e0); border-radius: 4px; padding:15px; width:100%; box-sizing:border-box;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                    <h4 style="margin:0; color:var(--text-main, #424242); font-size:14px; font-weight:700;">Inventario Patrimonial</h4>
                    
                    <!-- Barra de Filtros Avanzados y Búsqueda -->
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; width:100%;">
                        <!-- BOTÓN DE ESCANEAR QR AL INICIO -->
                        <button id="btn-camara-qr" style="background:var(--primary, #0288d1); color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            📷 Escanear QR
                        </button>

                        <input type="text" id="input-buscar-qr" placeholder="Buscar por No. Inv. / Serie / QR" 
                            style="padding:6px 10px; border:1px solid var(--border-color, #ccc); border-radius:4px; font-size:12px; width:180px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                        
                        <!-- DROPDOWN MULTISELECCIÓN DE TAGS PARA FILTRADO -->
                        <div style="width: 210px;" id="dropdown-filtro-tags-container"></div>

                        <select id="orden-alfabetico-activo" style="padding:6px; border:1px solid var(--border-color, #ccc); border-radius:4px; font-size:12px; background:var(--bg-input, #fff); color:var(--text-main); box-sizing:border-box;">
                            <option value="">-- Orden Alfabético --</option>
                            <option value="az">A - Z (Descripción)</option>
                            <option value="za">Z - A (Descripción)</option>
                        </select>

                        <div style="display:flex; align-items:center; gap:4px; font-size:11px; color:var(--text-main, #555);">
                            <span>Desde:</span>
                            <input type="date" id="filtro-fecha-desde" style="padding:5px; border:1px solid var(--border-color, #ccc); border-radius:4px; font-size:11px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                            <span>Hasta:</span>
                            <input type="date" id="filtro-fecha-hasta" style="padding:5px; border:1px solid var(--border-color, #ccc); border-radius:4px; font-size:11px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                        </div>
                    </div>
                </div>

                <div style="width:100%; overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; min-width: 650px;">
                        <thead>
                            <tr style="background:var(--table-header-bg, #f5f5f5); text-align:left; border-bottom:2px solid var(--border-color, #e0e0e0);">
                                <th style="padding:8px; width:65px; text-align:center; color:var(--text-main);">Foto</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Descripción / No. Inventario</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Detalles (Marca/Mod/Serie)</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Costo</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Tipo</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-activos">
                            <tr><td colspan="6" style="padding:15px; text-align:center; color:var(--text-muted);">Cargando inventario...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this._initSubComponents();
        this.bindEvents();
        this.cargarDatos();
    }

    _initSubComponents() {
        this.tagsFiltroDropdown = new DropdownSelect({
            containerId: 'read-activos-filtro-tags',
            placeholder: '-- Filtrar por Tags --',
            isMulti: true,
            onSelect: (selectedIds) => {
                this._tagsFiltroSeleccionados = selectedIds;
                this.aplicarFiltrosYOrdenamiento();
            }
        });
        this.tagsFiltroDropdown.render(document.getElementById('dropdown-filtro-tags-container'));
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

                if (btnEdit && this.puedeEditar) {
                    const id = btnEdit.getAttribute('data-id');
                    const item = this._cache.get(id);
                    if (this.onEdit) this.onEdit(id, item);
                } else if (btnDel && this.puedeBorrar) {
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

        document.getElementById('input-buscar-qr')?.addEventListener('input', () => this.aplicarFiltrosYOrdenamiento(), { signal });
        document.getElementById('orden-alfabetico-activo')?.addEventListener('change', () => this.aplicarFiltrosYOrdenamiento(), { signal });
        document.getElementById('filtro-fecha-desde')?.addEventListener('change', () => this.aplicarFiltrosYOrdenamiento(), { signal });
        document.getElementById('filtro-fecha-hasta')?.addEventListener('change', () => this.aplicarFiltrosYOrdenamiento(), { signal });

        document.getElementById('btn-camara-qr')?.addEventListener('click', () => {
            this.qrScannerModal.iniciar();
        }, { signal });
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-activos');
        if (!tbody) return;
        try {
            const [respBienes, respTags] = await Promise.all([
                bienesService.listarBienes(100, 0, false),
                bienesService.listarTagsBien(100, 0, false).catch(() => ({ data: [] }))
            ]);

            this._datosOriginales = respBienes.data || [];
            this._tagsDisponibles = respTags.data || respTags || [];

            const formattedTags = this._tagsDisponibles.map(t => ({ id: t.id_tag, nombre: t.nombre }));
            this.tagsFiltroDropdown.setItems(formattedTags);

            this.renderizarTabla(this._datosOriginales);

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" style="color:var(--danger, red); text-align:center; padding:15px;">Error al cargar inventario</td></tr>';
        }
    }

    aplicarFiltrosYOrdenamiento() {
        const textoBusqueda = document.getElementById('input-buscar-qr')?.value.toLowerCase().trim() || '';
        const ordenSeleccionado = document.getElementById('orden-alfabetico-activo')?.value || '';
        const fechaDesde = document.getElementById('filtro-fecha-desde')?.value || '';
        const fechaHasta = document.getElementById('filtro-fecha-hasta')?.value || '';

        let resultados = [...this._datosOriginales];

        if (textoBusqueda) {
            resultados = resultados.filter(d => {
                const inv = String(d.numero_inventario || '').toLowerCase();
                const serie = String(d.serie || '').toLowerCase();
                const desc = String(d.descripcion || '').toLowerCase();
                return inv.includes(textoBusqueda) || serie.includes(textoBusqueda) || desc.includes(textoBusqueda);
            });
        }

        if (this._tagsFiltroSeleccionados.length > 0) {
            resultados = resultados.filter(d => {
                const tagsBienIds = (d.tags || []).map(t => String(t.id_tag));
                return this._tagsFiltroSeleccionados.every(idSeleccionado => tagsBienIds.includes(idSeleccionado));
            });
        }

        if (fechaDesde) {
            resultados = resultados.filter(d => d.fecha_adquisicion && d.fecha_adquisicion >= fechaDesde);
        }
        if (fechaHasta) {
            resultados = resultados.filter(d => d.fecha_adquisicion && d.fecha_adquisicion <= fechaHasta);
        }

        if (ordenSeleccionado === 'az') {
            resultados.sort((a, b) => (a.descripcion || '').localeCompare(b.descripcion || ''));
        } else if (ordenSeleccionado === 'za') {
            resultados.sort((a, b) => (b.descripcion || '').localeCompare(a.descripcion || ''));
        }

        this.renderizarTabla(resultados);
    }

    renderizarTabla(data) {
        const tbody = document.getElementById('tbody-activos');
        if (!tbody) return;

        this._cache.clear();
        data.forEach(d => {
            if (d.id_bien) this._cache.set(String(d.id_bien), d);
            if (d.numero_inventario) this._cache.set(String(d.numero_inventario), d);
        });

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted, #757575);">No hay activos que coincidan con los filtros seleccionados.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(d => {
            const numInv = d.numero_inventario || 'S/N';
            const categorias = (d.tipos || []).map(t => `<span style="background:var(--badge-bg, #e3f2fd); color:var(--badge-text, #1565c0); padding:2px 6px; border-radius:3px; margin:2px; display:inline-block;">${t.nombre}</span>`).join('');
            const detalles = [d.marca, d.modelo, d.serie ? `S/N: ${d.serie}` : null].filter(Boolean).join(' / ') || '<span style="color:var(--text-muted, #9e9e9e);">Sin detalles</span>';
            
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
                    <img src="${primeraImagenUrl}" class="img-thumb-preview" data-id-bien="${d.id_bien}" title="Clic para abrir galería (${totalImagenes})" style="width:42px; height:42px; object-fit:cover; border-radius:4px; border:1px solid var(--border-color, #ccc); cursor:pointer; display:block;">
                    ${badgeHtml}
                   </div>`
                : `<div style="width:42px; height:42px; background:var(--bg-disabled, #f0f0f0); border-radius:4px; display:flex; align-items:center; justify-content:center; color:var(--text-muted, #9e9e9e); font-size:16px;">📷</div>`;

            return `
                <tr style="border-bottom:1px solid var(--border-color, #e0e0e0); ${d.esta_activo ? '' : 'opacity:0.5;'}">
                    <td style="padding:8px; text-align:center;">${thumbHtml}</td>
                    <td style="padding:8px;">
                        <div style="font-weight:600; color:var(--text-main, #212121);">${d.descripcion}</div>
                        <div style="font-family:monospace; color:var(--primary, #1565c0); font-size:11px; font-weight:bold;">No. Inv: ${numInv}</div>
                    </td>
                    <td style="padding:8px; color:var(--text-main);">${detalles}</td>
                    <td style="padding:8px; font-weight:bold; color:var(--text-main);">$${parseFloat(d.costo || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                    <td style="padding:8px;">${categorias}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                            <button class="btn-qr-act" data-id="${d.id_bien}" style="background:var(--primary, #0288d1); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">📌 QR</button>
                            ${this.puedeEditar ? `<button class="btn-edit-act" data-id="${d.id_bien}" style="background:var(--warning, #f57c00); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">Editar</button>` : ''}
                            ${d.esta_activo && this.puedeBorrar ? `<button class="btn-del-act" data-id="${d.id_bien}" style="background:var(--danger, #c62828); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">Baja</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    unmount() {
        if (this.tagsFiltroDropdown) this.tagsFiltroDropdown.unmount();
        this.qrScannerModal.detener();
        this._abortController.abort();
        this._cache.clear();
    }
}