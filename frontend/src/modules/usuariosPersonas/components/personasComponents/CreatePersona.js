import { adminService } from '/src/services/admin.js';

export class CreatePersona {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = Array.isArray(permisos) ? permisos : [];
        this.puedeCrear = this.permisos.includes('personas:crear');
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.puedeCrear) {
            container.innerHTML = `<div style="color:#757575; font-style:italic; padding:15px; border:1px solid #e0e0e0; border-radius:4px;">No tiene permisos de gestión demográfica.</div>`;
            return;
        }

        const regexNombres = "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$";
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background:#ffffff;">
                <h4 style="margin-top:0; color:#424242;">Registrar Persona</h4>
                <form id="form-create-persona">
                    <input type="text" name="curp" placeholder="CURP" required 
                        pattern="${regexCurp}" minlength="18" maxlength="18" 
                        title="Debe ser una CURP válida de 18 caracteres"
                        style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase; border:1px solid #ccc; border-radius:4px;">
                        
                    <input type="text" name="nombres" placeholder="Nombres" required 
                        pattern="${regexNombres}" minlength="2" maxlength="100"
                        title="Solo letras, espacios y caracteres acentuados permitidos"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <input type="text" name="apellidos" placeholder="Apellidos" required 
                        pattern="${regexNombres}" minlength="2" maxlength="100"
                        title="Solo letras, espacios y caracteres acentuados permitidos"
                        style="width:100%; margin-bottom:10px; padding:8px; border:1px solid #ccc; border-radius:4px;">
                        
                    <button type="submit" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
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