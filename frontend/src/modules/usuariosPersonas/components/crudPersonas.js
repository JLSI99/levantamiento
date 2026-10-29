import authStore from '/src/core/store/authStore.js';
import { checkAccess } from '/src/core/security/CanRender.js';
import { CreatePersona } from '/src/modules/usuariosPersonas/components/personasComponents/CreatePersona.js';
import { ReadPersona } from '/src/modules/usuariosPersonas/components/personasComponents/ReadPersona.js';
import { UpdatePersona } from '/src/modules/usuariosPersonas/components/personasComponents/UpdatePersona.js';
import { DeletePersona } from '/src/modules/usuariosPersonas/components/personasComponents/DeletePersona.js';

export class CrudPersonas {
    constructor(containerId) {
        this.containerId = containerId;
        this._abortController = new AbortController();

        this.readPersona = null;
        this.createPersona = null;
        this.updatePersona = null;
        this.deletePersona = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const state = authStore.getSnapshot();

        // Evaluación estandarizada de permisos por capacidades (CapBAC)
        const permisos = {
            crear: checkAccess('personas:crear', state),
            editar: checkAccess('personas:editar', state),
            borrar: checkAccess('personas:borrar', state),
            leer: checkAccess('personas:leer', state)
        };

        container.innerHTML = `
            <div class="grid-dos-columnas">
                <div>
                    <div id="create-persona-container"></div>
                    <div id="update-persona-container" style="display:none;"></div>
                </div>
                <div id="read-persona-container"></div>
            </div>
        `;

        this.deletePersona = new DeletePersona(() => {
            if (this.readPersona) this.readPersona.cargarDatos();
        });

        this.readPersona = new ReadPersona(
            'read-persona-container',
            permisos,
            (id, persona) => this.activarEdicion(id, persona),
            (id, persona) => this.deletePersona.eliminar(id, persona)
        );

        this.createPersona = new CreatePersona(
            'create-persona-container',
            permisos,
            () => {
                if (this.readPersona) this.readPersona.cargarDatos();
            }
        );

        this.updatePersona = new UpdatePersona(
            'update-persona-container',
            permisos,
            () => {
                this.desactivarEdicion();
                if (this.readPersona) this.readPersona.cargarDatos();
            },
            () => this.desactivarEdicion()
        );

        this.readPersona.render();
        this.createPersona.render();
    }

    activarEdicion(id, persona) {
        const createContainer = document.getElementById('create-persona-container');
        const updateContainer = document.getElementById('update-persona-container');
        if (createContainer) createContainer.style.display = 'none';
        if (updateContainer) updateContainer.style.display = 'block';
        if (this.updatePersona) this.updatePersona.render(persona);
    }

    desactivarEdicion() {
        const createContainer = document.getElementById('create-persona-container');
        const updateContainer = document.getElementById('update-persona-container');
        if (updateContainer) updateContainer.style.display = 'none';
        if (createContainer) createContainer.style.display = 'block';
        if (this.updatePersona) this.updatePersona.limpiar();
    }

    unmount() {
        this._abortController.abort();
        this.readPersona?.unmount();
        this.createPersona?.unmount();
        this.updatePersona?.unmount();
        const container = document.getElementById(this.containerId);
        if (container) container.innerHTML = '';
    }
}