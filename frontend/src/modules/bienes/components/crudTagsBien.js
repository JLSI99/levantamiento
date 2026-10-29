import authStore from '/src/core/store/authStore.js';
import { checkAccess } from '/src/core/security/CanRender.js';
import { CreateTagsBien } from '/src/modules/bienes/components/tagsBienComponents/CreateTagsBien.js';
import { ReadTagsBien } from '/src/modules/bienes/components/tagsBienComponents/ReadTagsBien.js';
import { UpdateTagsBien } from '/src/modules/bienes/components/tagsBienComponents/UpdateTagsBien.js';
import { DeleteTagsBien } from '/src/modules/bienes/components/tagsBienComponents/DeleteTagsBien.js';

export class CrudTagsBien {
    constructor(formContainerId, tableContainerId) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this._abortController = new AbortController();

        this.onTagsLoaded = null;
        this.onTagsChanged = null;
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        const tableContainer = document.getElementById(this.tableContainerId);
        if (!formContainer || !tableContainer) return;

        const state = authStore.getSnapshot();

        // Evaluación unificada de permisos por capacidades (CapBAC)
        const permisos = {
            crear: checkAccess('bienes:crear', state),
            editar: checkAccess('bienes:editar', state),
            borrar: checkAccess('bienes:borrar', state),
            leer: checkAccess('bienes:leer', state)
        };

        formContainer.innerHTML = `
            <div class="module-card" style="margin-bottom: 0;">
                <div id="create-tag-container"></div>
                <div id="update-tag-container" style="display:none;"></div>
            </div>
        `;

        tableContainer.innerHTML = `
            <div class="module-card" style="margin-bottom: 0;">
                <div id="read-tag-container"></div>
            </div>
        `;

        this.deleteTagsBien = new DeleteTagsBien(() => {
            if (this.onTagsChanged) this.onTagsChanged();
        });

        this.readTagsBien = new ReadTagsBien(
            'read-tag-container',
            permisos,
            (id, item) => this.activarEdicion(id, item),
            (id) => this.deleteTagsBien.darDeBaja(id),
            (data) => {
                if (this.onTagsLoaded) this.onTagsLoaded(data);
            }
        );

        this.createTagsBien = new CreateTagsBien(
            'create-tag-container',
            permisos,
            () => {
                if (this.onTagsChanged) this.onTagsChanged();
            }
        );

        this.updateTagsBien = new UpdateTagsBien(
            'update-tag-container',
            permisos,
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