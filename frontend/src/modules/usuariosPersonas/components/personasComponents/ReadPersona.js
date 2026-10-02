import { adminService } from '/src/services/admin.js';

export class ReadPersona {
    constructor(containerId, permisos, onEdit, onDelete) {
        this.containerId = containerId;
        this.permisos = Array.isArray(permisos) ? permisos : [];
        this.puedeEditar = this.permisos.includes('personas:actualizar') || this.permisos.includes('personas:editar');
        this.puedeEliminar = this.permisos.includes('personas:eliminar') || this.permisos.includes('personas:borrar');

        this.onEdit = onEdit;
        this.onDelete = onDelete;

        this._personasCache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="background:white; border: 1px solid #e0e0e0; border-radius: 4px; padding:15px;">
                <h4 style="margin-top:0; color:#424242;">Catálogo Demográfico</h4>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                            <th style="padding:8px;">CURP</th>
                            <th style="padding:8px;">Nombre Completo</th>
                            <th style="padding:8px; text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-personas">
                        <tr><td colspan="3" style="padding:15px; text-align:center;">Cargando...</td></tr>
                    </tbody>
                </table>
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
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px;">No existen personas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = personas.map(p => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-family:monospace;">${p.curp}</td>
                    <td style="padding:8px;">${p.apellidos}, ${p.nombres}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:4px; justify-content:center;">
                            ${this.puedeEditar ? `
                                <button class="btn-editar-persona" data-id="${p.id_persona}" 
                                    style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Editar
                                </button>
                            ` : ''}
                            ${this.puedeEliminar ? `
                                <button class="btn-eliminar-persona" data-id="${p.id_persona}" 
                                    style="background:#d32f2f; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Eliminar
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center; padding:15px;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
    }
}