import { bienesService } from '/src/services/bienes.js';

export class CreateActivo {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
        this.tipos = [];
        this.tags = [];
        this.tipoSeleccionado = null;
        this.tagsSeleccionados = [];

        this.handleOutsideClick = this._handleOutsideClick.bind(this);
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff; position: relative;">
                <h3 style="margin-top:0; color:#1a237e; font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px;">
                    Indexación de Activo Físico
                </h3>
                ${this.permisos.crear ? `
                <form id="form-create-activo">
                    <div style="margin-bottom:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Número de Inventario *</label>
                        <input type="text" name="numero_inventario" placeholder="Ej. INV-TIC-2026-001" required 
                            style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Descripción Completa *</label>
                        <input type="text" name="descripcion" placeholder="Ej. Monitor Dell UltraSharp 27" required 
                            style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Serie</label>
                            <input type="text" name="serie" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Marca</label>
                            <input type="text" name="marca" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Modelo</label>
                            <input type="text" name="modelo" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Costo (MXN) *</label>
                            <input type="number" step="0.01" name="costo" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Adquisición</label>
                            <input type="date" name="fecha_adquisicion" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- SELECTOR TIPO DE BIEN -->
                    <div style="margin-bottom:15px; position:relative;" id="dropdown-tipos-container">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tipo de Bien *</label>
                        <div id="dropdown-toggle-btn" style="width:100%; min-height:34px; padding:6px 10px; border:1px solid #ccc; border-radius:4px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12px; box-sizing:border-box;">
                            <span id="dropdown-placeholder" style="color:#757575;">Seleccione un tipo de bien...</span>
                            <span style="font-size:10px; color:#555;">▼</span>
                        </div>
                        
                        <div id="dropdown-panel" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:180px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-top:none; border-radius:0 0 4px 4px; z-index:100; box-shadow:0 4px 6px rgba(0,0,0,0.1); box-sizing:border-box;">
                            <div id="dropdown-options-list" style="padding:4px 0;"></div>
                        </div>
                    </div>

                    <!-- SELECTOR DE TAGS / ETIQUETAS (MULTISELECCIÓN) -->
                    <div style="margin-bottom:15px; position:relative;" id="dropdown-tags-container">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Etiquetas / Tags (Opcional - Múltiple)</label>
                        <div id="dropdown-tags-toggle-btn" style="width:100%; min-height:34px; padding:4px 8px; border:1px solid #ccc; border-radius:4px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12px; box-sizing:border-box;">
                            <div id="dropdown-tags-placeholder" style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
                                <span style="color:#757575;">Seleccionar etiquetas...</span>
                            </div>
                            <span style="font-size:10px; color:#555; margin-left:6px;">▼</span>
                        </div>
                        
                        <div id="dropdown-tags-panel" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:180px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-top:none; border-radius:0 0 4px 4px; z-index:100; box-shadow:0 4px 6px rgba(0,0,0,0.1); box-sizing:border-box;">
                            <div id="dropdown-tags-options-list" style="padding:4px 0;"></div>
                        </div>
                    </div>

                    <div style="margin-bottom:15px; border-top:1px solid #e0e0e0; padding-top:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Imágenes Iniciales del Bien (Opcional, Máximo 3)</label>
                        <input type="file" id="input-archivo-imagen-create" accept="image/jpeg,image/png,image/webp" multiple style="font-size:12px; width:100%;">
                    </div>

                    <button type="submit" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Dar de Alta Activo
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos para crear Bienes.</div>'}
            </div>
        `;

        this.bindEvents();

        if (this.tipos.length === 0 || this.tags.length === 0) {
            await this.cargarCatalogos();
        } else {
            this.renderSelectTipos();
            this.renderSelectTags();
        }
    }

    async cargarCatalogos() {
        try {
            if (this.tipos.length === 0) {
                const resTipos = await bienesService.listarTiposBien(100, 0, false);
                this.tipos = Array.isArray(resTipos) ? resTipos : (resTipos?.data || []);
            }
            if (this.tags.length === 0) {
                const resTags = await bienesService.listarTagsBien(100, 0, false);
                this.tags = Array.isArray(resTags) ? resTags : (resTags?.data || []);
            }
            this.renderSelectTipos();
            this.renderSelectTags();
        } catch (error) {
            console.error('Error al cargar catálogos desde CreateActivo:', error);
        }
    }

