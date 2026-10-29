import authStore from '/src/core/store/authStore.js';
import { checkAccess } from '/src/core/security/CanRender.js';
import { CreateUsuario } from '/src/modules/usuariosPersonas/components/UsuariosComponents/CreateUsuario.js';
import { ReadUsuarios } from '/src/modules/usuariosPersonas/components/UsuariosComponents/ReadUsuarios.js';
import { UpdateUsuario } from '/src/modules/usuariosPersonas/components/UsuariosComponents/UpdateUsuario.js';
import { DeleteUsuario } from '/src/modules/usuariosPersonas/components/UsuariosComponents/DeleteUsuario.js';

export class CrudUsuarios {
    constructor(containerId) {
        this.containerId = containerId;
        this._abortController = new AbortController();

        this.readUsuarios = null;
        this.createUsuario = null;
        this.updateUsuario = null;
        this.deleteUsuario = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const state = authStore.getSnapshot();

        // Evaluación estandarizada de permisos por capacidades (CapBAC)
        const permisos = {
            crear: checkAccess('usuarios:crear', state),
            editar: checkAccess('usuarios:editar', state),
            borrar: checkAccess('usuarios:borrar', state),
            leer: checkAccess('usuarios:leer', state)
        };

        container.innerHTML = `
            <div class="grid-dos-columnas">
                <div>
                    <div id="create-usuario-container"></div>
                    <div id="update-usuario-container" style="display:none;"></div>
                </div>
                <div id="read-usuario-container"></div>
            </div>
        `;

        this.deleteUsuario = new DeleteUsuario(() => {
            if (this.readUsuarios) this.readUsuarios.cargarDatos();
        });

        this.readUsuarios = new ReadUsuarios(
            'read-usuario-container',
            permisos,
            (id, usuario) => this.activarEdicion(id, usuario),
            (id) => this.deleteUsuario.darDeBaja(id)
        );

        this.createUsuario = new CreateUsuario(
            'create-usuario-container',
            permisos,
            () => {
                if (this.readUsuarios) this.readUsuarios.cargarDatos();
            }
        );

        this.updateUsuario = new UpdateUsuario(
            'update-usuario-container',
            permisos,
            () => {
                this.desactivarEdicion();
                if (this.readUsuarios) this.readUsuarios.cargarDatos();
            },
            () => this.desactivarEdicion()
        );

        this.readUsuarios.render();
        this.createUsuario.render();
    }

    activarEdicion(id, usuario) {
        const createContainer = document.getElementById('create-usuario-container');
        const updateContainer = document.getElementById('update-usuario-container');
        if (createContainer) createContainer.style.display = 'none';
        if (updateContainer) updateContainer.style.display = 'block';
        if (this.updateUsuario) this.updateUsuario.render(usuario);
    }

    desactivarEdicion() {
        const createContainer = document.getElementById('create-usuario-container');
        const updateContainer = document.getElementById('update-usuario-container');
        if (updateContainer) updateContainer.style.display = 'none';
        if (createContainer) createContainer.style.display = 'block';
        if (this.updateUsuario) this.updateUsuario.limpiar();
    }

    unmount() {
        this._abortController.abort();
        this.readUsuarios?.unmount();
        this.createUsuario?.unmount();
        this.updateUsuario?.unmount();
    }
}