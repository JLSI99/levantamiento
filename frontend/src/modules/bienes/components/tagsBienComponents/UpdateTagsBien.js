import { bienesService } from '/src/services/bienes.js';

export class UpdateTagsBien {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this._abortController = new AbortController();
        this.item = null;
    }

    render(item) {
        this.item = item;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #ffb74d; border-radius: 4px; background: #fff8e1;">
                <h3 style="margin-top:0; color:#e65100; font-size:16px; border-bottom:1px solid #ffe0b2; padding-bottom:8px;">
                    Editar Etiqueta (Tag)
                </h3>
                ${this.permisos.editar ? `
                <form id="form-update-tag-bien">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Nombre de la Etiqueta *</label>
                    <input type="text" name="nombre" required value="${item?.nombre || ''}"
                        minlength="2" maxlength="100" style="width:100%; margin-bottom:15px; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">

                    <button type="submit" style="width:100%; padding:8px; background:#e65100; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Actualizar Etiqueta
                    </button>
                    <button type="button" id="btn-cancelar-update-tag" style="width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer;">
                        Cancelar Edición
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos para editar etiquetas.</div>'}
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