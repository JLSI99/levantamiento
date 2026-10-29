import authStore from '/src/core/store/authStore.js';
import { checkAccess } from '/src/core/security/CanRender.js';
import { CreateTipoBien } from '/src/modules/bienes/components/tiposBienComponents/CreateTipoBien.js';
import { ReadTiposBien } from '/src/modules/bienes/components/tiposBienComponents/ReadTiposBien.js';
import { UpdateTipoBien } from '/src/modules/bienes/components/tiposBienComponents/UpdateTipoBien.js';
import { DeleteTipoBien } from '/src/modules/bienes/components/tiposBienComponents/DeleteTipoBien.js';

export class CrudTiposBien {
    constructor(formContainerId, tableContainerId) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this._abortController = new AbortController();

        this.onTiposLoaded = null;
        this.onTiposChanged = null;
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
                <div id="create-tipo-container"></div>
                <div id="update-tipo-container" style="display:none;"></div>
            </div>
        `;

        tableContainer.innerHTML = `
            <div class="module-card" style="margin-bottom: 0;">
                <div id="read-tipo-container"></div>
            </div>
        `;

        this.deleteTipoBien = new DeleteTipoBien(() => {
            if (this.onTiposChanged) this.onTiposChanged();
        });

        this.readTiposBien = new ReadTiposBien(
            'read-tipo-container',
            permisos,
            (id, item) => this.activarEdicion(id, item),
            (id) => this.deleteTipoBien.darDeBaja(id),
            (data) => {
                if (this.onTiposLoaded) this.onTiposLoaded(data);
            }
        );

        this.createTipoBien = new CreateTipoBien(
            'create-tipo-container',
            permisos,
            () => {
                if (this.onTiposChanged) this.onTiposChanged();
            }
        );

        this.updateTipoBien = new UpdateTipoBien(
            'update-tipo-container',
            permisos,
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