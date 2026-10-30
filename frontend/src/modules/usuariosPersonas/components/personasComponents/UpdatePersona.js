import { adminService } from '/src/services/admin.js';

export class UpdatePersona {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('personas:actualizar') || this.permisos.includes('personas:editar'));

        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this._abortController = new AbortController();
        this.persona = null;
    }

    render(persona) {
        this.persona = persona;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.puedeEditar) {
            container.innerHTML = `<div class="forbidden-container" style="padding:15px; font-size:12px;">No cuenta con permisos para editar personas.</div>`;
            return;
        }

        const regexNombres = "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$";
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
            <div class="module-card" style="padding: 15px; width:100%; box-sizing:border-box; border: 1px solid var(--warning, #ffb74d); background: var(--bg-card-warning, #fff8e1);">
                <h4 style="margin-top:0; color:var(--warning-dark, #e65100); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Editar Persona</h4>
                <form id="form-update-persona" style="display:flex; flex-direction:column; gap:12px; width:100%;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">CURP *</label>
                        <input type="text" name="curp" value="${persona?.curp || ''}" required 
                            pattern="${regexCurp}" minlength="18" maxlength="18"
                            title="Debe ser una CURP válida de 18 caracteres"
                            style="width:100%; box-sizing:border-box; padding:8px; text-transform: uppercase; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nombres *</label>
                        <input type="text" name="nombres" value="${persona?.nombres || ''}" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Apellidos *</label>
                        <input type="text" name="apellidos" value="${persona?.apellidos || ''}" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; box-sizing:border-box; padding:8px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>
                        
                    <button type="submit" style="width:100%; padding:10px; background:var(--warning-dark, #e65100); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Actualizar Persona
                    </button>
                    <button type="button" id="btn-cancelar-update-persona" style="width:100%; padding:10px; background:var(--text-muted, #757575); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Cancelar Edición
                    </button>
                </form>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('form-update-persona');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.persona) return;

                const formData = new FormData(form);
                const payload = {
                    curp: formData.get('curp').toUpperCase().trim(),
                    nombres: formData.get('nombres').trim(),
                    apellidos: formData.get('apellidos').trim()
                };

                try {
                    await adminService.actualizarPersona(this.persona.id_persona, payload);
                    alert('Persona actualizada con éxito');
                    if (this.onSuccess) this.onSuccess();
                } catch (error) {
                    alert('Error en la operación: ' + (error.response?.data?.detail || error.message));
                }
            }, { signal: this._abortController.signal });
        }

        document.getElementById('btn-cancelar-update-persona')?.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
        }, { signal: this._abortController.signal });
    }

    limpiar() {
        this.persona = null;
        document.getElementById('form-update-persona')?.reset();
    }

    unmount() {
        this._abortController.abort();
    }
}