    actualizarSelectTipos(tipos) {
        this.tipos = Array.isArray(tipos) ? tipos : (tipos?.data || []);
        this.renderSelectTipos();
    }

    actualizarSelectTags(tags) {
        this.tags = Array.isArray(tags) ? tags : (tags?.data || []);
        this.renderSelectTags();
    }

    renderSelectTipos() {
        const optionsList = document.getElementById('dropdown-options-list');
        if (!optionsList) return;

        if (this.tipos.length === 0) {
            optionsList.innerHTML = `<div style="padding:8px 12px; font-size:12px; color:#757575;">No hay tipos disponibles</div>`;
            return;
        }

        optionsList.innerHTML = this.tipos.map(t => {
            const isSelected = this.tipoSeleccionado === String(t.id_tipo);
            return `
                <div class="dropdown-option-item" data-id="${t.id_tipo}" style="padding:8px 12px; font-size:12px; cursor:pointer; background:${isSelected ? '#e3f2fd' : 'transparent'}; color:${isSelected ? '#1565c0' : '#212121'}; font-weight:${isSelected ? '600' : 'normal'};">
                    ${this._escapeHtml(t.nombre)}
                </div>
            `;
        }).join('');

        this._actualizarTextoBotonDropdown();
    }

    renderSelectTags() {
        const optionsList = document.getElementById('dropdown-tags-options-list');
        if (!optionsList) return;

        if (this.tags.length === 0) {
            optionsList.innerHTML = `<div style="padding:8px 12px; font-size:12px; color:#757575;">No hay etiquetas disponibles</div>`;
            return;
        }

        optionsList.innerHTML = this.tags.map(t => {
            const isSelected = this.tagsSeleccionados.includes(String(t.id_tag));
            return `
                <div class="dropdown-tag-option-item" data-id="${t.id_tag}" style="padding:6px 12px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:${isSelected ? '#e8f5e9' : 'transparent'}; color:${isSelected ? '#2e7d32' : '#212121'}; font-weight:${isSelected ? '600' : 'normal'};">
                    <span>${this._escapeHtml(t.nombre)}</span>
                    ${isSelected ? '<span style="font-size:11px; color:#2e7d32;">✓</span>' : ''}
                </div>
            `;
        }).join('');

        this._actualizarChipsTags();
    }

    _actualizarTextoBotonDropdown() {
        const placeholder = document.getElementById('dropdown-placeholder');
        if (!placeholder) return;

        if (!this.tipoSeleccionado) {
            placeholder.textContent = 'Seleccione un tipo de bien...';
            placeholder.style.color = '#757575';
        } else {
            const encontrado = this.tipos.find(t => String(t.id_tipo) === String(this.tipoSeleccionado));
            placeholder.textContent = encontrado ? encontrado.nombre : 'Seleccione un tipo de bien...';
            placeholder.style.color = encontrado ? '#212121' : '#757575';
        }
    }

    _actualizarChipsTags() {
        const container = document.getElementById('dropdown-tags-placeholder');
        if (!container) return;

        if (this.tagsSeleccionados.length === 0) {
            container.innerHTML = `<span style="color:#757575;">Seleccionar etiquetas...</span>`;
            return;
        }

        container.innerHTML = this.tagsSeleccionados.map(idTag => {
            const tagObj = this.tags.find(t => String(t.id_tag) === String(idTag));
            const nombre = tagObj ? tagObj.nombre : 'Tag';
            return `
                <span style="background:#e8f5e9; color:#1b5e20; border:1px solid #a5d6a7; border-radius:12px; padding:2px 8px; font-size:11px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                    ${this._escapeHtml(nombre)}
                    <span class="btn-remove-tag-chip" data-id="${idTag}" style="cursor:pointer; color:#2e7d32; font-weight:bold;">&times;</span>
                </span>
            `;
        }).join('');
    }

