import { bienesService } from '/src/services/bienes.js';

export class UpdateTagsBien {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this._abortController = new AbortController();
        this.item = null;

        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:actualizar') || this.permisos.includes('bienes:editar') || this.permisos.includes('tags:editar'));
    }

    render(item) {
        this.item = item;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="module-card" style="padding: 15px; border: 1px solid var(--warning, #ffb74d); border-radius: 4px; background: var(--bg-card-warning, #fff8e1); width:100%; box-sizing:border-box;">
                <h3 style="margin-top:0; color:var(--warning-dark, #e65100); font-size:16px; font-weight:700; border-bottom:1px solid var(--border-color-warning, #ffe0b2); padding-bottom:8px;">
                    Editar Etiqueta (Tag)
                </h3>
                ${this.puedeEditar ? `
                <form id="form-update-tag-bien" style="display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px; color:var(--text-main);">Nombre de la Etiqueta *</label>
                        <input type="text" name="nombre" required value="${item?.nombre || ''}"
                            minlength="2" maxlength="100" style="width:100%; padding:8px; border:1px solid var(--border-color, #ccc); border-radius:4px; box-sizing:border-box; background:var(--bg-input, #fff); color:var(--text-main);">
                    </div>

                    <button type="submit" style="width:100%; padding:10px; background:var(--warning-dark, #e65100); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Actualizar Etiqueta
                    </button>
                    <button type="button" id="btn-cancelar-update-tag" style="width:100%; padding:10px; background:var(--text-muted, #757575); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Cancelar Edición
                    </button>
                </form>
                ` : '<div class="forbidden-container" style="color:var(--text-muted, #757575); font-style:italic; font-size:12px;">Sin permisos para editar etiquetas.</div>'}
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('form-update-tag-bien');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.item) return;

                const formData = new FormData(form);
                const payload = {
                    nombre: formData.get('nombre').trim()
                };

                const tagId = this.item.id_tag || this.item.id_tipo;

                try {
                    await bienesService.modificarTagBien(tagId, payload);
                    alert('Etiqueta actualizada exitosamente.');
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }

        document.getElementById('btn-cancelar-update-tag')?.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
        }, { signal: this._abortController.signal });
    }

    limpiar() {
        this.item = null;
        document.getElementById('form-update-tag-bien')?.reset();
    }

    unmount() {
        this._abortController.abort();
    }
}