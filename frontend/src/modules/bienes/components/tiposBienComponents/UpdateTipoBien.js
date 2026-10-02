import { bienesService } from '/src/services/bienes.js';

export class UpdateTipoBien {
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
                    Editar Tipo de Bien
                </h3>
                ${this.permisos.editar ? `
                <form id="form-update-tipo-bien">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Nombre del Tipo *</label>
                    <input type="text" name="nombre" required value="${item?.nombre || ''}"
                        minlength="2" maxlength="100" style="width:100%; margin-bottom:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tasa Depreciación Anual (%)</label>
                    <input type="number" name="tasa_depreciacion_anual" step="0.01" min="0" max="100" value="${item?.tasa_depreciacion_anual ?? ''}"
                        style="width:100%; margin-bottom:15px; padding:6px; border:1px solid #ccc; border-radius:4px;">

                    <button type="submit" style="width:100%; padding:8px; background:#e65100; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Actualizar Categoría
                    </button>
                    <button type="button" id="btn-cancelar-update-tipo" style="width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer;">
                        Cancelar Edición
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos para editar tipos.</div>'}
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const form = document.getElementById('form-update-tipo-bien');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.item) return;

                const formData = new FormData(form);
                const payload = {
                    nombre: formData.get('nombre').trim(),
                    tasa_depreciacion_anual: parseFloat(formData.get('tasa_depreciacion_anual') || 0)
                };

                try {
                    await bienesService.modificarTipoBien(this.item.id_tipo, payload);
                    alert('Tipo de bien actualizado.');
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }

        document.getElementById('btn-cancelar-update-tipo')?.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
        }, { signal: this._abortController.signal });
    }

    limpiar() {
        this.item = null;
        document.getElementById('form-update-tipo-bien')?.reset();
    }

    unmount() {
        this._abortController.abort();
    }
}