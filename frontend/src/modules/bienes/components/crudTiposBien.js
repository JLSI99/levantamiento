import { bienesService } from '../../../services/bienes.js';

export class CrudTiposBien {
    constructor(formContainerId, tableContainerId, permisos) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this.permisos = permisos;
        
        this._editingId = null;
        this._cache = new Map();
        this._abortController = new AbortController();

        // Eventos públicos
        this.onTiposLoaded = null;
        this.onTiposChanged = null;
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        const tableContainer = document.getElementById(this.tableContainerId);
        if (!formContainer || !tableContainer) return;

        formContainer.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                <h3 id="form-tipo-titulo" style="margin-top:0; color:var(--primary); font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px;">
                    Registrar Tipo de Bien
                </h3>
                ${this.permisos.crear || this.permisos.editar ? `
                <form id="form-tipo-bien">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Nombre del Tipo *</label>
                    <input type="text" name="nombre" id="input-tipo-nombre" placeholder="Ej. Equipo de Cómputo" required
                        minlength="2" maxlength="100" style="width:100%; margin-bottom:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tasa Depreciación Anual (%)</label>
                    <input type="number" name="tasa_depreciacion_anual" id="input-tipo-tasa" placeholder="0.00" step="0.01" min="0" max="100" 
                        style="width:100%; margin-bottom:15px; padding:6px; border:1px solid #ccc; border-radius:4px;">

                    <button type="submit" id="btn-submit-tipo" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Crear Categoría
                    </button>
                    <button type="button" id="btn-cancelar-tipo" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer;">
                        Cancelar Edición
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos de escritura.</div>'}
            </div>
        `;

        tableContainer.innerHTML = `
            <div style="background:white; border: 1px solid #e0e0e0; border-radius: 4px; padding:15px;">
                <h4 style="margin-top:0; color:#424242;">Catálogo de Tipos</h4>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                            <th style="padding:8px;">Categoría</th>
                            <th style="padding:8px;">Depreciación</th>
                            <th style="padding:8px;">Estado</th>
                            <th style="padding:8px; text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-tipos-bien">
                        <tr><td colspan="4" style="padding:15px; text-align:center;">Cargando...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const form = document.getElementById('form-tipo-bien');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const payload = {
                    nombre: formData.get('nombre').trim(),
                    tasa_depreciacion_anual: parseFloat(formData.get('tasa_depreciacion_anual') || 0)
                };

                try {
                    if (this._editingId) {
                        await bienesService.modificarTipoBien(this._editingId, payload);
                        alert('Tipo de bien actualizado.');
                    } else {
                        await bienesService.crearTipoBien(payload);
                        alert('Tipo de bien registrado.');
                    }
                    this.desactivarEdicion();
                    if (this.onTiposChanged) this.onTiposChanged();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal });
        }

        const tbody = document.getElementById('tbody-tipos-bien');
        if (tbody) {
            tbody.addEventListener('click', async (e) => {
                const btnEdit = e.target.closest('.btn-edit-tipo');
                const btnDel = e.target.closest('.btn-del-tipo');

                if (btnEdit) {
                    this.activarEdicion(btnEdit.getAttribute('data-id'));
                } else if (btnDel && this.permisos.borrar) {
                    if (confirm('¿Dar de baja este tipo de bien?')) {
                        try {
                            await bienesService.darDeBajaTipoBien(btnDel.getAttribute('data-id'));
                            if (this.onTiposChanged) this.onTiposChanged();
                        } catch (err) {
                            alert('Error al dar de baja: ' + err.message);
                        }
                    }
                }
            }, { signal });
        }

        document.getElementById('btn-cancelar-tipo')?.addEventListener('click', () => this.desactivarEdicion(), { signal });
    }

    activarEdicion(id) {
        const item = this._cache.get(id);
        if (!item) return;
        this._editingId = id;
        document.getElementById('input-tipo-nombre').value = item.nombre;
        document.getElementById('input-tipo-tasa').value = item.tasa_depreciacion_anual;

        document.getElementById('form-tipo-titulo').textContent = 'Editar Tipo de Bien';
        const btnSub = document.getElementById('btn-submit-tipo');
        btnSub.textContent = 'Actualizar Categoría';
        btnSub.style.background = '#e65100';
        document.getElementById('btn-cancelar-tipo').style.display = 'block';
    }

    desactivarEdicion() {
        this._editingId = null;
        document.getElementById('form-tipo-bien')?.reset();
        document.getElementById('form-tipo-titulo').textContent = 'Registrar Tipo de Bien';
        const btnSub = document.getElementById('btn-submit-tipo');
        if(btnSub) {
            btnSub.textContent = 'Crear Categoría';
            btnSub.style.background = '#1a237e';
        }
        document.getElementById('btn-cancelar-tipo').style.display = 'none';
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-tipos-bien');
        if (!tbody) return;
        try {
            const resp = await bienesService.listarTiposBien(100, 0, false);
            const data = resp.data || [];
            
            this._cache.clear();
            data.forEach(d => this._cache.set(d.id_tipo, d));

            // Avisamos al orquestador que ya tenemos los tipos para poblar el <select> del otro form
            if (this.onTiposLoaded) this.onTiposLoaded(data);

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">No hay tipos registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(d => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-weight:600;">${d.nombre}</td>
                    <td style="padding:8px;">${d.tasa_depreciacion_anual}%</td>
                    <td style="padding:8px;">${d.esta_activo ? '<span style="color:green;">Activo</span>' : '<span style="color:red;">Inactivo</span>'}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:4px; justify-content:center;">
                            ${this.permisos.editar ? `<button class="btn-edit-tipo" data-id="${d.id_tipo}" style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Editar</button>` : ''}
                            ${d.esta_activo && this.permisos.borrar ? `<button class="btn-del-tipo" data-id="${d.id_tipo}" style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Baja</button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center; padding:15px;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
    }
}