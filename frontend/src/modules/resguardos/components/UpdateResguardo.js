import { resguardosService } from '/src/services/resguardos.js';

export class UpdateResguardo {
    prepararFormulario(item) {
        document.getElementById('form-titulo').textContent = 'Editar Asignación de Resguardo';
        document.getElementById('btn-submit-resguardo').textContent = 'Guardar Cambios';
        document.getElementById('btn-cancelar-edicion').style.display = 'block';

        const inputBien = document.getElementById('input-id-bien');
        const inputCurp = document.getElementById('input-curp');

        if (inputBien && item.bien) inputBien.value = item.bien.id_bien;
        if (inputCurp && item.persona) inputCurp.value = item.persona.curp;

        if (inputBien && item.bien) {
            inputBien.dispatchEvent(new Event('change'));
        }

        document.getElementById('form-crear-resguardo').scrollIntoView({ behavior: 'smooth' });
    }

    limpiarFormulario() {
        const form = document.getElementById('form-crear-resguardo');
        if (form) form.reset();

        const previewInfo = document.getElementById('preview-bien-info');
        if (previewInfo) previewInfo.innerHTML = '';
        
        document.getElementById('form-titulo').textContent = 'Nueva Asignación de Resguardo';
        document.getElementById('btn-submit-resguardo').textContent = 'Emitir Acta de Resguardo';
        document.getElementById('btn-cancelar-edicion').style.display = 'none';
    }

    async actualizar(idAsignacion, payload) {
        await resguardosService.modificarAsignacion(idAsignacion, payload);
        alert('Acta de resguardo modificada exitosamente.');
    }

    async concluirDevolucion(idAsignacion) {
        if (!confirm(`¿Está seguro de concluir ordinariamente la asignación [ID: ${idAsignacion}] y registrar la devolución del activo al almacén patrimonial?`)) {
            return false;
        }

        try {
            await resguardosService.concluirResguardoOrdinario(idAsignacion);
            alert(`Resguardo [ID: ${idAsignacion}] concluido exitosamente. El activo fue reintegrado al almacén.`);
            return true;
        } catch (error) {
            alert('Error al procesar la devolución del activo: ' + (error.response?.data?.detail || error.message));
            return false;
        }
    }
}