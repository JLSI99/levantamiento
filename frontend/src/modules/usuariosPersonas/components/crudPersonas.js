import { CreatePersona } from '/src/modules/usuariosPersonas/components/personasComponents/CreatePersona.js';
import { ReadPersona } from '/src/modules/usuariosPersonas/components/personasComponents/ReadPersona.js';
import { UpdatePersona } from '/src/modules/usuariosPersonas/components/personasComponents/UpdatePersona.js';
import { DeletePersona } from '/src/modules/usuariosPersonas/components/personasComponents/DeletePersona.js';

export class CrudPersonas {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this._abortController = new AbortController();

        this.readPersona = null;
        this.createPersona = null;
        this.updatePersona = null;
        this.deletePersona = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
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
            this.permisos,
            (id, persona) => this.activarEdicion(id, persona),
            (id, persona) => this.deletePersona.eliminar(id, persona)
        );

        this.createPersona = new CreatePersona(
            'create-persona-container',
            this.permisos,
            () => {
                if (this.readPersona) this.readPersona.cargarDatos();
            }
        );

        this.updatePersona = new UpdatePersona(
            'update-persona-container',
            this.permisos,
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
        document.getElementById('create-persona-container').style.display = 'none';
        document.getElementById('update-persona-container').style.display = 'block';
        this.updatePersona.render(persona);
    }

    desactivarEdicion() {
        document.getElementById('update-persona-container').style.display = 'none';
        document.getElementById('create-persona-container').style.display = 'block';
        this.updatePersona.limpiar();
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