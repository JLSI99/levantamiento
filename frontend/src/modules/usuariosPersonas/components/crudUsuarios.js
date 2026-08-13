import { adminService } from '../services/admin.js';

export class CrudUsuarios {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this.puedeCrear = this.permisos.includes('usuarios:crear');
        this.puedeEditar = this.permisos.includes('usuarios:actualizar') || this.permisos.includes('usuarios:editar');
        this.puedeSuspender = this.permisos.includes('usuarios:borrar'); 

        // Estado de Edición y Caché Local
        this._editingId = null;
        this._usuariosCache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";
        const regexUsername = "^\\w+$";
        const regexPassword = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}";

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                ${(this.puedeCrear || this.puedeEditar) ? `
                <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <h4 id="form-usuario-titulo" style="margin-top:0; color:#424242;">Aprovisionar Credenciales</h4>
                    <form id="form-usuario">
                        <input type="text" name="curp" id="input-usr-curp" placeholder="CURP de la Persona" required 
                            pattern="${regexCurp}" minlength="18" maxlength="18"
                            title="Ingrese la CURP de la persona ya registrada"
                            style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase;">
                            
                        <input type="text" name="username" id="input-usr-username" placeholder="Username" required 
                            pattern="${regexUsername}" minlength="3" maxlength="50"
                            title="Solo letras, números y guiones bajos"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <input type="email" name="email" id="input-usr-email" placeholder="Correo Electrónico" required 
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <input type="password" name="password" id="input-usr-password" placeholder="Contraseña" required 
                            pattern="${regexPassword}" minlength="8"
                            title="Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <select name="role_id" id="select-usr-role" required style="width:100%; margin-bottom:10px; padding:8px;">
                            <option value="1">Administrador General del Sistema</option>
                            <option value="2">Levantador Físico / Operador</option>
                            <option value="3">Registrador de Bienes Patrimoniales</option>
                            <option value="4">Revisor Central de Activos</option>
                            <option value="5">Resguardante / Jefe de Departamento</option>
                        </select>
                        
                        <button type="submit" id="btn-submit-usuario" style="width:100%; padding:8px; background:#00796b; color:white; border:none; cursor:pointer;">Crear Cuenta Digital</button>
                        <button type="button" id="btn-cancelar-usuario" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">Cancelar Edición</button>
                    </form>
                </div>` : '<div style="color:#757575; font-style:italic;">No tiene permisos de gestión de usuarios.</div>'}
                
                <div>
                    <h4 style="margin-top:0; color:#424242;">Directorio de Operadores</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#f5f5f5; text-align:left;">
                                <th style="padding:8px;">Username</th>
                                <th style="padding:8px;">Email</th>
                                <th style="padding:8px;">Roles</th>
                                <th style="padding:8px;">Estado</th>
                                <th style="padding:8px; text-align:center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-usuarios">
                            <tr><td colspan="5">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const form = document.getElementById('form-usuario');
        const tbody = document.getElementById('tbody-usuarios');
        const btnCancelar = document.getElementById('btn-cancelar-usuario');

        // 1. Manejo del Submit
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const roleId = parseInt(formData.get('role_id'), 10);

                try {
                    if (this._editingId) {
                        // Construcción de Payload Parcial para UserUpdateBFF
                        const usuarioCampos = {
                            username: formData.get('username').toLowerCase().trim(),
                            email: formData.get('email').trim()
                        };

                        // La contraseña solo se incluye si fue proporcionada
                        const rawPassword = formData.get('password');
                        if (rawPassword && rawPassword.trim() !== '') {
                            usuarioCampos.password = rawPassword;
                        }

                        // Actualizar datos del usuario y rol asignado
                        await adminService.actualizarUsuario(this._editingId, usuarioCampos);
                        await adminService.actualizarRolesUsuario(this._editingId, [roleId]);

                        alert('Cuenta digital actualizada correctamente');
                    } else {
                        await adminService.crearUsuario({
                            curp: formData.get('curp').toUpperCase().trim(),
                            username: formData.get('username').toLowerCase().trim(),
                            email: formData.get('email').trim(),
                            password: formData.get('password'),
                            role_ids: [roleId]
                        });
                        alert('Credenciales aprovisionadas con éxito');
                    }

                    this.desactivarModoEdicion();
                    this.cargarDatos();
                } catch (error) {
                    alert('Error en la operación: ' + (error.response?.data?.detail || error.message));
                }
            }, { signal });
        }

        // 2. Delegación de Eventos en la Tabla (Editar y Suspender)
        if (tbody) {
            tbody.addEventListener('click', async (e) => {
                const btnEditar = e.target.closest('.btn-editar-usuario');
                const btnSuspender = e.target.closest('.btn-suspender');

                if (btnEditar) {
                    const idUsuario = btnEditar.getAttribute('data-id');
                    this.activarModoEdicion(idUsuario);
                } else if (btnSuspender && this.puedeSuspender) {
                    const idUsuario = btnSuspender.getAttribute('data-id');
                    if (confirm('¿Revocar acceso a este operador?')) {
                        try {
                            await adminService.darBajaUsuario(idUsuario);
                            this.cargarDatos();
                        } catch (err) {
                            alert('Error al suspender: ' + err.message);
                        }
                    }
                }
            }, { signal });
        }

        // 3. Botón Cancelar Edición
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                this.desactivarModoEdicion();
            }, { signal });
        }
    }

    activarModoEdicion(idUsuario) {
        const usuario = this._usuariosCache.get(idUsuario);
        if (!usuario) return;

        this._editingId = idUsuario;

        // Hidratación de Formulario
        const curpInput = document.getElementById('input-usr-curp');
        curpInput.value = usuario.curp;
        curpInput.readOnly = true; // Invariante: La CURP vinculada no se modifica aquí
        curpInput.style.backgroundColor = '#e0e0e0';

        document.getElementById('input-usr-username').value = usuario.username;
        document.getElementById('input-usr-email').value = usuario.email;

        // En edición, la contraseña es opcional
        const passInput = document.getElementById('input-usr-password');
        passInput.value = '';
        passInput.required = false;
        passInput.placeholder = 'Nueva Contraseña (dejar en blanco para mantener)';

        // Seleccionar primer rol asociado
        if (usuario.roles && usuario.roles.length > 0) {
            document.getElementById('select-usr-role').value = usuario.roles[0].id_rol;
        }

        // Cambios visuales
        document.getElementById('form-usuario-titulo').textContent = 'Editar Cuenta Digital';
        const btnSubmit = document.getElementById('btn-submit-usuario');
        btnSubmit.textContent = 'Actualizar Cuenta';
        btnSubmit.style.background = '#e65100';
        document.getElementById('btn-cancelar-usuario').style.display = 'block';
    }

    desactivarModoEdicion() {
        this._editingId = null;
        const form = document.getElementById('form-usuario');
        if (form) form.reset();

        const curpInput = document.getElementById('input-usr-curp');
        if (curpInput) {
            curpInput.readOnly = false;
            curpInput.style.backgroundColor = '#ffffff';
        }

        const passInput = document.getElementById('input-usr-password');
        if (passInput) {
            passInput.required = true;
            passInput.placeholder = 'Contraseña';
        }

        document.getElementById('form-usuario-titulo').textContent = 'Aprovisionar Credenciales';
        const btnSubmit = document.getElementById('btn-submit-usuario');
        if (btnSubmit) {
            btnSubmit.textContent = 'Crear Cuenta Digital';
            btnSubmit.style.background = '#00796b';
        }
        const btnCancelar = document.getElementById('btn-cancelar-usuario');
        if (btnCancelar) btnCancelar.style.display = 'none';
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-usuarios');
        if (!tbody) return;
        try {
            const resp = await adminService.listarUsuarios(50, 0, false);
            const usuarios = Array.isArray(resp) ? resp : (resp?.data || []);

            // Actualizar caché
            this._usuariosCache.clear();
            usuarios.forEach(u => this._usuariosCache.set(u.id_usuario, u));

            if (usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No existen usuarios registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = usuarios.map(u => {
                const nombresRoles = u.roles && Array.isArray(u.roles) 
                    ? u.roles.map(r => r.nombre_rol).join(', ') 
                    : 'N/A';

                return `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-family:monospace; font-weight:600;">${u.username}</td>
                    <td style="padding:8px;">${u.email}</td>
                    <td style="padding:8px; font-size:11px; color:#455a64;">${nombresRoles}</td>
                    <td style="padding:8px;">${u.is_active ? '<span style="color:green;">Activo</span>' : '<span style="color:red;">Inactivo</span>'}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:4px; justify-content:center;">
                            ${this.puedeEditar ? `
                                <button class="btn-editar-usuario" data-id="${u.id_usuario}" 
                                    style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Editar
                                </button>
                            ` : ''}
                            ${u.is_active && this.puedeSuspender ? `
                                <button class="btn-suspender" data-id="${u.id_usuario}" 
                                    style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Suspender
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
        const container = document.getElementById(this.containerId);
        if (container) container.innerHTML = '';
    }
}