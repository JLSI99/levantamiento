import { adminService } from '/src/services/admin.js';

export class ReadPersona {
    constructor(containerId, permisos, onEdit, onDelete) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('personas:actualizar') || this.permisos.includes('personas:editar'));
        
        this.puedeEliminar = isObj 
            ? Boolean(this.permisos.borrar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('personas:eliminar') || this.permisos.includes('personas:borrar'));

        this.onEdit = onEdit;
        this.onDelete = onDelete;

        this._personasCache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="module-card" style="padding:15px; width:100%; box-sizing:border-box;">
                <h4 style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Catálogo Demográfico</h4>
                <div style="width: 100%; overflow-x: auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; min-width: 320px;">
                        <thead>
                            <tr style="background:var(--table-header-bg, #f5f5f5); text-align:left; border-bottom:2px solid var(--border-color);">
                                <th style="padding:8px; color:var(--text-main);">CURP</th>
                                <th style="padding:8px; color:var(--text-main);">Nombre Completo</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-personas">
                            <tr><td colspan="3" style="padding:15px; text-align:center; color:var(--text-muted);">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const tbody = document.getElementById('tbody-personas');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btnEditar = e.target.closest('.btn-editar-persona');
                const btnEliminar = e.target.closest('.btn-eliminar-persona');

                if (btnEditar && this.puedeEditar) {
                    const idPersona = btnEditar.getAttribute('data-id');
                    const persona = this._personasCache.get(idPersona);
                    if (this.onEdit) this.onEdit(idPersona, persona);
                } else if (btnEliminar && this.puedeEliminar) {
                    const idPersona = btnEliminar.getAttribute('data-id');
                    const persona = this._personasCache.get(idPersona);
                    if (this.onDelete) this.onDelete(idPersona, persona);
                }
            }, { signal: this._abortController.signal });
        }
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-personas');
        if (!tbody) return;

        try {
            const resp = await adminService.listarPersonas(50, 0, false);
            const personas = Array.isArray(resp) ? resp : (resp?.data || []);

            this._personasCache.clear();
            personas.forEach(p => this._personasCache.set(String(p.id_persona), p));

            if (personas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-muted);">No existen personas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = personas.map(p => `
                <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:8px; font-family:monospace; color:var(--text-main);">${p.curp}</td>
                    <td style="padding:8px; color:var(--text-main);">${p.apellidos}, ${p.nombres}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                            ${this.puedeEditar ? `
                                <button class="btn-editar-persona" data-id="${p.id_persona}" 
                                    style="background:var(--warning, #f57c00); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">
                                    Editar
                                </button>
                            ` : ''}
                            ${this.puedeEliminar ? `
                                <button class="btn-eliminar-persona" data-id="${p.id_persona}" 
                                    style="background:var(--danger, #d32f2f); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">
                                    Eliminar
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3" style="color:var(--danger, red); text-align:center; padding:15px;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
    }
}