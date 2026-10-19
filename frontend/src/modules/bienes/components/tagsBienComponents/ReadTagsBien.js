import { bienesService } from '/src/services/bienes.js';

export class ReadTagsBien {
    constructor(containerId, permisos, onEdit, onDelete, onLoaded) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onEdit = onEdit;
        this.onDelete = onDelete;
        this.onLoaded = onLoaded;

        this._cache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const tableContainer = document.getElementById(this.containerId);
        if (!tableContainer) return;

        tableContainer.innerHTML = `
            <div style="background:white; border: 1px solid #e0e0e0; border-radius: 4px; padding:15px;">
                <h4 style="margin-top:0; color:#424242;">Catálogo de Etiquetas (Tags)</h4>
                <table style="width:100%; border-collapse:collapse; font-size:12px;">
                    <thead>
                        <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                            <th style="padding:8px;">Etiqueta</th>
                            <th style="padding:8px;">Estado</th>
                            <th style="padding:8px; text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-tags-bien">
                        <tr><td colspan="3" style="padding:15px; text-align:center;">Cargando...</td></tr>
                    </tbody>
                </table>
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

                if (btnEdit) {
                    const id = btnEdit.getAttribute('data-id');
                    const item = this._cache.get(id);
                    if (this.onEdit) this.onEdit(id, item);
                } else if (btnDel && this.permisos.borrar) {
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
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:15px;">No hay etiquetas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(d => {
                const tagId = String(d.id_tag || d.id_tipo);
                return `
                    <tr style="border-bottom:1px solid #e0e0e0; ${d.esta_activo ? '' : 'opacity:0.5;'}">
                        <td style="padding:8px; font-weight:600;">${this._escapeHtml(d.nombre)}</td>
                        <td style="padding:8px;">${d.esta_activo ? '<span style="color:green;">Activa</span>' : '<span style="color:red;">Inactiva</span>'}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center;">
                                ${this.permisos.editar ? `<button class="btn-edit-tag" data-id="${tagId}" style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Editar</button>` : ''}
                                ${d.esta_activo && this.permisos.borrar ? `<button class="btn-del-tag" data-id="${tagId}" style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">Baja</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            console.error('Error al cargar catálogo de etiquetas:', error);
            tbody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center; padding:15px;">Error al cargar datos</td></tr>';
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