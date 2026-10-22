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
                    <!-- Buscador predictivo por nombre -->
                    <div style="position:relative; width:100%; margin-bottom:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:#555;">Persona Asociada (Búsqueda por Nombre)</label>
                        <input type="text" id="input-busqueda-persona-usuario" placeholder="Escriba el nombre o apellido de la persona..." autocomplete="off"
                            style="width:100%; padding:8px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; font-size:12px;">
                        
                        <div id="dropdown-resultados-usuario" style="display:none; position:absolute; top:100%; left:0; right:0; background:white; border:1px solid #ccc; border-radius:0 0 4px 4px; max-height:150px; overflow-y:auto; z-index:1000; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                        </div>
                    </div>

                    <input type="text" name="curp" id="input-usuario-curp" placeholder="CURP de la Persona" required 
                        pattern="${regexCurp}" minlength="18" maxlength="18" readonly
                        title="Se autocompleta al seleccionar una persona de la lista"
                        style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase; border:1px solid #ccc; border-radius:4px; background:#f5f5f5; font-family:monospace;">
                        
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
        const inputBusqueda = document.getElementById('input-busqueda-persona-usuario');
        const inputCurp = document.getElementById('input-usuario-curp');
        const dropdown = document.getElementById('dropdown-resultados-usuario');

        if (inputBusqueda && dropdown && inputCurp) {
            let debounceTimer = null;
            inputBusqueda.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                clearTimeout(debounceTimer);

                if (query.length < 2) {
                    dropdown.style.display = 'none';
                    dropdown.innerHTML = '';
                    return;
                }

                debounceTimer = setTimeout(async () => {
                    try {
                        const resp = await adminService.listarPersonas(10, 0, false, null, query);
                        const personas = Array.isArray(resp) ? resp : (resp?.data || []);

                        if (personas.length === 0) {
                            dropdown.innerHTML = '<div style="padding:8px; color:#757575; font-size:11px;">No se encontraron personas registradas.</div>';
                            dropdown.style.display = 'block';
                            return;
                        }

                        dropdown.innerHTML = personas.map(p => `
                            <div class="item-persona-sugerida" data-curp="${p.curp}" data-nombre="${p.nombres} ${p.apellidos}"
                                style="padding:8px; font-size:11px; border-bottom:1px solid #f0f0f0; cursor:pointer;"
                                onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='#fff'">
                                <div style="font-weight:600; color:#212121;">${p.nombres} ${p.apellidos}</div>
                                <div style="font-family:monospace; color:#0288d1;">CURP: ${p.curp}</div>
                            </div>
                        `).join('');
                        dropdown.style.display = 'block';

                        dropdown.querySelectorAll('.item-persona-sugerida').forEach(item => {
                            item.addEventListener('click', () => {
                                const curp = item.getAttribute('data-curp');
                                const nombre = item.getAttribute('data-nombre');
                                inputCurp.value = curp;
                                inputBusqueda.value = `${nombre} (${curp})`;
                                dropdown.style.display = 'none';
                            });
                        });
                    } catch (err) {
                        console.error("Error en búsqueda autocompletada de usuario:", err);
                    }
                }, 300);
            }, { signal: this._abortController.signal });

            document.addEventListener('click', (ev) => {
                if (!inputBusqueda.contains(ev.target) && !dropdown.contains(ev.target)) {
                    dropdown.style.display = 'none';
                }
            }, { signal: this._abortController.signal });
        }

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