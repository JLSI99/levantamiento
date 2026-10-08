import { bienesService } from '/src/services/bienes.js';

export class CreateActivo {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
        this.tipos = [];
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                <h3 style="margin-top:0; color:#1a237e; font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px;">
                    Indexación de Activo Físico
                </h3>
                ${this.permisos.crear ? `
                <form id="form-create-activo">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Descripción Completa *</label>
                    <input type="text" name="descripcion" placeholder="Ej. Monitor Dell UltraSharp 27" required 
                        style="width:100%; margin-bottom:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Serie</label>
                            <input type="text" name="serie" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Marca</label>
                            <input type="text" name="marca" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Modelo</label>
                            <input type="text" name="modelo" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Costo (MXN) *</label>
                            <input type="number" step="0.01" name="costo" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Adquisición</label>
                            <input type="date" name="fecha_adquisicion" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tipo de Bien *</label>
                    <select name="tipos_ids" id="select-create-tipos" multiple required 
                        style="width:100%; margin-bottom:4px; padding:6px; border:1px solid #ccc; border-radius:4px; height:80px;">
                    </select>
                    <small style="display:block; margin-bottom:15px; color:#757575;">Mantén presionado Ctrl (Win) o Cmd (Mac) para seleccionar varios</small>

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
        this.renderSelectTipos();
    }

    actualizarSelectTipos(tipos) {
        this.tipos = tipos;
        this.renderSelectTipos();
    }

    renderSelectTipos() {
        const select = document.getElementById('select-create-tipos');
        if (!select) return;
        select.innerHTML = this.tipos.map(t => `<option value="${t.id_tipo}">${t.nombre}</option>`).join('');
    }

    bindEvents() {
        const form = document.getElementById('form-create-activo');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const selectElement = document.getElementById('select-create-tipos');
                const tiposIds = Array.from(selectElement.selectedOptions).map(opt => opt.value);

                const payload = {
                    descripcion: formData.get('descripcion').trim(),
                    serie: formData.get('serie').trim() || null,
                    marca: formData.get('marca').trim() || null,
                    modelo: formData.get('modelo').trim() || null,
                    costo: parseFloat(formData.get('costo')),
                    fecha_adquisicion: formData.get('fecha_adquisicion') || null,
                    tipos_ids: tiposIds
                };

                try {
                    const nuevoBien = await bienesService.crearNuevoBien(payload);
                    
                    const fileInput = document.getElementById('input-archivo-imagen-create');
                    if (fileInput && fileInput.files && fileInput.files.length > 0 && nuevoBien?.id_bien) {
                        try {
                            const archivos = Array.from(fileInput.files);
                            await bienesService.subirImagenBien(nuevoBien.id_bien, archivos);
                        } catch (imgErr) {
                            console.error('El bien se creó pero falló la carga de la imagen:', imgErr);
                            alert('Activo indexado, pero ocurrió un error al subir las imágenes.');
                        }
                    }

                    alert('Activo indexado exitosamente.');
                    form.reset();
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }
    }

    unmount() {
        this._abortController.abort();
    }
}