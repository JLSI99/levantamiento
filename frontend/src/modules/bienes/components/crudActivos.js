import { CreateActivo } from '/src/modules/bienes/components/activosComponents/CreateActivo.js';
import { ReadActivos } from '/src/modules/bienes/components/activosComponents/ReadActivos.js';
import { UpdateActivo } from '/src/modules/bienes/components/activosComponents/UpdateActivo.js';
import { DeleteActivo } from '/src/modules/bienes/components/activosComponents/DeleteActivo.js';

export class CrudActivos {
    constructor(formContainerId, tableContainerId, permisos) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this.permisos = permisos;
        this._abortController = new AbortController();

        this.onActivosChanged = null;
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        const tableContainer = document.getElementById(this.tableContainerId);
        if (!formContainer || !tableContainer) return;

        formContainer.innerHTML = `
            <div id="create-activo-container"></div>
            <div id="update-activo-container" style="display:none;"></div>
        `;

        tableContainer.innerHTML = `
            <div id="read-activo-container"></div>
        `;

        this.deleteActivo = new DeleteActivo(() => {
            this.cargarDatos();
            if (this.onActivosChanged) this.onActivosChanged();
        });

        this.readActivos = new ReadActivos(
            'read-activo-container',
            this.permisos,
            (id, item) => this.activarEdicion(id, item),
            (id) => this.deleteActivo.darDeBaja(id)
        );

        this.createActivo = new CreateActivo(
            'create-activo-container',
            this.permisos,
            () => {
                this.cargarDatos();
                if (this.onActivosChanged) this.onActivosChanged();
            }
        );

        this.updateActivo = new UpdateActivo(
            'update-activo-container',
            this.permisos,
            () => {
                this.desactivarEdicion();
                this.cargarDatos();
                if (this.onActivosChanged) this.onActivosChanged();
            },
            () => this.desactivarEdicion()
        );

        this.readActivos.render();
        this.createActivo.render();
    }

    cargarDatos() {
        if (this.readActivos) this.readActivos.cargarDatos();
    }

    actualizarSelectTipos(tipos) {
        if (this.createActivo?.actualizarSelectTipos) {
            this.createActivo.actualizarSelectTipos(tipos);
        }
        if (this.updateActivo?.actualizarSelectTipos) {
            this.updateActivo.actualizarSelectTipos(tipos);
        }
    }

    actualizarSelectTags(tags) {
        if (this.createActivo?.actualizarSelectTags) {
            this.createActivo.actualizarSelectTags(tags);
        }
        if (this.updateActivo?.actualizarSelectTags) {
            this.updateActivo.actualizarSelectTags(tags);
        }
    }

    activarEdicion(id, item) {
        const createContainer = document.getElementById('create-activo-container');
        const updateContainer = document.getElementById('update-activo-container');
        if (createContainer) createContainer.style.display = 'none';
        if (updateContainer) updateContainer.style.display = 'block';
        if (this.updateActivo) this.updateActivo.render(item);
    }

    desactivarEdicion() {
        const createContainer = document.getElementById('create-activo-container');
        const updateContainer = document.getElementById('update-activo-container');
        if (updateContainer) updateContainer.style.display = 'none';
        if (createContainer) createContainer.style.display = 'block';
        if (this.updateActivo) this.updateActivo.limpiar();
    }

    unmount() {
        this._abortController.abort();
        this.readActivos?.unmount();
        this.createActivo?.unmount();
        this.updateActivo?.unmount();
    }
}