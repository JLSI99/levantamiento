import { bienesService } from '/src/services/bienes.js';
import { DropdownSelect } from './DropdownSelect.js';

export class UpdateActivo {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this._abortController = new AbortController();
        this.tipos = [];
        this.tags = [];
        this.tagsSeleccionados = [];
        this.item = null;

        this.tiposDropdown = null;
        this.tagsDropdown = null;

        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:actualizar') || this.permisos.includes('bienes:editar') || this.permisos.includes('activos:editar'));
        
        this.puedeBorrar = isObj 
            ? Boolean(this.permisos.borrar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:borrar') || this.permisos.includes('activos:borrar'));
    }

    async render(item) {
        this.item = item;
        this.tagsSeleccionados = item?.tags ? item.tags.map(t => String(t.id_tag)) : [];

        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (this._abortController.signal.aborted) {
            this._abortController = new AbortController();
        }

        const imagenesHtml = this.renderGaleriaImagenes(item?.imagenes || []);

        container.innerHTML = `
            <div class="module-card" style="padding: 15px; border: 1px solid var(--warning, #ffb74d); border-radius: 4px; background: var(--bg-card-warning, #fff8e1); width:100%; box-sizing:border-box;">
                <h3 style="margin-top:0; color:var(--warning-dark, #e65100); font-size:16px; font-weight:700; border-bottom:1px solid var(--border-color-warning, #ffe0b2); padding-bottom:8px;">
                    Editar Activo
                </h3>
                ${this.puedeEditar ? `
                <form id="form-update-activo" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Número de Inventario *</label>
                        <input type="text" name="numero_inventario" required value="${item?.numero_inventario || ''}"
                            style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Descripción Completa *</label>
                        <input type="text" name="descripcion" required value="${item?.descripcion || ''}"
                            style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                    
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <div style="flex:1; min-width:110px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Serie</label>
                            <input type="text" name="serie" value="${item?.serie || ''}" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                        </div>
                        <div style="flex:1; min-width:110px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Marca</label>
                            <input type="text" name="marca" value="${item?.marca || ''}" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                        </div>
                        <div style="flex:1; min-width:110px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Modelo</label>
                            <input type="text" name="modelo" value="${item?.modelo || ''}" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <div style="flex:1; min-width:140px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Costo (MXN) *</label>
                            <input type="number" step="0.01" name="costo" required value="${item?.costo || ''}" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                        </div>
                        <div style="flex:1; min-width:140px;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Adquisición</label>
                            <input type="date" name="fecha_adquisicion" value="${item?.fecha_adquisicion || ''}" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                        </div>
                    </div>

                    <!-- SELECTOR TIPO DE BIEN -->
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Tipo de Bien *</label>
                        <div id="selector-update-tipo-container"></div>
                    </div>

                    <!-- SELECTOR DE TAGS / ETIQUETAS (MULTISELECCIÓN) -->
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Etiquetas / Tags (Opcional - Múltiple)</label>
                        <div id="selector-update-tags-container"></div>
                    </div>

                    <div style="border-top:1px solid var(--border-color-warning, #ffe0b2); padding-top:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:6px; color:var(--text-main);">Galería de Imágenes (Máximo 3)</label>
                        <div id="galeria-imagenes-container" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
                            ${imagenesHtml}
                        </div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Subir Nuevas Imágenes</label>
                        <input type="file" id="input-archivo-imagen" accept="image/jpeg,image/png,image/webp" multiple style="font-size:12px; width:100%; color:var(--text-main);">
                    </div>

                    <button type="submit" style="width:100%; padding:10px; background:var(--warning-dark, #e65100); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Actualizar Activo
                    </button>
                    <button type="button" id="btn-cancelar-update" style="width:100%; padding:10px; background:var(--text-muted, #757575); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Cancelar Edición
                    </button>
                </form>
                ` : '<div class="forbidden-container" style="color:var(--text-muted, #757575); font-style:italic; font-size:12px;">Sin permisos para editar Bienes.</div>'}
            </div>
        `;

        if (this.puedeEditar) {
            this._initSubComponents();
            this.bindEvents();

            if (this.tipos.length === 0 || this.tags.length === 0) {
                await this.cargarCatalogos();
            } else {
                this.renderSelectTipos();
                this.renderSelectTags();
            }
        }
    }

    _initSubComponents() {
        const tipoActualId = this.item?.tipos && this.item.tipos.length > 0 ? String(this.item.tipos[0].id_tipo) : null;
        
        this.tiposDropdown = new DropdownSelect({
            containerId: 'update-tipo-dropdown',
            placeholder: 'Seleccione un tipo de bien...',
            isMulti: false
        });
        this.tiposDropdown.render(document.getElementById('selector-update-tipo-container'));
        if (tipoActualId) this.tiposDropdown.setSelected(tipoActualId);

        this.tagsDropdown = new DropdownSelect({
            containerId: 'update-tags-dropdown',
            placeholder: 'Seleccionar etiquetas...',
            isMulti: true
        });
        this.tagsDropdown.render(document.getElementById('selector-update-tags-container'));
        if (this.tagsSeleccionados.length > 0) {
            this.tagsDropdown.setSelected(this.tagsSeleccionados);
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
            console.error('Error al cargar catálogos desde UpdateActivo:', error);
        }
    }

