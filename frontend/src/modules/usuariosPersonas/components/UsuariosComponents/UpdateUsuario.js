import { adminService } from '/src/services/admin.js';

export class UpdateUsuario {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && this.permisos.includes('usuarios:editar');

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
            container.innerHTML = `<div class="forbidden-container" style="padding:15px; font-size:12px;">No cuenta con permisos para editar usuarios.</div>`;
            return;
        }

        const regexUsername = "^\\w+$";
        const regexPassword = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}";
        const currentRoleId = (usuario?.roles && usuario.roles.length > 0) ? usuario.roles[0].id_rol : '1';

        container.innerHTML = `
            <div class="module-card" style="padding: 15px; width:100%; box-sizing:border-box; border: 1px solid var(--warning, #ffb74d); background: var(--bg-card-warning, #fff8e1);">
                <h4 style="margin-top:0; color:var(--warning-dark, #e65100); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Editar Cuenta Digital</h4>
                <form id="form-update-usuario" style="display:flex; flex-direction:column; gap:12px; width:100%;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">CURP (No modificable)</label>
                        <input type="text" name="curp" value="${usuario?.curp || ''}" readonly 
                            style="width:100%; box-sizing:border-box; margin-bottom:0; padding:8px; text-transform: uppercase; background:var(--bg-disabled, #e0e0e0); border:1px solid var(--border-color); border-radius:4px; color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Username *</label>
                        <input type="text" name="username" value="${usuario?.username || ''}" required 
                            pattern="${regexUsername}" minlength="3" maxlength="50"
                            title="Solo letras, números y guiones bajos"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Correo Electrónico *</label>
                        <input type="email" name="email" value="${usuario?.email || ''}" required 
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nueva Contraseña (Opcional)</label>
                        <input type="password" name="password" placeholder="Dejar en blanco para mantener actual" 
                            pattern="${regexPassword}" minlength="8"
                            title="Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Rol del Usuario *</label>
                        <select name="role_id" required style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                            <option value="1" ${currentRoleId == 1 ? 'selected' : ''}>Administrador General del Sistema</option>
                            <option value="2" ${currentRoleId == 2 ? 'selected' : ''}>Levantador Físico / Operador</option>
                            <option value="3" ${currentRoleId == 3 ? 'selected' : ''}>Registrador de Bienes Patrimoniales</option>
                            <option value="4" ${currentRoleId == 4 ? 'selected' : ''}>Revisor Central de Activos</option>
                            <option value="5" ${currentRoleId == 5 ? 'selected' : ''}>Resguardante / Jefe de Departamento</option>
                        </select>
                    </div>
                    
                    <button type="submit" style="width:100%; padding:10px; background:var(--warning-dark, #e65100); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Actualizar Cuenta
                    </button>
                    <button type="button" id="btn-cancelar-update-usuario" style="width:100%; padding:10px; background:var(--text-muted, #757575); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
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