import { adminService } from '/src/services/admin.js';

export class CreatePersona {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        
        // Soporte robusto tanto para el nuevo objeto CapBAC como para arreglos antiguos de permisos
        this.puedeCrear = typeof this.permisos === 'object' && !Array.isArray(this.permisos)
            ? Boolean(this.permisos.crear)
            : Array.isArray(this.permisos) && this.permisos.includes('personas:crear');

        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.puedeCrear) {
            container.innerHTML = `<div class="forbidden-container" style="padding:15px; font-size:12px;">No cuenta con la capacidad de gestión demográfica (crear personas).</div>`;
            return;
        }

        const regexNombres = "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$";
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
            <div class="module-card" style="padding: 15px; width: 100%; box-sizing: border-box;">
                <h4 style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Registrar Persona</h4>
                <form id="form-create-persona" style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">CURP *</label>
                        <input type="text" name="curp" placeholder="CURP" required 
                            pattern="${regexCurp}" minlength="18" maxlength="18" 
                            title="Debe ser una CURP válida de 18 caracteres"
                            style="width:100%; box-sizing:border-box; padding:8px; text-transform: uppercase; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nombres *</label>
                        <input type="text" name="nombres" placeholder="Nombres" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Apellidos *</label>
                        <input type="text" name="apellidos" placeholder="Apellidos" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <button type="submit" style="width:100%; padding:10px; background:var(--primary, #1a237e); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Guardar Persona
                    </button>
                </form>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('form-create-persona');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);

                const payload = {
                    curp: formData.get('curp').toUpperCase().trim(),
                    nombres: formData.get('nombres').trim(),
                    apellidos: formData.get('apellidos').trim()
                };

                try {
                    await adminService.crearPersona(payload);
                    alert('Persona registrada con éxito');
                    form.reset();
                    if (this.onSuccess) this.onSuccess();
                } catch (error) {
                    alert('Error en la operación: ' + (error.response?.data?.detail || error.message));
                }
            }, { signal: this._abortController.signal });
        }
    }

    unmount() {
        this._abortController.abort();
    }
}