import { CreateAula } from '/src/modules/ubicaciones/components/aulasComponents/CreateAula.js';
import { UpdateAula } from '/src/modules/ubicaciones/components/aulasComponents/UpdateAula.js';
import { DeleteAula } from '/src/modules/ubicaciones/components/aulasComponents/DeleteAula.js';

export class CrudAulas {
    constructor(formContainerId, permisos, onAulaChanged) {
        this.formContainerId = formContainerId;
        this.permisos = permisos || {};
        this.onAulaChanged = onAulaChanged || null;

        this._editingAulaId = null;
        this._abortController = new AbortController();

        this.createComp = new CreateAula(this.formContainerId, this.permisos, () => {
            if (this.onAulaChanged) this.onAulaChanged();
        });
    }

    render() {
        this.createComp.render();
        this.bindEvents();
    }

    bindEvents() {
        const signal = this._abortController.signal;

        this.createComp.bindSubmit(
            signal,
            () => this._editingAulaId,
            () => this.desactivarEdicionAula()
        );
    }

    actualizarOpcionesEdificios(edificios) {
        const select = document.getElementById('select-aula-edificio');
        if (!select) return;

        const valActual = select.value;
        select.innerHTML = '<option value="">Seleccione Edificio Destino...</option>' +
            edificios.map(e => `<option value="${e.id_edificio}">${e.nombre} (${e.clave || 'S/C'})</option>`).join('');
        select.value = valActual;
    }

    activarEdicion(idAula, idEdificio, nombreAula) {
        this._editingAulaId = idAula;
        UpdateAula.activar(idAula, idEdificio, nombreAula);
    }

    desactivarEdicionAula() {
        this._editingAulaId = null;
        UpdateAula.desactivar();
    }

    async eliminarAula(idAula) {
        await DeleteAula.ejecutar(idAula, this.permisos.borrar, () => {
            if (this.onAulaChanged) this.onAulaChanged();
        });
    }

    unmount() {
        this._abortController.abort();
    }
}