    _handleOutsideClick(e) {
        const containerTipos = document.getElementById('dropdown-tipos-container');
        const panelTipos = document.getElementById('dropdown-panel');
        if (containerTipos && panelTipos && !containerTipos.contains(e.target)) {
            panelTipos.style.display = 'none';
        }

        const containerTags = document.getElementById('dropdown-tags-container');
        const panelTags = document.getElementById('dropdown-tags-panel');
        if (containerTags && panelTags && !containerTags.contains(e.target)) {
            panelTags.style.display = 'none';
        }
    }

    bindEvents() {
        const toggleBtn = document.getElementById('dropdown-toggle-btn');
        const panel = document.getElementById('dropdown-panel');
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
            });
        }

        const toggleTagsBtn = document.getElementById('dropdown-tags-toggle-btn');
        const panelTags = document.getElementById('dropdown-tags-panel');
        if (toggleTagsBtn && panelTags) {
            toggleTagsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panelTags.style.display = panelTags.style.display === 'block' ? 'none' : 'block';
            });
        }

        document.addEventListener('click', this.handleOutsideClick);

        const optionsList = document.getElementById('dropdown-options-list');
        if (optionsList) {
            optionsList.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-option-item');
                if (item) {
                    this.tipoSeleccionado = item.getAttribute('data-id');
                    this.renderSelectTipos();
                    if (panel) panel.style.display = 'none';
                }
            });
        }

        const tagsOptionsList = document.getElementById('dropdown-tags-options-list');
        if (tagsOptionsList) {
            tagsOptionsList.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-tag-option-item');
                if (item) {
                    const tagId = item.getAttribute('data-id');
                    if (this.tagsSeleccionados.includes(tagId)) {
                        this.tagsSeleccionados = this.tagsSeleccionados.filter(id => id !== tagId);
                    } else {
                        this.tagsSeleccionados.push(tagId);
                    }
                    this.renderSelectTags();
                }
            });
        }

        const tagsPlaceholder = document.getElementById('dropdown-tags-placeholder');
        if (tagsPlaceholder) {
            tagsPlaceholder.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.btn-remove-tag-chip');
                if (removeBtn) {
                    e.stopPropagation();
                    const tagId = removeBtn.getAttribute('data-id');
                    this.tagsSeleccionados = this.tagsSeleccionados.filter(id => id !== tagId);
                    this.renderSelectTags();
                }
            });
        }

        const form = document.getElementById('form-create-activo');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);

                if (!this.tipoSeleccionado) {
                    alert('Debe seleccionar un Tipo de Bien.');
                    return;
                }

                const serieVal = formData.get('serie');
                const marcaVal = formData.get('marca');
                const modeloVal = formData.get('modelo');
                const fechaVal = formData.get('fecha_adquisicion');

                const payload = {
                    numero_inventario: formData.get('numero_inventario').trim(),
                    descripcion: formData.get('descripcion').trim(),
                    serie: serieVal && serieVal.trim() !== '' ? serieVal.trim() : null,
                    marca: marcaVal && marcaVal.trim() !== '' ? marcaVal.trim() : null,
                    modelo: modeloVal && modeloVal.trim() !== '' ? modeloVal.trim() : null,
                    costo: parseFloat(formData.get('costo')),
                    fecha_adquisicion: fechaVal && fechaVal.trim() !== '' ? fechaVal.trim() : null,
                    tipos_ids: [this.tipoSeleccionado],
                    tags_ids: this.tagsSeleccionados
                };

                try {
                    const nuevoBien = await bienesService.crearNuevoBien(payload);
                    
                    const fileInput = document.getElementById('input-archivo-imagen-create');
                    if (fileInput && fileInput.files && fileInput.files.length > 0 && nuevoBien?.id_bien) {
                        try {
                            const archivos = Array.from(fileInput.files);
                            await bienesService.subirImagenBien(nuevoBien.id_bien, archivos);
                        } catch (imgErr) {
                            console.error('Error al subir imágenes:', imgErr);
                        }
                    }

                    alert('Activo indexado exitosamente.');
                    form.reset();
                    this.tipoSeleccionado = null;
                    this.tagsSeleccionados = [];
                    this.renderSelectTipos();
                    this.renderSelectTags();
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    unmount() {
        document.removeEventListener('click', this.handleOutsideClick);
        this._abortController.abort();
    }
}