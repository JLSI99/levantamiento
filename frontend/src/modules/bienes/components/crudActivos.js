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
        this.tipos = [];
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        if (!formContainer) return;

        formContainer.innerHTML = `
            <div id="create-activo-container"></div>
            <div id="update-activo-container" style="display:none;"></div>
        `;

        this.deleteActivo = new DeleteActivo(() => this.cargarDatos());

        this.readActivos = new ReadActivos(
            this.tableContainerId,
            this.permisos,
            (id, item) => this.activarEdicion(id, item),
            (id) => this.deleteActivo.darDeBaja(id)   
        );

        this.createActivo = new CreateActivo(
            'create-activo-container',
            this.permisos,
            () => this.cargarDatos()
        );

        this.updateActivo = new UpdateActivo(
            'update-activo-container',
            this.permisos,
            () => {
                this.desactivarEdicion();
                this.cargarDatos();
            },
            () => this.desactivarEdicion()
        );

        this.readActivos.render();
        this.createActivo.render();
    }

    actualizarSelectTipos(tipos) {
        this.tipos = tipos;
        if (this.createActivo) this.createActivo.actualizarSelectTipos(tipos);
        if (this.updateActivo) this.updateActivo.actualizarSelectTipos(tipos);
    }

    cargarDatos() {
        if (this.readActivos) this.readActivos.cargarDatos();
    }

    activarEdicion(id, item) {
        document.getElementById('create-activo-container').style.display = 'none';
        document.getElementById('update-activo-container').style.display = 'block';
        this.updateActivo.render(item); 
    }

    desactivarEdicion() {
        document.getElementById('update-activo-container').style.display = 'none';
        document.getElementById('create-activo-container').style.display = 'block';
        this.updateActivo.limpiar();
    }

    unmount() {
        this._abortController.abort();
        this.readActivos?.unmount();
        this.createActivo?.unmount();
        this.updateActivo?.unmount();
    }
}