    renderGaleriaImagenes(imagenes) {
        if (!imagenes || imagenes.length === 0) {
            return `<span style="font-size:12px; color:var(--text-muted, #757575); font-style:italic;">Sin imágenes asociadas</span>`;
        }

        return imagenes.map(img => {
            const srcUrl = img.url || (img.path_archivo ? `/media/${img.path_archivo}` : '');
            return `
                <div style="position:relative; display:inline-block; border:1px solid var(--border-color, #ccc); border-radius:4px; overflow:hidden; background:var(--bg-card, #fff);">
                    <img src="${srcUrl}" alt="Imagen del bien" style="width:80px; height:80px; object-fit:cover; display:block;">
                    ${this.puedeBorrar ? `
                        <button type="button" class="btn-eliminar-imagen" data-id="${img.id_imagen}" 
                            style="position:absolute; top:2px; right:2px; background:rgba(211,47,47,0.85); color:white; border:none; border-radius:50%; width:20px; height:20px; font-size:11px; cursor:pointer; line-height:1; display:flex; align-items:center; justify-content:center;" title="Eliminar imagen">
                            &times;
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
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
        if (!this.tiposDropdown) return;
        const formattedTipos = this.tipos.map(t => ({ id: t.id_tipo, nombre: t.nombre }));
        this.tiposDropdown.setItems(formattedTipos);

        if (this.item && this.item.tipos && this.item.tipos.length > 0) {
            this.tiposDropdown.setSelected(String(this.item.tipos[0].id_tipo));
        }
    }

    renderSelectTags() {
        if (!this.tagsDropdown) return;
        const formattedTags = this.tags.map(t => ({ id: t.id_tag, nombre: t.nombre }));
        this.tagsDropdown.setItems(formattedTags);

        if (this.tagsSeleccionados.length > 0) {
            this.tagsDropdown.setSelected(this.tagsSeleccionados);
        }
    }

    bindEvents() {
        const form = document.getElementById('form-update-activo');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.item) return;

                const formData = new FormData(form);
                const tipoIdSeleccionado = this.tiposDropdown?.selectedValues;

                if (!tipoIdSeleccionado) {
                    alert('Debe seleccionar un Tipo de Bien.');
                    return;
                }

                const tagsIdsSeleccionados = this.tagsDropdown?.selectedValues || [];

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
                    tipos_ids: [tipoIdSeleccionado],
                    tags_ids: tagsIdsSeleccionados
                };

                try {
                    await bienesService.modificarBien(this.item.id_bien, payload);

                    const fileInput = document.getElementById('input-archivo-imagen');
                    if (fileInput && fileInput.files && fileInput.files.length > 0) {
                        const archivos = Array.from(fileInput.files);
                        await bienesService.subirImagenBien(this.item.id_bien, archivos);
                    }

                    alert('Activo actualizado exitosamente.');
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }

        const galeriaContainer = document.getElementById('galeria-imagenes-container');
        if (galeriaContainer) {
            galeriaContainer.addEventListener('click', async (e) => {
                const target = e.target.closest('.btn-eliminar-imagen');
                if (!target) return;

                const idImagen = target.getAttribute('data-id');
                if (!idImagen || !this.item) return;

                if (confirm('¿Desea eliminar esta imagen?')) {
                    try {
                        await bienesService.eliminarImagenBien(this.item.id_bien, idImagen);
                        this.item.imagenes = (this.item.imagenes || []).filter(img => String(img.id_imagen) !== String(idImagen));
                        galeriaContainer.innerHTML = this.renderGaleriaImagenes(this.item.imagenes);
                        alert('Imagen eliminada correctamente.');
                    } catch (err) {
                        alert('Error al eliminar la imagen: ' + (err.response?.data?.detail || err.message));
                    }
                }
            }, { signal: this._abortController.signal });
        }

        document.getElementById('btn-cancelar-update')?.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
        }, { signal: this._abortController.signal });
    }

    limpiar() {
        this.item = null;
        this.tagsSeleccionados = [];
        if (this.tiposDropdown) this.tiposDropdown.setSelected(null);
        if (this.tagsDropdown) this.tagsDropdown.setSelected([]);
        document.getElementById('form-update-activo')?.reset();
    }

    unmount() {
        if (this.tiposDropdown) this.tiposDropdown.unmount();
        if (this.tagsDropdown) this.tagsDropdown.unmount();
        this._abortController.abort();
    }
}