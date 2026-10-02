import { CreateUsuario } from '/src/modules/usuariosPersonas/components/UsuariosComponents/CreateUsuario.js';
import { ReadUsuarios } from '/src/modules/usuariosPersonas/components/UsuariosComponents/ReadUsuarios.js';
import { UpdateUsuario } from '/src/modules/usuariosPersonas/components/UsuariosComponents/UpdateUsuario.js';
import { DeleteUsuario } from '/src/modules/usuariosPersonas/components/UsuariosComponents/DeleteUsuario.js';

export class CrudUsuarios {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this._abortController = new AbortController();

        this.readUsuarios = null;
        this.createUsuario = null;
        this.updateUsuario = null;
        this.deleteUsuario = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
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
            this.permisos,
            (id, usuario) => this.activarEdicion(id, usuario),
            (id) => this.deleteUsuario.darDeBaja(id)
        );

        this.createUsuario = new CreateUsuario(
            'create-usuario-container',
            this.permisos,
            () => {
                if (this.readUsuarios) this.readUsuarios.cargarDatos();
            }
        );

        this.updateUsuario = new UpdateUsuario(
            'update-usuario-container',
            this.permisos,
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
        document.getElementById('create-usuario-container').style.display = 'none';
        document.getElementById('update-usuario-container').style.display = 'block';
        this.updateUsuario.render(usuario);
    }

    desactivarEdicion() {
        document.getElementById('update-usuario-container').style.display = 'none';
        document.getElementById('create-usuario-container').style.display = 'block';
        this.updateUsuario.limpiar();
    }

    unmount() {
        this._abortController.abort();
        this.readUsuarios?.unmount();
        this.createUsuario?.unmount();
        this.updateUsuario?.unmount();
    }
}