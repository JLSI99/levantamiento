import { adminService } from '/src/services/admin.js';
import { ubicacionesService } from '/src/services/ubicaciones.js';

export class CreateDepartamento {
    constructor(permisos, onSuccess) {
        this.permisos = permisos || {};
        this.onSuccess = onSuccess;
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeCrear = isObj ? Boolean(this.permisos.crear) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:crear');
        this.puedeEditar = isObj ? Boolean(this.permisos.editar) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:editar');
    }

    renderFormHTML() {
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        if (!this.puedeCrear && !this.puedeEditar) {
            return '<div class="forbidden-container" style="padding:15px; font-size:12px;">Sin permisos para gestionar departamentos.</div>';
        }

        return `
            <form id="form-departamento" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                <div>
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nombre del Departamento *</label>
                    <input type="text" name="nombre" id="input-depto-nombre" placeholder="Nombre Oficial del Departamento" required
                        minlength="2" maxlength="150" style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                </div>

                <!-- Buscador predictivo por nombre -->
                <div style="position:relative; width:100%;">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Jefe Adscrito (Búsqueda por Nombre)</label>
                    <input type="text" id="input-busqueda-persona-depto" placeholder="Escriba el nombre o apellido del jefe..." autocomplete="off"
                        style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; font-size:12px; background:var(--bg-input, #fff); color:var(--text-main);">
                    
                    <div id="dropdown-resultados-depto" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-card, white); border:1px solid var(--border-color); border-radius:0 0 4px 4px; max-height:150px; overflow-y:auto; z-index:1000; box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                    </div>
                </div>

                <div>
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">CURP del Jefe / Resguardatario *</label>
                    <input type="text" name="curp_jefe_departamento" id="input-depto-curp" placeholder="CURP del Jefe / Resguardatario" required
                        pattern="${regexCurp}" minlength="18" maxlength="18" readonly
                        title="Se autocompleta al seleccionar una persona de la lista"
                        style="width:100%; box-sizing:border-box; padding:8px; text-transform: uppercase; background:var(--bg-disabled, #f5f5f5); border:1px solid var(--border-color); border-radius:4px; font-family:monospace; color:var(--text-main);">
                </div>

                <button type="submit" id="btn-submit-depto" style="width:100%; padding:10px; background:var(--success, #00796b); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                    Registrar Departamento
                </button>
                <button type="button" id="btn-cancelar-depto" style="display:none; width:100%; padding:10px; background:var(--text-muted, #757575); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                    Cancelar Edición
                </button>
            </form>
        `;
    }

    bindSubmit(signal, editingDeptoIdResolver, onCancel) {
        const form = document.getElementById('form-departamento');
        if (!form) return;

        const inputBusqueda = document.getElementById('input-busqueda-persona-depto');
        const inputCurp = document.getElementById('input-depto-curp');
        const dropdown = document.getElementById('dropdown-resultados-depto');

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
                        console.error("Error en búsqueda autocompletada de persona:", err);
                    }
                }, 300);
            }, { signal });

            document.addEventListener('click', (ev) => {
                if (!inputBusqueda.contains(ev.target) && !dropdown.contains(ev.target)) {
                    dropdown.style.display = 'none';
                }
            }, { signal });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const payload = {
                nombre: formData.get('nombre').trim(),
                curp_jefe_departamento: formData.get('curp_jefe_departamento').toUpperCase().trim()
            };

            const editingId = editingDeptoIdResolver();

            try {
                if (editingId) {
                    await ubicacionesService.actualizarDepartamento(editingId, payload);
                    alert('Estructura departamental actualizada');
                } else {
                    await ubicacionesService.crearDepartamento(payload);
                    alert('Departamento registrado correctamente');
                }
                if (onCancel) onCancel();
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error en departamento: ' + (err.response?.data?.detail || err.message));
            }
        }, { signal });

        document.getElementById('btn-cancelar-depto')?.addEventListener('click', () => {
            if (onCancel) onCancel();
        }, { signal });
    }
}