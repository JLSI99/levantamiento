import { ubicacionesService } from '/src/services/ubicaciones.js';

export class CreateEdificio {
    constructor(formContainerId, permisos, onSuccess) {
        this.formContainerId = formContainerId;
        this.permisos = permisos || {};
        this.onSuccess = onSuccess;
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeCrear = isObj ? Boolean(this.permisos.crear) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:crear');
        this.puedeEditar = isObj ? Boolean(this.permisos.editar) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:editar');
    }

    render() {
        const container = document.getElementById(this.formContainerId);
        if (!container) return;

        if (!this.puedeCrear && !this.puedeEditar) {
            container.innerHTML = '<div class="forbidden-container" style="padding:15px; font-size:12px;">Sin permisos para gestionar edificios.</div>';
            return;
        }

        container.innerHTML = `
            <div style="width:100%; box-sizing:border-box;">
                <h4 id="form-edificio-titulo" style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Registrar Edificio</h4>
                <form id="form-edificio" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nombre del Edificio *</label>
                        <input type="text" name="nombre" id="input-edf-nombre" placeholder="Nombre del Edificio (ej. Edificio K)" required
                            minlength="2" maxlength="100" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                    
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Clave Corta</label>
                        <input type="text" name="clave" id="input-edf-clave" placeholder="Clave Corta (ej. EDF-K)"
                            maxlength="20" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>

                    <button type="submit" id="btn-submit-edificio" style="width:100%; padding:10px; background:var(--success, #00796b); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Crear Edificio
                    </button>
                    <button type="button" id="btn-cancelar-edificio" style="display:none; width:100%; padding:10px; background:var(--text-muted, #757575); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Cancelar Edición
                    </button>
                </form>
            </div>
        `;
    }

    bindSubmit(signal, editingEdificioIdResolver, onCancel) {
        const form = document.getElementById('form-edificio');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const payload = {
                nombre: formData.get('nombre').trim(),
                clave: formData.get('clave')?.trim() || null
            };

            const editingId = editingEdificioIdResolver();

            try {
                if (editingId) {
                    await ubicacionesService.actualizarEdificio(editingId, payload);
                    alert('Edificio actualizado correctamente');
                } else {
                    await ubicacionesService.crearEdificio(payload);
                    alert('Edificio dado de alta exitosamente');
                }
                if (onCancel) onCancel();
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error en la operación de Edificio: ' + (err.response?.data?.detail || err.message));
            }
        }, { signal });

        document.getElementById('btn-cancelar-edificio')?.addEventListener('click', () => {
            if (onCancel) onCancel();
        }, { signal });
    }
}