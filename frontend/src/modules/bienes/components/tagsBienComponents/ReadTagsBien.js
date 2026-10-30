import { bienesService } from '/src/services/bienes.js';

export class ReadTagsBien {
    constructor(containerId, permisos, onEdit, onDelete, onLoaded) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        this.onEdit = onEdit;
        this.onDelete = onDelete;
        this.onLoaded = onLoaded;

        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:actualizar') || this.permisos.includes('bienes:editar') || this.permisos.includes('tags:editar'));
        
        this.puedeBorrar = isObj 
            ? Boolean(this.permisos.borrar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('bienes:borrar') || this.permisos.includes('tags:borrar'));

        this._cache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const tableContainer = document.getElementById(this.containerId);
        if (!tableContainer) return;

        tableContainer.innerHTML = `
            <div class="module-card" style="background:var(--bg-card, white); border: 1px solid var(--border-color, #e0e0e0); border-radius: 4px; padding:15px; width:100%; box-sizing:border-box;">
                <h4 style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color, #e0e0e0); padding-bottom:8px;">Catálogo de Etiquetas (Tags)</h4>
                <div style="width:100%; overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; min-width:400px;">
                        <thead>
                            <tr style="background:var(--table-header-bg, #f5f5f5); text-align:left; border-bottom:2px solid var(--border-color, #e0e0e0);">
                                <th style="padding:8px; color:var(--text-main);">Etiqueta</th>
                                <th style="padding:8px; color:var(--text-main);">Estado</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-tags-bien">
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
        const signal = this._abortController.signal;
        const tbody = document.getElementById('tbody-tags-bien');

        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.btn-edit-tag');
                const btnDel = e.target.closest('.btn-del-tag');

                if (btnEdit && this.puedeEditar) {
                    const id = btnEdit.getAttribute('data-id');
                    const item = this._cache.get(id);
                    if (this.onEdit) this.onEdit(id, item);
                } else if (btnDel && this.puedeBorrar) {
                    if (this.onDelete) this.onDelete(btnDel.getAttribute('data-id'));
                }
            }, { signal });
        }
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-tags-bien');
        if (!tbody) return;
        try {
            const resp = await bienesService.listarTagsBien(100, 0, false);
            const data = Array.isArray(resp) ? resp : (resp?.data || []);

            this._cache.clear();
            data.forEach(d => {
                const tagId = String(d.id_tag || d.id_tipo);
                this._cache.set(tagId, d);
            });

            if (this.onLoaded) this.onLoaded(data);

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-muted);">No hay etiquetas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(d => {
                const tagId = String(d.id_tag || d.id_tipo);
                return `
                    <tr style="border-bottom:1px solid var(--border-color, #e0e0e0); ${d.esta_activo ? '' : 'opacity:0.5;'}">
                        <td style="padding:8px; font-weight:600; color:var(--text-main);">${this._escapeHtml(d.nombre)}</td>
                        <td style="padding:8px;">${d.esta_activo ? '<span style="color:var(--success, green); font-weight:600;">Activa</span>' : '<span style="color:var(--danger, red); font-weight:600;">Inactiva</span>'}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                                ${this.puedeEditar ? `<button class="btn-edit-tag" data-id="${tagId}" style="background:var(--warning, #f57c00); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">Editar</button>` : ''}
                                ${d.esta_activo && this.puedeBorrar ? `<button class="btn-del-tag" data-id="${tagId}" style="background:var(--danger, #c62828); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">Baja</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error al cargar catálogo de etiquetas:', error);
            tbody.innerHTML = '<tr><td colspan="3" style="color:var(--danger, red); text-align:center; padding:15px;">Error al cargar datos</td></tr>';
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    unmount() {
        this._abortController.abort();
    }
}