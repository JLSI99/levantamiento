export class UpdateDepartamento {
    static activar(depto) {
        if (!depto) return;

        const inputNombre = document.getElementById('input-depto-nombre');
        const inputCurp = document.getElementById('input-depto-curp');
        const titulo = document.getElementById('form-depto-titulo');
        const btnSubmit = document.getElementById('btn-submit-depto');
        const btnCancelar = document.getElementById('btn-cancelar-depto');

        if (inputNombre) inputNombre.value = depto.nombre;
        if (inputCurp) inputCurp.value = depto.curp_jefe_departamento;
        if (titulo) titulo.textContent = 'Editar Departamento';
        if (btnSubmit) {
            btnSubmit.textContent = 'Actualizar Departamento';
            btnSubmit.style.background = '#e65100';
        }
        if (btnCancelar) btnCancelar.style.display = 'block';
    }

    static desactivar() {
        const form = document.getElementById('form-departamento');
        const titulo = document.getElementById('form-depto-titulo');
        const btnSubmit = document.getElementById('btn-submit-depto');
        const btnCancelar = document.getElementById('btn-cancelar-depto');

        if (form) form.reset();
        if (titulo) titulo.textContent = 'Alta de Departamento';
        if (btnSubmit) {
            btnSubmit.textContent = 'Registrar Departamento';
            btnSubmit.style.background = '#00796b';
        }
        if (btnCancelar) btnCancelar.style.display = 'none';
    }
}