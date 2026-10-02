import { bienesService } from '/src/services/bienes.js';

export class UpdateActivo {
    constructor(containerId, permisos, onSuccess, onCancel) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this._abortController = new AbortController();
        this.tipos = [];
        this.item = null;
    }

    render(item) {
        this.item = item;
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #ffb74d; border-radius: 4px; background: #fff8e1;">
                <h3 style="margin-top:0; color:#e65100; font-size:16px; border-bottom:1px solid #ffe0b2; padding-bottom:8px;">
                    Editar Activo
                </h3>
                ${this.permisos.editar ? `
                <form id="form-update-activo">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Descripción Completa *</label>
                    <input type="text" name="descripcion" required value="${item?.descripcion || ''}"
                        style="width:100%; margin-bottom:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Serie</label>
                            <input type="text" name="serie" value="${item?.serie || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Marca</label>
                            <input type="text" name="marca" value="${item?.marca || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Modelo</label>
                            <input type="text" name="modelo" value="${item?.modelo || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Costo (MXN) *</label>
                            <input type="number" step="0.01" name="costo" required value="${item?.costo || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Adquisición</label>
                            <input type="date" name="fecha_adquisicion" value="${item?.fecha_adquisicion || ''}" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tipo de Bien *</label>
                    <select name="tipos_ids" id="select-update-tipos" multiple required 
                        style="width:100%; margin-bottom:15px; padding:6px; border:1px solid #ccc; border-radius:4px; height:80px;">
                    </select>

                    <button type="submit" style="width:100%; padding:8px; background:#e65100; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Actualizar Activo
                    </button>
                    <button type="button" id="btn-cancelar-update" style="width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer;">
                        Cancelar Edición
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos para editar Bienes.</div>'}
            </div>
        `;

        this.bindEvents();
        this.renderSelectTipos();
    }

    actualizarSelectTipos(tipos) {
        this.tipos = tipos;
        this.renderSelectTipos();
    }

    renderSelectTipos() {
        const select = document.getElementById('select-update-tipos');
        if (!select) return;
        
        select.innerHTML = this.tipos.map(t => `<option value="${t.id_tipo}">${t.nombre}</option>`).join('');
        
        if (this.item && this.item.tipos) {
            const idsTipos = this.item.tipos.map(t => t.id_tipo);
            Array.from(select.options).forEach(opt => {
                opt.selected = idsTipos.includes(opt.value);
            });
        }
    }

    bindEvents() {
        const form = document.getElementById('form-update-activo');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.item) return;

                const formData = new FormData(form);
                const selectElement = document.getElementById('select-update-tipos');
                const tiposIds = Array.from(selectElement.selectedOptions).map(opt => opt.value);

                const payload = {
                    descripcion: formData.get('descripcion').trim(),
                    serie: formData.get('serie').trim() || null,
                    marca: formData.get('marca').trim() || null,
                    modelo: formData.get('modelo').trim() || null,
                    costo: parseFloat(formData.get('costo')),
                    fecha_adquisicion: formData.get('fecha_adquisicion') || null,
                    tipos_ids: tiposIds
                };

                try {
                    await bienesService.modificarBien(this.item.id_bien, payload);
                    alert('Activo actualizado exitosamente.');
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }

        document.getElementById('btn-cancelar-update')?.addEventListener('click', () => {
            if (this.onCancel) this.onCancel();
        }, { signal: this._abortController.signal });
    }

    limpiar() {
        this.item = null;
        document.getElementById('form-update-activo')?.reset();
    }

    unmount() {
        this._abortController.abort();
    }
}