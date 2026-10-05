import { CreateEdificio } from '/src/modules/ubicaciones/components/edificiosComponents/CreateEdificio.js';
import { ReadEdificios } from '/src/modules/ubicaciones/components/edificiosComponents/ReadEdificios.js';
import { UpdateEdificio } from '/src/modules/ubicaciones/components/edificiosComponents/UpdateEdificio.js';
import { DeleteEdificio } from '/src/modules/ubicaciones/components/edificiosComponents/DeleteEdificio.js';

export class CrudEdificios {
    constructor(formContainerId, tableContainerId, permisos, onEdificiosLoaded, onEditAulaRequest) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this.permisos = permisos || {};

        this._editingEdificioId = null;
        this._edificiosCache = new Map();
        this._abortController = new AbortController();

        this.onEdificiosLoaded = onEdificiosLoaded || null;
        this.onEditAulaRequest = onEditAulaRequest || null;
        this.onDeleteAulaRequest = null;

        this.createComp = new CreateEdificio(this.formContainerId, this.permisos, () => this.cargarDatos());
        this.readComp = new ReadEdificios(this.tableContainerId, this.permisos);
    }

    render() {
        this.createComp.render();
        this.readComp.renderStructure();

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;

        this.createComp.bindSubmit(
            signal,
            () => this._editingEdificioId,
            () => this.desactivarEdicionEdificio()
        );

        const tbodyEdf = document.getElementById('tbody-edificios');
        if (tbodyEdf) {
            tbodyEdf.addEventListener('click', async (e) => {
                const btnEdEdf = e.target.closest('.btn-editar-edificio');
                const btnDelEdf = e.target.closest('.btn-borrar-edificio');
                const btnEdAula = e.target.closest('.btn-editar-aula');
                const btnDelAula = e.target.closest('.btn-borrar-aula');

                if (btnEdEdf) {
                    this.activarEdicionEdificio(btnEdEdf.getAttribute('data-id'));
                } else if (btnDelEdf && this.permisos.borrar) {
                    const id = btnDelEdf.getAttribute('data-id');
                    await DeleteEdificio.ejecutar(id, () => this.cargarDatos());
                } else if (btnEdAula && this.onEditAulaRequest) {
                    this.onEditAulaRequest(
                        btnEdAula.getAttribute('data-id-aula'),
                        btnEdAula.getAttribute('data-id-edificio'),
                        btnEdAula.getAttribute('data-nombre')
                    );
                } else if (btnDelAula && this.onDeleteAulaRequest) {
                    this.onDeleteAulaRequest(btnDelAula.getAttribute('data-id-aula'));
                }
            }, { signal });
        }
    }

    activarEdicionEdificio(idEdificio) {
        const edf = this._edificiosCache.get(idEdificio);
        if (!edf) return;

        this._editingEdificioId = idEdificio;
        UpdateEdificio.activar(edf);
    }

    desactivarEdicionEdificio() {
        this._editingEdificioId = null;
        UpdateEdificio.desactivar();
    }

    async cargarDatos() {
        await this.readComp.cargarDatos(this._edificiosCache, this.onEdificiosLoaded);
    }

    unmount() {
        this._abortController.abort();
    }
}