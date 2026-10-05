import { ubicacionesService } from '/src/services/ubicaciones.js';

export class CreateDepartamento {
    constructor(permisos, onSuccess) {
        this.permisos = permisos || {};
        this.onSuccess = onSuccess;
        this.puedeCrear = this.permisos.crear || false;
        this.puedeEditar = this.permisos.editar || false;
    }

    renderFormHTML() {
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        if (!this.puedeCrear && !this.puedeEditar) {
            return '<div style="color:#757575; font-style:italic;">Sin permisos para gestionar departamentos.</div>';
        }

        return `
            <form id="form-departamento">
                <input type="text" name="nombre" id="input-depto-nombre" placeholder="Nombre Oficial del Departamento" required
                    minlength="2" maxlength="150" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">

                <input type="text" name="curp_jefe_departamento" id="input-depto-curp" placeholder="CURP del Jefe / Resguardatario" required
                    pattern="${regexCurp}" minlength="18" maxlength="18"
                    title="Ingrese los 18 caracteres de la CURP oficial"
                    style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase; box-sizing:border-box;">

                <button type="submit" id="btn-submit-depto" style="width:100%; padding:8px; background:#00796b; color:white; border:none; cursor:pointer; font-weight:600;">
                    Registrar Departamento
                </button>
                <button type="button" id="btn-cancelar-depto" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">
                    Cancelar Edición
                </button>
            </form>
        `;
    }

    bindSubmit(signal, editingDeptoIdResolver, onCancel) {
        const form = document.getElementById('form-departamento');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const payload = {
                nombre: formData.get('nombre').trim(),
                curp_jefe_departamento: formData.get('curp_jefe_departamento').toUpperCase().trim()
            };

            const editingId = editingDeptoIdResolver();

            try {
                if (editingId) {
                    await ubicacionesService.actualizarDepartamento(editingId, payload);
                    alert('Estructura departamental actualizada');
                } else {
                    await ubicacionesService.crearDepartamento(payload);
                    alert('Departamento registrado correctamente');
                }
                if (onCancel) onCancel();
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error en departamento: ' + (err.response?.data?.detail || err.message));
            }
        }, { signal });

        document.getElementById('btn-cancelar-depto')?.addEventListener('click', () => {
            if (onCancel) onCancel();
        }, { signal });
    }
}