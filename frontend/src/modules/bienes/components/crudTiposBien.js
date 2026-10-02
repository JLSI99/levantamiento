import { CreateTipoBien } from '/src/modules/bienes/components/tiposBienComponents/CreateTipoBien.js';
import { ReadTiposBien } from '/src/modules/bienes/components/tiposBienComponents/ReadTiposBien.js';
import { UpdateTipoBien } from '/src/modules/bienes/components/tiposBienComponents/UpdateTipoBien.js';
import { DeleteTipoBien } from '/src/modules/bienes/components/tiposBienComponents/DeleteTipoBien.js';

export class CrudTiposBien {
    constructor(formContainerId, tableContainerId, permisos) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this.permisos = permisos;
        this._abortController = new AbortController();

        this.onTiposLoaded = null;
        this.onTiposChanged = null;
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        const tableContainer = document.getElementById(this.tableContainerId);
        if (!formContainer || !tableContainer) return;

        formContainer.innerHTML = `
            <div id="create-tipo-container"></div>
            <div id="update-tipo-container" style="display:none;"></div>
        `;

        tableContainer.innerHTML = `
            <div id="read-tipo-container"></div>
        `;

        this.deleteTipoBien = new DeleteTipoBien(() => {
            if (this.onTiposChanged) this.onTiposChanged();
        });

        this.readTiposBien = new ReadTiposBien(
            'read-tipo-container',
            this.permisos,
            (id, item) => this.activarEdicion(id, item),
            (id) => this.deleteTipoBien.darDeBaja(id),
            (data) => {
                if (this.onTiposLoaded) this.onTiposLoaded(data);
            }
        );

        this.createTipoBien = new CreateTipoBien(
            'create-tipo-container',
            this.permisos,
            () => {
                if (this.onTiposChanged) this.onTiposChanged();
            }
        );

        this.updateTipoBien = new UpdateTipoBien(
            'update-tipo-container',
            this.permisos,
            () => {
                this.desactivarEdicion();
                if (this.onTiposChanged) this.onTiposChanged();
            },
            () => this.desactivarEdicion()
        );

        this.readTiposBien.render();
        this.createTipoBien.render();
    }

    cargarDatos() {
        if (this.readTiposBien) this.readTiposBien.cargarDatos();
    }

    activarEdicion(id, item) {
        document.getElementById('create-tipo-container').style.display = 'none';
        document.getElementById('update-tipo-container').style.display = 'block';
        this.updateTipoBien.render(item);
    }

    desactivarEdicion() {
        document.getElementById('update-tipo-container').style.display = 'none';
        document.getElementById('create-tipo-container').style.display = 'block';
        this.updateTipoBien.limpiar();
    }

    unmount() {
        this._abortController.abort();
        this.readTiposBien?.unmount();
        this.createTipoBien?.unmount();
        this.updateTipoBien?.unmount();
    }
}