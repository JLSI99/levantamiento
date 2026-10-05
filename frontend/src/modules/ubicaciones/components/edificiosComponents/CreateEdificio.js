import { ubicacionesService } from '/src/services/ubicaciones.js';

export class CreateEdificio {
    constructor(formContainerId, permisos, onSuccess) {
        this.formContainerId = formContainerId;
        this.permisos = permisos || {};
        this.onSuccess = onSuccess;
        this.puedeCrear = this.permisos.crear || false;
        this.puedeEditar = this.permisos.editar || false;
    }

    render() {
        const container = document.getElementById(this.formContainerId);
        if (!container) return;

        if (!this.puedeCrear && !this.puedeEditar) {
            container.innerHTML = '<div style="color:#757575; font-style:italic;">Sin permisos para gestionar edificios.</div>';
            return;
        }

        container.innerHTML = `
            <h4 id="form-edificio-titulo" style="margin-top:0; color:#424242;">Registrar Edificio</h4>
            <form id="form-edificio">
                <input type="text" name="nombre" id="input-edf-nombre" placeholder="Nombre del Edificio (ej. Edificio K)" required
                    minlength="2" maxlength="100" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">
                
                <input type="text" name="clave" id="input-edf-clave" placeholder="Clave Corta (ej. EDF-K)"
                    maxlength="20" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">

                <button type="submit" id="btn-submit-edificio" style="width:100%; padding:8px; background:#00796b; color:white; border:none; cursor:pointer; font-weight:600;">
                    Crear Edificio
                </button>
                <button type="button" id="btn-cancelar-edificio" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">
                    Cancelar Edición
                </button>
            </form>
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