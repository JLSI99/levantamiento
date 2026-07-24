import { adminService } from '../services/admin.js';

export class CrudUsuarios {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this.puedeCrear = this.permisos.includes('usuarios:crear');
        this.puedeSuspender = this.permisos.includes('usuarios:borrar'); // o el permiso que uses
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                <!-- Formulario de Alta de Usuario -->
                ${this.puedeCrear ? `
                <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <h4 style="margin-top:0; color:#424242;">Aprovisionar Credenciales</h4>
                    <form id="form-usuario">
                        <input type="text" name="curp" placeholder="CURP de la Persona" required style="width:100%; margin-bottom:10px; padding:8px;">
                        <input type="text" name="username" placeholder="Username" required style="width:100%; margin-bottom:10px; padding:8px;">
                        <input type="email" name="email" placeholder="Correo Electrónico" required style="width:100%; margin-bottom:10px; padding:8px;">
                        <input type="password" name="password" placeholder="Contraseña" required style="width:100%; margin-bottom:10px; padding:8px;">
                        <select name="role_id" required style="width:100%; margin-bottom:10px; padding:8px;">
                            <option value="1">Admin General</option>
                            <option value="2">Operador</option>
                        </select>
                        <button type="submit" style="width:100%; padding:8px; background:#00796b; color:white; border:none; cursor:pointer;">Crear Cuenta Digital</button>
                    </form>
                </div>` : '<div style="color:#757575; font-style:italic;">No tiene permisos para crear usuarios.</div>'}
                
                <!-- Tabla de Usuarios Activos -->
                <div>
                    <h4 style="margin-top:0; color:#424242;">Directorio de Operadores</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#f5f5f5; text-align:left;">
                                <th style="padding:8px;">Username</th>
                                <th style="padding:8px;">Email</th>
                                <th style="padding:8px;">Estado</th>
                                <th style="padding:8px;">Acción</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-usuarios">
                            <tr><td colspan="4">Cargando...</td></tr>
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
                            curp: formData.get('curp'),
                            username: formData.get('username'),
                            email: formData.get('email'),
                            password: formData.get('password'),
                            role_ids: [parseInt(formData.get('role_id'), 10)]
                        });
                        alert('Credenciales aprovisionadas con éxito');
                        form.reset();
                        this.cargarDatos(); // Recargar tabla
                    } catch (error) {
                        alert('Error al crear usuario: ' + (error.response?.data?.detail || error.message));
                    }
                });
            }
        }

        // Delegación de eventos para el botón de suspender
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
            
            tbody.innerHTML = usuarios.map(u => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-family:monospace;">${u.username}</td>
                    <td style="padding:8px;">${u.email}</td>
                    <td style="padding:8px;">${u.is_active ? 'Activo' : 'Inactivo'}</td>
                    <td style="padding:8px;">
                        ${u.is_active && this.puedeSuspender 
                            ? `<button class="btn-suspender" data-id="${u.id_usuario}" style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Suspender</button>`
                            : ''}
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        // Limpieza de listeners si fuera necesario
    }
}