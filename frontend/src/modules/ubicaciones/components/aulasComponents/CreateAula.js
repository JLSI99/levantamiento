import { ubicacionesService } from '/src/services/ubicaciones.js';

export class CreateAula {
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
            container.innerHTML = '<div style="color:#757575; font-style:italic;">Sin permisos para gestionar aulas.</div>';
            return;
        }

        container.innerHTML = `
            <h4 id="form-aula-titulo" style="margin-top:0; color:#424242;">Agregar Aula / Espacio</h4>
            <form id="form-aula">
                <select id="select-aula-edificio" required style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">
                    <option value="">Seleccione Edificio Destino...</option>
                </select>
                
                <input type="text" name="nombre" id="input-aula-nombre" placeholder="Nombre del Aula (ej. Laboratorio LIS)" required
                    minlength="2" maxlength="100" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">

                <button type="submit" id="btn-submit-aula" style="width:100%; padding:8px; background:#0288d1; color:white; border:none; cursor:pointer; font-weight:600;">
                    Anexar Aula
                </button>
                <button type="button" id="btn-cancelar-aula" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">
                    Cancelar Edición
                </button>
            </form>
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