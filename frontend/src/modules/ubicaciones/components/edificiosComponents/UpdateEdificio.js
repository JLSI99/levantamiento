export class UpdateEdificio {
    static activar(edificio) {
        if (!edificio) return;

        const inputNombre = document.getElementById('input-edf-nombre');
        const inputClave = document.getElementById('input-edf-clave');
        const titulo = document.getElementById('form-edificio-titulo');
        const btnSubmit = document.getElementById('btn-submit-edificio');
        const btnCancelar = document.getElementById('btn-cancelar-edificio');

        if (inputNombre) inputNombre.value = edificio.nombre;
        if (inputClave) inputClave.value = edificio.clave || '';
        if (titulo) titulo.textContent = 'Editar Edificio';
        
        if (btnSubmit) {
            btnSubmit.textContent = 'Actualizar Edificio';
            btnSubmit.style.background = '#e65100';
        }
        if (btnCancelar) btnCancelar.style.display = 'block';
    }

    static desactivar() {
        const form = document.getElementById('form-edificio');
        const titulo = document.getElementById('form-edificio-titulo');
        const btnSubmit = document.getElementById('btn-submit-edificio');
        const btnCancelar = document.getElementById('btn-cancelar-edificio');

        if (form) form.reset();
        if (titulo) titulo.textContent = 'Registrar Edificio';
        if (btnSubmit) {
            btnSubmit.textContent = 'Crear Edificio';
            btnSubmit.style.background = '#00796b';
        }
        if (btnCancelar) btnCancelar.style.display = 'none';
    }
}