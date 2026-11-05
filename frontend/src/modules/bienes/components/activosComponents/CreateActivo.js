import { bienesService } from '/src/services/bienes.js';
import { DropdownSelect } from './DropdownSelect.js';

export class CreateActivo {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();

        this.tiposDropdown = null;
        this.tagsDropdown = null;

        this.tiposRaw = [];
        this.tagsRaw = [];
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
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Costo</label>
                            <input type="number" step="0.01" name="costo" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Adquisición</label>
                            <input type="date" name="fecha_adquisicion" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- SELECTOR TIPO DE BIEN -->
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tipo de Bien *</label>
                        <div id="selector-tipo-bien-container"></div>
                    </div>

                    <!-- SELECTOR DE TAGS / ETIQUETAS (MULTISELECCIÓN) -->
                    <div style="margin-bottom:15px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Etiquetas / Tags (Opcional - Múltiple)</label>
                        <div id="selector-tags-container"></div>
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

        if (this.permisos.crear) {
            this._initSubComponents();
            this.bindEvents();
            await this.cargarCatalogos();
        }
    }

    _initSubComponents() {
        this.tiposDropdown = new DropdownSelect({
            containerId: 'create-tipo-dropdown',
            placeholder: 'Seleccione un tipo de bien...',
            isMulti: false
        });
        this.tiposDropdown.render(document.getElementById('selector-tipo-bien-container'));

        this.tagsDropdown = new DropdownSelect({
            containerId: 'create-tags-dropdown',
            placeholder: 'Seleccionar etiquetas...',
            isMulti: true
        });
        this.tagsDropdown.render(document.getElementById('selector-tags-container'));
    }

    async cargarCatalogos() {
        try {
            const resTipos = await bienesService.listarTiposBien(100, 0, false);
            this.tiposRaw = Array.isArray(resTipos) ? resTipos : (resTipos?.data || []);
            
            const formattedTipos = this.tiposRaw.map(t => ({ id: t.id_tipo, nombre: t.nombre }));
            this.tiposDropdown.setItems(formattedTipos);

            const resTags = await bienesService.listarTagsBien(100, 0, false);
            this.tagsRaw = Array.isArray(resTags) ? resTags : (resTags?.data || []);
            
            const formattedTags = this.tagsRaw.map(t => ({ id: t.id_tag, nombre: t.nombre }));
            this.tagsDropdown.setItems(formattedTags);

        } catch (error) {
            console.error('Error al cargar catálogos desde CreateActivo:', error);
        }
    }

    actualizarSelectTipos(tipos) {
        this.tiposRaw = Array.isArray(tipos) ? tipos : (tipos?.data || []);
        this.tiposDropdown.setItems(this.tiposRaw.map(t => ({ id: t.id_tipo, nombre: t.nombre })));
    }

    actualizarSelectTags(tags) {
        this.tagsRaw = Array.isArray(tags) ? tags : (tags?.data || []);
        this.tagsDropdown.setItems(this.tagsRaw.map(t => ({ id: t.id_tag, nombre: t.nombre })));
    }

    bindEvents() {
        const form = document.getElementById('form-create-activo');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);

            const tipoSeleccionado = this.tiposDropdown.selectedValues;
            if (!tipoSeleccionado) {
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
                tipos_ids: [tipoSeleccionado],
                tags_ids: this.tagsDropdown.selectedValues
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
                this.tiposDropdown.setSelected(null);
                this.tagsDropdown.setSelected([]);
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error: ' + (err.response?.data?.detail || err.message));
            }
        }, { signal: this._abortController.signal });
    }

    unmount() {
        if (this.tiposDropdown) this.tiposDropdown.unmount();
        if (this.tagsDropdown) this.tagsDropdown.unmount();
        this._abortController.abort();
    }
}