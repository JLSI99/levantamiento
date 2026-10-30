import { adminService } from '/src/services/admin.js';

export class CreateUsuario {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeCrear = isObj 
            ? Boolean(this.permisos.crear) 
            : Array.isArray(this.permisos) && this.permisos.includes('usuarios:crear');

        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.puedeCrear) {
            container.innerHTML = `<div class="forbidden-container" style="padding:15px; font-size:12px;">No cuenta con permisos para crear usuarios.</div>`;
            return;
        }

        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";
        const regexUsername = "^\\w+$";
        const regexPassword = "(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{8,}";

        container.innerHTML = `
            <div class="module-card" style="padding: 15px; width:100%; box-sizing:border-box; background:var(--bg-card, #ffffff);">
                <h4 style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Aprovisionar Credenciales</h4>
                <form id="form-create-usuario" style="display:flex; flex-direction:column; gap:12px; width:100%;">
                    <!-- Buscador predictivo por nombre -->
                    <div style="position:relative; width:100%;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Persona Asociada (Búsqueda por Nombre)</label>
                        <input type="text" id="input-busqueda-persona-usuario" placeholder="Escriba el nombre o apellido de la persona..." autocomplete="off"
                            style="width:100%; padding:8px; box-sizing:border-box; border:1px solid var(--border-color); border-radius:4px; font-size:12px; background:var(--bg-input, #fff); color:var(--text-main);">
                        
                        <div id="dropdown-resultados-usuario" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-card, white); border:1px solid var(--border-color); border-radius:0 0 4px 4px; max-height:150px; overflow-y:auto; z-index:1000; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                        </div>
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">CURP *</label>
                        <input type="text" name="curp" id="input-usuario-curp" placeholder="CURP de la Persona" required 
                            pattern="${regexCurp}" minlength="18" maxlength="18" readonly
                            title="Se autocompleta al seleccionar una persona de la lista"
                            style="width:100%; box-sizing:border-box; padding:8px; text-transform: uppercase; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-disabled, #f5f5f5); color:var(--text-main); font-family:monospace;">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Username *</label>
                        <input type="text" name="username" placeholder="Username" required 
                            pattern="${regexUsername}" minlength="3" maxlength="50"
                            title="Solo letras, números y guiones bajos"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Correo Electrónico *</label>
                        <input type="email" name="email" placeholder="Correo Electrónico" required 
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Contraseña *</label>
                        <input type="password" name="password" placeholder="Contraseña" required 
                            pattern="${regexPassword}" minlength="8"
                            title="Debe contener al menos 8 caracteres, una mayúscula, una minúscula y un número"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Rol del Sistema *</label>
                        <select name="role_id" required style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                            <option value="1">Administrador General del Sistema</option>
                            <option value="2">Levantador Físico / Operador</option>
                            <option value="3">Registrador de Bienes Patrimoniales</option>
                            <option value="4">Revisor Central de Activos</option>
                            <option value="5">Resguardante / Jefe de Departamento</option>
                        </select>
                    </div>
                    
                    <button type="submit" style="width:100%; padding:10px; background:var(--success, #00796b); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
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
                            dropdown.innerHTML = '<div style="padding:8px; color:var(--text-muted, #757575); font-size:11px;">No se encontraron personas registradas.</div>';
                            dropdown.style.display = 'block';
                            return;
                        }

                        dropdown.innerHTML = personas.map(p => `
                            <div class="item-persona-sugerida" data-curp="${p.curp}" data-nombre="${p.nombres} ${p.apellidos}"
                                style="padding:8px; font-size:11px; border-bottom:1px solid var(--border-color); cursor:pointer;"
                                onmouseover="this.style.background='var(--hover-bg, #f5f5f5)'" onmouseout="this.style.background='var(--bg-card, #fff)'">
                                <div style="font-weight:600; color:var(--text-main, #212121);">${p.nombres} ${p.apellidos}</div>
                                <div style="font-family:monospace; color:var(--primary, #0288d1);">CURP: ${p.curp}</div>
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