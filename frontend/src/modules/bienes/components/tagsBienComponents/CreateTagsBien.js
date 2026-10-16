import { bienesService } from '/src/services/bienes.js';

export class CreateTagsBien {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                <h3 style="margin-top:0; color:var(--primary); font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px;">
                    Registrar Etiqueta (Tag)
                </h3>
                ${this.permisos.crear ? `
                <form id="form-create-tag-bien">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Nombre de la Etiqueta *</label>
                    <input type="text" name="nombre" placeholder="Ej. Laboratorio, En Revisión, Alta Prioridad" required
                        minlength="2" maxlength="100" style="width:100%; margin-bottom:15px; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">

                    <button type="submit" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Crear Etiqueta
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos para crear etiquetas.</div>'}
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('form-create-tag-bien');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const payload = {
                    nombre: formData.get('nombre').trim()
                };

                try {
                    await bienesService.crearTagBien(payload);
                    alert('Etiqueta registrada exitosamente.');
                    form.reset();
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }
    }

    unmount() {
        this._abortController.abort();
    }
}