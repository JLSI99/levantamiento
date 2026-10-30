import { ubicacionesService } from '/src/services/ubicaciones.js';

export class CreateAula {
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
            container.innerHTML = '<div class="forbidden-container" style="padding:15px; font-size:12px;">Sin permisos para gestionar aulas.</div>';
            return;
        }

        container.innerHTML = `
            <div style="width:100%; box-sizing:border-box;">
                <h4 id="form-aula-titulo" style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Agregar Aula / Espacio</h4>
                <form id="form-aula" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Edificio Destino *</label>
                        <select id="select-aula-edificio" required style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                            <option value="">Seleccione Edificio Destino...</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nombre del Aula *</label>
                        <input type="text" name="nombre" id="input-aula-nombre" placeholder="Nombre del Aula (ej. Laboratorio LIS)" required
                            minlength="2" maxlength="100" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>

                    <button type="submit" id="btn-submit-aula" style="width:100%; padding:10px; background:var(--primary, #0288d1); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Anexar Aula
                    </button>
                    <button type="button" id="btn-cancelar-aula" style="display:none; width:100%; padding:10px; background:var(--text-muted, #757575); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Cancelar Edición
                    </button>
                </form>
            </div>
        `;
    }

    bindSubmit(signal, editingAulaIdResolver, onCancel) {
        const form = document.getElementById('form-aula');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const idEdificioSel = document.getElementById('select-aula-edificio').value;
            const payload = { nombre: formData.get('nombre').trim() };
            const editingId = editingAulaIdResolver();

            try {
                if (editingId) {
                    await ubicacionesService.actualizarAula(editingId, payload);
                    alert('Aula actualizada con éxito');
                } else {
                    if (!idEdificioSel) {
                        alert('Debe seleccionar un edificio base');
                        return;
                    }
                    await ubicacionesService.crearAula(idEdificioSel, payload);
                    alert('Aula anexada al edificio correctamente');
                }
                if (onCancel) onCancel();
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error al procesar el aula: ' + (err.response?.data?.detail || err.message));
            }
        }, { signal });

        document.getElementById('btn-cancelar-aula')?.addEventListener('click', () => {
            if (onCancel) onCancel();
        }, { signal });
    }
}