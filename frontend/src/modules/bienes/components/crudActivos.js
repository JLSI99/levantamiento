import { bienesService } from '../../../services/bienes.js';

export class CrudActivos {
    constructor(formContainerId, tableContainerId, permisos) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this.permisos = permisos;
        
        this._editingId = null;
        this._cache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        const tableContainer = document.getElementById(this.tableContainerId);
        if (!formContainer || !tableContainer) return;

        formContainer.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                <h3 id="form-activo-titulo" style="margin-top:0; color:var(--primary); font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px;">
                    Indexación de Activo Físico
                </h3>
                ${this.permisos.crear || this.permisos.editar ? `
                <form id="form-activo">
                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Descripción Completa *</label>
                    <input type="text" name="descripcion" id="input-act-desc" placeholder="Ej. Monitor Dell UltraSharp 27" required 
                        style="width:100%; margin-bottom:10px; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Serie</label>
                            <input type="text" name="serie" id="input-act-serie" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Marca</label>
                            <input type="text" name="marca" id="input-act-marca" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Modelo</label>
                            <input type="text" name="modelo" id="input-act-modelo" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Costo (MXN) *</label>
                            <input type="number" step="0.01" name="costo" id="input-act-costo" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Adquisición</label>
                            <input type="date" name="fecha_adquisicion" id="input-act-fecha" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tipo de Bien *</label>
                    <select name="tipos_ids" id="select-act-tipos" multiple required 
                        style="width:100%; margin-bottom:15px; padding:6px; border:1px solid #ccc; border-radius:4px; height:80px;">
                        <!-- Se llenará dinámicamente -->
                    </select>
                    <small style="display:block; margin-top:-10px; margin-bottom:15px; color:#757575;">Mantén presionado Ctrl (Windows) o Cmd (Mac) para seleccionar varios</small>

                    <button type="submit" id="btn-submit-activo" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Dar de Alta Activo
                    </button>
                    <button type="button" id="btn-cancelar-activo" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer;">
                        Cancelar Edición
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos de escritura para Bienes.</div>'}
            </div>
        `;

        tableContainer.innerHTML = `
            <div style="background:white; border: 1px solid #e0e0e0; border-radius: 4px; padding:15px; overflow-x: auto;">
                <h4 style="margin-top:0; color:#424242;">Inventario Patrimonial</h4>
                <table style="width:100%; border-collapse:collapse; font-size:12px; min-width: 600px;">
                    <thead>
                        <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                            <th style="padding:8px;">Descripción / ID</th>
                            <th style="padding:8px;">Detalles (Marca/Mod/Serie)</th>
                            <th style="padding:8px;">Costo</th>
                            <th style="padding:8px;">Categorías</th>
                            <th style="padding:8px; text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-activos">
                        <tr><td colspan="5" style="padding:15px; text-align:center;">Cargando inventario...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const form = document.getElementById('form-activo');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                
                // Obtener todos los UUIDs seleccionados en el select multiple (requerimiento de List[UUID])
                const selectElement = document.getElementById('select-act-tipos');
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
                    if (this._editingId) {
                        await bienesService.modificarBien(this._editingId, payload);
                        alert('Activo actualizado exitosamente.');
                    } else {
                        await bienesService.crearNuevoBien(payload);
                        alert('Activo indexado exitosamente.');
                    }
                    this.desactivarEdicion();
                    this.cargarDatos();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal });
        }

        const tbody = document.getElementById('tbody-activos');
        if (tbody) {
            tbody.addEventListener('click', async (e) => {
                const btnEdit = e.target.closest('.btn-edit-act');
                const btnDel = e.target.closest('.btn-del-act');

                if (btnEdit) {
                    this.activarEdicion(btnEdit.getAttribute('data-id'));
                } else if (btnDel && this.permisos.borrar) {
                    if (confirm('¿Dar de baja este activo del inventario patrimonial?')) {
                        try {
                            await bienesService.darDeBajaBien(btnDel.getAttribute('data-id'));
                            this.cargarDatos();
                        } catch (err) {
                            alert('Error al dar de baja: ' + err.message);
                        }
                    }
                }
            }, { signal });
        }

        document.getElementById('btn-cancelar-activo')?.addEventListener('click', () => this.desactivarEdicion(), { signal });
    }

    actualizarSelectTipos(tipos) {
        const select = document.getElementById('select-act-tipos');
        if (!select) return;
        
        // Guardamos la selección actual si hay una
        const seleccionesPrevias = Array.from(select.selectedOptions).map(o => o.value);
        
        select.innerHTML = tipos.map(t => `<option value="${t.id_tipo}">${t.nombre}</option>`).join('');
        
        // Restaurar selecciones previas si aún existen
        Array.from(select.options).forEach(opt => {
            if (seleccionesPrevias.includes(opt.value)) opt.selected = true;
        });
    }

    activarEdicion(id) {
        const item = this._cache.get(id);
        if (!item) return;
        this._editingId = id;

        document.getElementById('input-act-desc').value = item.descripcion;
        document.getElementById('input-act-serie').value = item.serie || '';
        document.getElementById('input-act-marca').value = item.marca || '';
        document.getElementById('input-act-modelo').value = item.modelo || '';
        document.getElementById('input-act-costo').value = item.costo;
        document.getElementById('input-act-fecha').value = item.fecha_adquisicion || '';
        
        const selectTipos = document.getElementById('select-act-tipos');
        if (selectTipos && item.tipos) {
            const idsTipos = item.tipos.map(t => t.id_tipo);
            Array.from(selectTipos.options).forEach(opt => {
                opt.selected = idsTipos.includes(opt.value);
            });
        }

        document.getElementById('form-activo-titulo').textContent = 'Editar Activo';
        const btnSub = document.getElementById('btn-submit-activo');
        btnSub.textContent = 'Actualizar Activo';
        btnSub.style.background = '#e65100';
        document.getElementById('btn-cancelar-activo').style.display = 'block';
    }

    desactivarEdicion() {
        this._editingId = null;
        document.getElementById('form-activo')?.reset();
        document.getElementById('form-activo-titulo').textContent = 'Indexación de Activo Físico';
        const btnSub = document.getElementById('btn-submit-activo');
        if(btnSub) {
            btnSub.textContent = 'Dar de Alta Activo';
            btnSub.style.background = '#1a237e';
        }
        document.getElementById('btn-cancelar-activo').style.display = 'none';
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-activos');
        if (!tbody) return;
        try {
            const resp = await bienesService.listarBienes(100, 0, false);
            const data = resp.data || [];
            
            this._cache.clear();
            data.forEach(d => this._cache.set(d.id_bien, d));

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px;">No hay activos registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(d => {
                const idCorto = d.id_bien.substring(0, 8);
                const categorias = d.tipos.map(t => `<span style="background:#e3f2fd; color:#1565c0; padding:2px 6px; border-radius:3px; margin:2px; display:inline-block;">${t.nombre}</span>`).join('');
                const detalles = [d.marca, d.modelo, d.serie].filter(Boolean).join(' / ') || '<span style="color:#9e9e9e;">Sin detalles</span>';

                return `
                    <tr style="border-bottom:1px solid #e0e0e0; ${d.esta_activo ? '' : 'opacity:0.5;'}">
                        <td style="padding:8px;">
                            <div style="font-weight:600; color:#212121;">${d.descripcion}</div>
                            <div style="font-family:monospace; color:#757575; font-size:10px;">ID: ${idCorto}</div>
                        </td>
                        <td style="padding:8px;">${detalles}</td>
                        <td style="padding:8px; font-weight:bold;">$${parseFloat(d.costo).toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
                        <td style="padding:8px;">${categorias}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center;">
                                ${this.permisos.editar ? `<button class="btn-edit-act" data-id="${d.id_bien}" style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Editar</button>` : ''}
                                ${d.esta_activo && this.permisos.borrar ? `<button class="btn-del-act" data-id="${d.id_bien}" style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Baja</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center; padding:15px;">Error al cargar inventario</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
    }
}