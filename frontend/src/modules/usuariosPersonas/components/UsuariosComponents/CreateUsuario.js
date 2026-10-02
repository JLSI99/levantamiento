import { adminService } from '/src/services/admin.js';

export class CreateUsuario {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = Array.isArray(permisos) ? permisos : [];
        this.puedeCrear = this.permisos.includes('usuarios:crear');
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.puedeCrear) {
            container.innerHTML = `<div style="color:#757575; font-style:italic; padding:15px; border:1px solid #e0e0e0; border-radius:4px;">No tiene permisos para crear usuarios.</div>`;
            return;
        }

        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";
        const regexUsername = "^\\w+$";
        const regexPassword = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}";

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background:#ffffff;">
                <h4 style="margin-top:0; color:#424242;">Aprovisionar Credenciales</h4>
                <form id="form-create-usuario">
                    <input type="text" name="curp" placeholder="CURP de la Persona" required 
                        pattern="${regexCurp}" minlength="18" maxlength="18"
                        title="Ingrese la CURP de la persona ya registrada"
                        style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase; border:1px solid #ccc; border-radius:4px;">
                        
                    <input type="text" name="username" placeholder="Username" required 
                        pattern="${regexUsername}" minlength="3" maxlength="50"
                        title="Solo letras, números y guiones bajos"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <input type="email" name="email" placeholder="Correo Electrónico" required 
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <input type="password" name="password" placeholder="Contraseña" required 
                        pattern="${regexPassword}" minlength="8"
                        title="Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <select name="role_id" required style="width:100%; margin-bottom:15px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        <option value="1">Administrador General del Sistema</option>
                        <option value="2">Levantador Físico / Operador</option>
                        <option value="3">Registrador de Bienes Patrimoniales</option>
                        <option value="4">Revisor Central de Activos</option>
                        <option value="5">Resguardante / Jefe de Departamento</option>
                    </select>
                    
                    <button type="submit" style="width:100%; padding:8px; background:#00796b; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Crear Cuenta Digital
                    </button>
                </form>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('form-create-usuario');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const roleId = parseInt(formData.get('role_id'), 10);

                const payload = {
                    curp: formData.get('curp').toUpperCase().trim(),
                    username: formData.get('username').toLowerCase().trim(),
                    email: formData.get('email').trim(),
                    password: formData.get('password'),
                    role_ids: [roleId]
                };

                try {
                    await adminService.crearUsuario(payload);
                    alert('Credenciales aprovisionadas con éxito');
                    form.reset();
                    if (this.onSuccess) this.onSuccess();
                } catch (error) {
                    alert('Error al crear usuario: ' + (error.response?.data?.detail || error.message));
                }
            }, { signal: this._abortController.signal });
        }
    }

    unmount() {
        this._abortController.abort();
    }
}