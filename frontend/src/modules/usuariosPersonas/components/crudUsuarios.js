import { adminService } from '../services/admin.js';

export class CrudUsuarios {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this.puedeCrear = this.permisos.includes('usuarios:crear');
        this.puedeSuspender = this.permisos.includes('usuarios:borrar'); 
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";
        const regexUsername = "^\\w+$";
        const regexPassword = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}";

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                ${this.puedeCrear ? `
                <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <h4 style="margin-top:0; color:#424242;">Aprovisionar Credenciales</h4>
                    <form id="form-usuario">
                        <input type="text" name="curp" placeholder="CURP de la Persona" required 
                            pattern="${regexCurp}" minlength="18" maxlength="18"
                            title="Ingrese la CURP de la persona ya registrada"
                            style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase;">
                            
                        <input type="text" name="username" placeholder="Username" required 
                            pattern="${regexUsername}" minlength="3" maxlength="50"
                            title="Solo letras, números y guiones bajos"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <input type="email" name="email" placeholder="Correo Electrónico" required 
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <input type="password" name="password" placeholder="Contraseña" required 
                            pattern="${regexPassword}" minlength="8"
                            title="Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <select name="role_id" required style="width:100%; margin-bottom:10px; padding:8px;">
                            <option value="1">Administrador General del Sistema</option>
                            <option value="2">Levantador Físico / Operador</option>
                            <option value="3">Registrador de Bienes Patrimoniales</option>
                            <option value="4">Revisor Central de Activos</option>
                            <option value="5">Resguardante / Jefe de Departamento</option>
                        </select>
                        <button type="submit" style="width:100%; padding:8px; background:#00796b; color:white; border:none; cursor:pointer;">Crear Cuenta Digital</button>
                    </form>
                </div>` : '<div style="color:#757575; font-style:italic;">No tiene permisos para crear usuarios.</div>'}
                
                <div>
                    <h4 style="margin-top:0; color:#424242;">Directorio de Operadores</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#f5f5f5; text-align:left;">
                                <th style="padding:8px;">Username</th>
                                <th style="padding:8px;">Email</th>
                                <th style="padding:8px;">Roles</th>
                                <th style="padding:8px;">Estado</th>
                                <th style="padding:8px;">Acción</th>
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
        if (this.puedeCrear) {
            const form = document.getElementById('form-usuario');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    try {
                        await adminService.crearUsuario({
                            curp: formData.get('curp').toUpperCase().trim(),
                            username: formData.get('username').toLowerCase().trim(),
                            email: formData.get('email').trim(),
                            password: formData.get('password'),
                            role_ids: [parseInt(formData.get('role_id'), 10)]
                        });
                        alert('Credenciales aprovisionadas con éxito');
                        form.reset();
                        this.cargarDatos();
                    } catch (error) {
                        alert('Error al crear usuario: ' + (error.response?.data?.detail || error.message));
                    }
                });
            }
        }

        const tbody = document.getElementById('tbody-usuarios');
        if (tbody && this.puedeSuspender) {
            tbody.addEventListener('click', async (e) => {
                if (e.target.classList.contains('btn-suspender')) {
                    const id = e.target.getAttribute('data-id');
                    if (confirm('¿Revocar acceso a este operador?')) {
                        try {
                            await adminService.darBajaUsuario(id);
                            this.cargarDatos();
                        } catch (err) {
                            alert('Error al suspender: ' + err.message);
                        }
                    }
                }
            });
        }
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-usuarios');
        if (!tbody) return;
        try {
            const resp = await adminService.listarUsuarios(50, 0, false);
            const usuarios = Array.isArray(resp) ? resp : (resp?.data || []);
            
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
                    <td style="padding:8px;">
                        ${u.is_active && this.puedeSuspender 
                            ? `<button class="btn-suspender" data-id="${u.id_usuario}" style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Suspender</button>`
                            : ''}
                    </td>
                </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:red;">Error al cargar datos</td></tr>';
        }
    }
}