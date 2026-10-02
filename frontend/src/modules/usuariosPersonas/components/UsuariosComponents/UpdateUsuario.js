import { adminService } from '/src/services/admin.js';

export class UpdateUsuario {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = Array.isArray(permisos) ? permisos : [];
        this.puedeEditar = this.permisos.includes('usuarios:editar') || this.permisos.includes('usuarios:editar');
        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this._abortController = new AbortController();
        this.usuario = null;
    }

    render(usuario) {
        this.usuario = usuario;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.puedeEditar) {
            container.innerHTML = `<div style="color:#757575; font-style:italic; padding:15px; border:1px solid #e0e0e0; border-radius:4px;">No tiene permisos para editar usuarios.</div>`;
            return;
        }

        const regexUsername = "^\\w+$";
        const regexPassword = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}";
        const currentRoleId = (usuario?.roles && usuario.roles.length > 0) ? usuario.roles[0].id_rol : '1';

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #ffb74d; border-radius: 4px; background: #fff8e1;">
                <h4 style="margin-top:0; color:#e65100;">Editar Cuenta Digital</h4>
                <form id="form-update-usuario">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">CURP (No modificable)</label>
                    <input type="text" name="curp" value="${usuario?.curp || ''}" readonly 
                        style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase; background:#e0e0e0; border:1px solid #ccc; border-radius:4px;">
                        
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Username *</label>
                    <input type="text" name="username" value="${usuario?.username || ''}" required 
                        pattern="${regexUsername}" minlength="3" maxlength="50"
                        title="Solo letras, números y guiones bajos"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Correo Electrónico *</label>
                    <input type="email" name="email" value="${usuario?.email || ''}" required 
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Nueva Contraseña (Opcional)</label>
                    <input type="password" name="password" placeholder="Dejar en blanco para mantener actual" 
                        pattern="${regexPassword}" minlength="8"
                        title="Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Rol del Usuario *</label>
                    <select name="role_id" required style="width:100%; margin-bottom:15px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        <option value="1" ${currentRoleId == 1 ? 'selected' : ''}>Administrador General del Sistema</option>
                        <option value="2" ${currentRoleId == 2 ? 'selected' : ''}>Levantador Físico / Operador</option>
                        <option value="3" ${currentRoleId == 3 ? 'selected' : ''}>Registrador de Bienes Patrimoniales</option>
                        <option value="4" ${currentRoleId == 4 ? 'selected' : ''}>Revisor Central de Activos</option>
                        <option value="5" ${currentRoleId == 5 ? 'selected' : ''}>Resguardante / Jefe de Departamento</option>
                    </select>
                    
                    <button type="submit" style="width:100%; padding:8px; background:#e65100; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Actualizar Cuenta
                    </button>
                    <button type="button" id="btn-cancelar-update-usuario" style="width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer;">
                        Cancelar Edición
                    </button>
                </form>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('form-update-usuario');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.usuario) return;

                const formData = new FormData(form);
                const roleId = parseInt(formData.get('role_id'), 10);

                const usuarioCampos = {
                    username: formData.get('username').toLowerCase().trim(),
                    email: formData.get('email').trim()
                };

                const rawPassword = formData.get('password');
                if (rawPassword && rawPassword.trim() !== '') {
                    usuarioCampos.password = rawPassword;
                }

                try {
                    await adminService.actualizarUsuario(this.usuario.id_usuario, usuarioCampos);
                    await adminService.actualizarRolesUsuario(this.usuario.id_usuario, [roleId]);

                    alert('Cuenta digital actualizada correctamente');
                    if (this.onSuccess) this.onSuccess();
                } catch (error) {
                    alert('Error en la actualización: ' + (error.response?.data?.detail || error.message));
                }
            }, { signal: this._abortController.signal });
        }

        document.getElementById('btn-cancelar-update-usuario')?.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
        }, { signal: this._abortController.signal });
    }

    limpiar() {
        this.usuario = null;
        document.getElementById('form-update-usuario')?.reset();
    }

    unmount() {
        this._abortController.abort();
    }
}