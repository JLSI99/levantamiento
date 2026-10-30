import { bienesService } from '/src/services/bienes.js';

export class CreateTagsBien {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();

        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeCrear = isObj 
            ? Boolean(this.permisos.crear) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:crear') || this.permisos.includes('tags:crear'));
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="module-card" style="padding: 15px; border: 1px solid var(--border-color, #e0e0e0); border-radius: 4px; background: var(--bg-card, #ffffff); width:100%; box-sizing:border-box;">
                <h3 style="margin-top:0; color:var(--primary, #1a237e); font-size:16px; font-weight:700; border-bottom:1px solid var(--border-color, #e0e0e0); padding-bottom:8px;">
                    Registrar Etiqueta (Tag)
                </h3>
                ${this.puedeCrear ? `
                <form id="form-create-tag-bien" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nombre de la Etiqueta *</label>
                        <input type="text" name="nombre" placeholder="Ej. Laboratorio, En Revisión, Alta Prioridad" required
                            minlength="2" maxlength="100" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>

                    <button type="submit" style="width:100%; padding:10px; background:var(--primary, #1a237e); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Crear Etiqueta
                    </button>
                </form>
                ` : '<div class="forbidden-container" style="color:var(--text-muted, #757575); font-style:italic; font-size:12px;">Sin permisos para crear etiquetas.</div>'}
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