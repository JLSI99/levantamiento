import { CreateTagsBien } from '/src/modules/bienes/components/tagsBienComponents/CreateTagsBien.js';
import { ReadTagsBien } from '/src/modules/bienes/components/tagsBienComponents/ReadTagsBien.js';
import { UpdateTagsBien } from '/src/modules/bienes/components/tagsBienComponents/UpdateTagsBien.js';
import { DeleteTagsBien } from '/src/modules/bienes/components/tagsBienComponents/DeleteTagsBien.js';

export class CrudTagsBien {
    constructor(formContainerId, tableContainerId, permisos) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this.permisos = permisos;
        this._abortController = new AbortController();

        this.onTagsLoaded = null;
        this.onTagsChanged = null;
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        const tableContainer = document.getElementById(this.tableContainerId);
        if (!formContainer || !tableContainer) return;

        formContainer.innerHTML = `
            <div id="create-tag-container"></div>
            <div id="update-tag-container" style="display:none;"></div>
        `;

        tableContainer.innerHTML = `
            <div id="read-tag-container"></div>
        `;

        this.deleteTagsBien = new DeleteTagsBien(() => {
            if (this.onTagsChanged) this.onTagsChanged();
        });

        this.readTagsBien = new ReadTagsBien(
            'read-tag-container',
            this.permisos,
            (id, item) => this.activarEdicion(id, item),
            (id) => this.deleteTagsBien.darDeBaja(id),
            (data) => {
                if (this.onTagsLoaded) this.onTagsLoaded(data);
            }
        );

        this.createTagsBien = new CreateTagsBien(
            'create-tag-container',
            this.permisos,
            () => {
                if (this.onTagsChanged) this.onTagsChanged();
            }
        );

        this.updateTagsBien = new UpdateTagsBien(
            'update-tag-container',
            this.permisos,
            () => {
                this.desactivarEdicion();
                if (this.onTagsChanged) this.onTagsChanged();
            },
            () => this.desactivarEdicion()
        );

        this.readTagsBien.render();
        this.createTagsBien.render();
    }

    cargarDatos() {
        if (this.readTagsBien) this.readTagsBien.cargarDatos();
    }

    activarEdicion(id, item) {
        const createContainer = document.getElementById('create-tag-container');
        const updateContainer = document.getElementById('update-tag-container');
        if (createContainer) createContainer.style.display = 'none';
        if (updateContainer) updateContainer.style.display = 'block';
        this.updateTagsBien.render(item);
    }

    desactivarEdicion() {
        const createContainer = document.getElementById('create-tag-container');
        const updateContainer = document.getElementById('update-tag-container');
        if (updateContainer) updateContainer.style.display = 'none';
        if (createContainer) createContainer.style.display = 'block';
        this.updateTagsBien.limpiar();
    }

    unmount() {
        this._abortController.abort();
        this.readTagsBien?.unmount();
        this.createTagsBien?.unmount();
        this.updateTagsBien?.unmount();
    }
}