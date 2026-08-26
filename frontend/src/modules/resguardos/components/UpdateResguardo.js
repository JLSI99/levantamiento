import { resguardosService } from '../../../services/resguardos.js';

export class UpdateResguardo {
    prepararFormulario(item) {
        document.getElementById('form-titulo').textContent = 'Editar Asignación de Resguardo';
        document.getElementById('btn-submit-resguardo').textContent = 'Guardar Cambios';
        document.getElementById('btn-cancelar-edicion').style.display = 'block';

        const inputBien = document.getElementById('input-id-bien');
        const inputCurp = document.getElementById('input-curp');

        if (inputBien && item.bien) inputBien.value = item.bien.id_bien;
        if (inputCurp && item.persona) inputCurp.value = item.persona.curp;

        // Bajar scroll hacia el form
        document.getElementById('form-crear-resguardo').scrollIntoView({ behavior: 'smooth' });
    }

    limpiarFormulario() {
        const form = document.getElementById('form-crear-resguardo');
        if (form) form.reset();
        
        document.getElementById('form-titulo').textContent = 'Nueva Asignación de Resguardo';
        document.getElementById('btn-submit-resguardo').textContent = 'Emitir Acta de Resguardo';
        document.getElementById('btn-cancelar-edicion').style.display = 'none';
    }

    async actualizar(idAsignacion, payload) {
        await resguardosService.modificarAsignacion(idAsignacion, payload);
        alert('Acta de resguardo modificada exitosamente.');
    }
}