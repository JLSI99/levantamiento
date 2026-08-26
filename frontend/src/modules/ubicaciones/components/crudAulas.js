import { ubicacionesService } from '../../../services/ubicaciones.js';

export class CrudAulas {
    constructor(formContainerId, permisos) {
        this.formContainerId = formContainerId;
        this.permisos = permisos || [];

        this.puedeCrearUbi = this.permisos.includes('ubicaciones:crear');
        this.puedeEditarUbi = this.permisos.includes('ubicaciones:editar');
        this.puedeBorrarUbi = this.permisos.includes('ubicaciones:borrar');

        this._editingAulaId = null;
        this._abortController = new AbortController();

        // Callback para avisar al orquestador que se modificó un aula y recargue la tabla
        this.onAulaChanged = null;
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        if (!formContainer) return;

        formContainer.innerHTML = `
            <h4 id="form-aula-titulo" style="margin-top:0; color:#424242;">Agregar Aula / Espacio</h4>
            ${(this.puedeCrearUbi || this.puedeEditarUbi) ? `
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
            ` : '<div style="color:#757575; font-style:italic;">Sin permisos para gestionar aulas.</div>'}
        `;

        this.bindEvents();
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const formAula = document.getElementById('form-aula');
        
        if (formAula) {
            formAula.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formAula);
                const idEdificioSel = document.getElementById('select-aula-edificio').value;
                const payload = { nombre: formData.get('nombre').trim() };

                try {
                    if (this._editingAulaId) {
                        await ubicacionesService.actualizarAula(this._editingAulaId, payload);
                        alert('Aula actualizada con éxito');
                    } else {
                        if (!idEdificioSel) {
                            alert('Debe seleccionar un edificio base');
                            return;
                        }
                        await ubicacionesService.crearAula(idEdificioSel, payload);
                        alert('Aula anexada al edificio correctamente');
                    }
                    this.desactivarEdicionAula();
                    if (this.onAulaChanged) this.onAulaChanged();
                } catch (err) {
                    alert('Error al procesar el aula: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal });
        }

        document.getElementById('btn-cancelar-aula')?.addEventListener('click', () => this.desactivarEdicionAula(), { signal });
    }

    actualizarSelectEdificios(edificios) {
        const select = document.getElementById('select-aula-edificio');
        if (!select) return;
        
        const valActual = select.value;
        select.innerHTML = '<option value="">Seleccione Edificio Destino...</option>' +
            edificios.map(e => `<option value="${e.id_edificio}">${e.nombre} (${e.clave || 'S/C'})</option>`).join('');
        select.value = valActual;
    }

    activarEdicionAula(idAula, idEdificio, nombreAula) {
        this._editingAulaId = idAula;
        document.getElementById('input-aula-nombre').value = nombreAula;
        
        const selEdificio = document.getElementById('select-aula-edificio');
        if (selEdificio) {
            selEdificio.value = idEdificio;
            selEdificio.disabled = true;
        }

        document.getElementById('form-aula-titulo').textContent = 'Editar Nombre de Aula';
        const btnSubmit = document.getElementById('btn-submit-aula');
        btnSubmit.textContent = 'Actualizar Aula';
        btnSubmit.style.background = '#e65100';
        document.getElementById('btn-cancelar-aula').style.display = 'block';
    }

    desactivarEdicionAula() {
        this._editingAulaId = null;
        document.getElementById('form-aula')?.reset();
        const selEdificio = document.getElementById('select-aula-edificio');
        if (selEdificio) selEdificio.disabled = false;

        document.getElementById('form-aula-titulo').textContent = 'Agregar Aula / Espacio';
        const btnSubmit = document.getElementById('btn-submit-aula');
        if (btnSubmit) {
            btnSubmit.textContent = 'Anexar Aula';
            btnSubmit.style.background = '#0288d1';
        }
        document.getElementById('btn-cancelar-aula').style.display = 'none';
    }

    async eliminarAula(idAula) {
        if (!this.puedeBorrarUbi) return;
        
        if (confirm('¿Eliminar esta aula/espacio físico del inventario?')) {
            try {
                await ubicacionesService.darBajaAula(idAula);
                if (this.onAulaChanged) this.onAulaChanged();
            } catch (err) {
                alert('Error al eliminar aula: ' + err.message);
            }
        }
    }

    unmount() {
        this._abortController.abort();
    }
}