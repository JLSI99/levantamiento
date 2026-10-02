import { adminService } from '/src/services/admin.js';

export class UpdatePersona {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = Array.isArray(permisos) ? permisos : [];
        this.puedeEditar = this.permisos.includes('personas:actualizar') || this.permisos.includes('personas:editar');
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
            container.innerHTML = `<div style="color:#757575; font-style:italic; padding:15px; border:1px solid #e0e0e0; border-radius:4px;">No tiene permisos para editar personas.</div>`;
            return;
        }

        const regexNombres = "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$";
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #ffb74d; border-radius: 4px; background: #fff8e1;">
                <h4 style="margin-top:0; color:#e65100;">Editar Persona</h4>
                <form id="form-update-persona">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">CURP *</label>
                    <input type="text" name="curp" value="${persona?.curp || ''}" required 
                        pattern="${regexCurp}" minlength="18" maxlength="18"
                        title="Debe ser una CURP válida de 18 caracteres"
                        style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase; border:1px solid #ccc; border-radius:4px;">
                        
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Nombres *</label>
                    <input type="text" name="nombres" value="${persona?.nombres || ''}" required 
                        pattern="${regexNombres}" minlength="2" maxlength="100"
                        title="Solo letras, espacios y caracteres acentuados permitidos"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Apellidos *</label>
                    <input type="text" name="apellidos" value="${persona?.apellidos || ''}" required 
                        pattern="${regexNombres}" minlength="2" maxlength="100"
                        title="Solo letras, espacios y caracteres acentuados permitidos"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <button type="submit" style="width:100%; padding:8px; background:#e65100; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Actualizar Persona
                    </button>
                    <button type="button" id="btn-cancelar-update-persona" style="width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer;">
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