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
        this._datosOriginales = [];
        this._tagsDisponibles = [];
        this._tagsFiltroSeleccionados = []; // Multiselección para filtrado
        this._abortController = new AbortController();

        this.handleOutsideClick = this._handleOutsideClick.bind(this);

        // Instanciar submódulos / modales
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
            <div style="background:white; border: 1px solid #e0e0e0; border-radius: 4px; padding:15px; overflow-x: auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                    <h4 style="margin:0; color:#424242;">Inventario Patrimonial</h4>
                    
                    <!-- Barra de Filtros Avanzados y Búsqueda -->
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        <!-- BOTÓN DE ESCANEAR QR AL INICIO -->
                        <button id="btn-camara-qr" style="background:#0288d1; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            📷 Escanear QR
                        </button>

                        <input type="text" id="input-buscar-qr" placeholder="Buscar por No. Inv. / Serie / QR" 
                            style="padding:6px 10px; border:1px solid #ccc; border-radius:4px; font-size:12px; width:180px; box-sizing:border-box;">
                        
                        <!-- DROPDOWN MULTISELECCIÓN DE TAGS PARA FILTRADO (ALTURA FIJA Y COMPACTA) -->
                        <div style="position:relative; width: 210px;" id="dropdown-filtro-tags-container">
                            <div id="dropdown-filtro-tags-toggle-btn" style="height:32px; padding:0 8px; border:1px solid #ccc; border-radius:4px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12px; box-sizing:border-box; overflow:hidden;">
                                <div id="dropdown-filtro-tags-placeholder" style="display:flex; gap:4px; align-items:center; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; flex:1;">
                                    <span style="color:#757575;">-- Filtrar por Tags --</span>
                                </div>
                                <span style="font-size:10px; color:#555; margin-left:6px; flex-shrink:0;">▼</span>
                            </div>
                            
                            <div id="dropdown-filtro-tags-panel" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:180px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-top:none; border-radius:0 0 4px 4px; z-index:100; box-shadow:0 4px 6px rgba(0,0,0,0.1); box-sizing:border-box;">
                                <div id="dropdown-filtro-tags-options-list" style="padding:4px 0;"></div>
                            </div>
                        </div>

                        <select id="orden-alfabetico-activo" style="padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px; background:#fff; box-sizing:border-box;">
                            <option value="">-- Orden Alfabético --</option>
                            <option value="az">A - Z (Descripción)</option>
                            <option value="za">Z - A (Descripción)</option>
                        </select>

                        <div style="display:flex; align-items:center; gap:4px; font-size:11px; color:#555;">
                            <span>Desde:</span>
                            <input type="date" id="filtro-fecha-desde" style="padding:5px; border:1px solid #ccc; border-radius:4px; font-size:11px; box-sizing:border-box;">
                            <span>Hasta:</span>
                            <input type="date" id="filtro-fecha-hasta" style="padding:5px; border:1px solid #ccc; border-radius:4px; font-size:11px; box-sizing:border-box;">
                        </div>
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

    _handleOutsideClick(e) {
        const containerTags = document.getElementById('dropdown-filtro-tags-container');
        const panelTags = document.getElementById('dropdown-filtro-tags-panel');
        if (containerTags && panelTags && !containerTags.contains(e.target)) {
            panelTags.style.display = 'none';
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

        // Toggle dropdown multiselección de tags
        const toggleTagsBtn = document.getElementById('dropdown-filtro-tags-toggle-btn');
        const panelTags = document.getElementById('dropdown-filtro-tags-panel');
        if (toggleTagsBtn && panelTags) {
            toggleTagsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panelTags.style.display = panelTags.style.display === 'block' ? 'none' : 'block';
            }, { signal });
        }

        document.addEventListener('click', this.handleOutsideClick);

        // Selección/deselección de tags dentro del panel desplegable
        const tagsOptionsList = document.getElementById('dropdown-filtro-tags-options-list');
        if (tagsOptionsList) {
            tagsOptionsList.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-filtro-tag-item');
                if (item) {
                    const tagId = item.getAttribute('data-id');
                    if (this._tagsFiltroSeleccionados.includes(tagId)) {
                        this._tagsFiltroSeleccionados = this._tagsFiltroSeleccionados.filter(id => id !== tagId);
                    } else {
                        this._tagsFiltroSeleccionados.push(tagId);
                    }
                    this.renderizarOpcionesTagsFiltro();
                    this.aplicarFiltrosYOrdenamiento();
                }
            }, { signal });
        }

        // Resto de eventos de filtros
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

            this.renderizarOpcionesTagsFiltro();
            this.renderizarTabla(this._datosOriginales);

        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" style="color:red; text-align:center; padding:15px;">Error al cargar inventario</td></tr>';
        }
    }

    renderizarOpcionesTagsFiltro() {
        const optionsList = document.getElementById('dropdown-filtro-tags-options-list');
        if (optionsList) {
            if (this._tagsDisponibles.length === 0) {
                optionsList.innerHTML = `<div style="padding:8px 12px; font-size:12px; color:#757575;">No hay etiquetas disponibles</div>`;
            } else {
                optionsList.innerHTML = this._tagsDisponibles.map(t => {
                    const isSelected = this._tagsFiltroSeleccionados.includes(String(t.id_tag));
                    return `
                        <div class="dropdown-filtro-tag-item" data-id="${t.id_tag}" style="padding:6px 12px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:${isSelected ? '#e8f5e9' : 'transparent'}; color:${isSelected ? '#2e7d32' : '#212121'}; font-weight:${isSelected ? '600' : 'normal'};">
                            <span>${this._escapeHtml(t.nombre)}</span>
                            ${isSelected ? '<span style="font-size:11px; color:#2e7d32;">✓</span>' : ''}
                        </div>
                    `;
                }).join('');
            }
        }

        // Actualizar visualización compacta en el botón con contador dinámico
        const container = document.getElementById('dropdown-filtro-tags-placeholder');
        if (container) {
            if (this._tagsFiltroSeleccionados.length === 0) {
                container.innerHTML = `<span style="color:#757575;">-- Filtrar por Tags --</span>`;
            } else {
                const nombresTags = this._tagsFiltroSeleccionados.map(idTag => {
                    const tagObj = this._tagsDisponibles.find(t => String(t.id_tag) === String(idTag));
                    return tagObj ? tagObj.nombre : 'Tag';
                });

                container.innerHTML = `
                    <span style="background:#e8f5e9; color:#1b5e20; border:1px solid #a5d6a7; border-radius:10px; padding:1px 6px; font-size:11px; font-weight:600; white-space:nowrap;">
                        Tags (${this._tagsFiltroSeleccionados.length}): ${this._escapeHtml(nombresTags.join(', '))}
                    </span>
                `;
            }
        }
    }

    aplicarFiltrosYOrdenamiento() {
        const textoBusqueda = document.getElementById('input-buscar-qr')?.value.toLowerCase().trim() || '';
        const ordenSeleccionado = document.getElementById('orden-alfabetico-activo')?.value || '';
        const fechaDesde = document.getElementById('filtro-fecha-desde')?.value || '';
        const fechaHasta = document.getElementById('filtro-fecha-hasta')?.value || '';

        let resultados = [...this._datosOriginales];

        // 1. Filtrar por texto (No. Inventario, Serie, Descripción)
        if (textoBusqueda) {
            resultados = resultados.filter(d => {
                const inv = String(d.numero_inventario || '').toLowerCase();
                const serie = String(d.serie || '').toLowerCase();
                const desc = String(d.descripcion || '').toLowerCase();
                return inv.includes(textoBusqueda) || serie.includes(textoBusqueda) || desc.includes(textoBusqueda);
            });
        }

        // 2. Filtrar por Múltiples Tags / Etiquetas (Lógica AND estricta: El bien DEBE poseer TODAS las etiquetas seleccionadas)
        if (this._tagsFiltroSeleccionados.length > 0) {
            resultados = resultados.filter(d => {
                const tagsBienIds = (d.tags || []).map(t => String(t.id_tag));
                return this._tagsFiltroSeleccionados.every(idSeleccionado => tagsBienIds.includes(idSeleccionado));
            });
        }

        // 3. Filtrar por Rango de Fechas de Adquisición
        if (fechaDesde) {
            resultados = resultados.filter(d => d.fecha_adquisicion && d.fecha_adquisicion >= fechaDesde);
        }
        if (fechaHasta) {
            resultados = resultados.filter(d => d.fecha_adquisicion && d.fecha_adquisicion <= fechaHasta);
        }

        // 4. Ordenamiento Alfabético (A-Z / Z-A)
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
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:15px; color:#757575;">No hay activos que coincidan con los filtros seleccionados.</td></tr>';
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
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    unmount() {
        document.removeEventListener('click', this.handleOutsideClick);
        this.qrScannerModal.detener();
        this._abortController.abort();
        this._cache.clear();
    }
}