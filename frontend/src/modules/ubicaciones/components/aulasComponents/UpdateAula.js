export class UpdateAula {
    static activar(idAula, idEdificio, nombreAula) {
        const inputNombre = document.getElementById('input-aula-nombre');
        const selEdificio = document.getElementById('select-aula-edificio');
        const titulo = document.getElementById('form-aula-titulo');
        const btnSubmit = document.getElementById('btn-submit-aula');
        const btnCancelar = document.getElementById('btn-cancelar-aula');

        if (inputNombre) inputNombre.value = nombreAula;
        if (selEdificio) {
            selEdificio.value = idEdificio;
            selEdificio.disabled = true;
        }
        if (titulo) titulo.textContent = 'Editar Nombre de Aula';
        if (btnSubmit) {
            btnSubmit.textContent = 'Actualizar Aula';
            btnSubmit.style.background = '#e65100';
        }
        if (btnCancelar) btnCancelar.style.display = 'block';
    }

    static desactivar() {
        const form = document.getElementById('form-aula');
        const selEdificio = document.getElementById('select-aula-edificio');
        const titulo = document.getElementById('form-aula-titulo');
        const btnSubmit = document.getElementById('btn-submit-aula');
        const btnCancelar = document.getElementById('btn-cancelar-aula');

        if (form) form.reset();
        if (selEdificio) selEdificio.disabled = false;
        if (titulo) titulo.textContent = 'Agregar Aula / Espacio';
        if (btnSubmit) {
            btnSubmit.textContent = 'Anexar Aula';
            btnSubmit.style.background = '#0288d1';
        }
        if (btnCancelar) btnCancelar.style.display = 'none';
    }
}