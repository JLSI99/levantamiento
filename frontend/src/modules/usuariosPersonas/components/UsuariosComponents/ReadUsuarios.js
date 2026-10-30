import { adminService } from '/src/services/admin.js';

export class ReadUsuarios {
    constructor(containerId, permisos, onEdit, onDelete) {
        this.containerId = containerId;
        this.permisos = permisos || {};
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj 
            ? Boolean(this.permisos.editar) 
            : Array.isArray(this.permisos) && (this.permisos.includes('usuarios:actualizar') || this.permisos.includes('usuarios:editar'));
        
        this.puedeSuspender = isObj 
            ? Boolean(this.permisos.borrar) 
            : Array.isArray(this.permisos) && this.permisos.includes('usuarios:borrar');

        this.onEdit = onEdit;
        this.onDelete = onDelete;

        this._usuariosCache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="module-card" style="padding:15px; width:100%; box-sizing:border-box;">
                <h4 style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Directorio de Operadores</h4>
                <div style="width:100%; overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; min-width:450px;">
                        <thead>
                            <tr style="background:var(--table-header-bg, #f5f5f5); text-align:left; border-bottom:2px solid var(--border-color);">
                                <th style="padding:8px; color:var(--text-main);">Username</th>
                                <th style="padding:8px; color:var(--text-main);">Email</th>
                                <th style="padding:8px; color:var(--text-main);">Roles</th>
                                <th style="padding:8px; color:var(--text-main);">Estado</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-usuarios">
                            <tr><td colspan="5" style="padding:15px; text-align:center; color:var(--text-muted);">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const tbody = document.getElementById('tbody-usuarios');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                const btnEditar = e.target.closest('.btn-editar-usuario');
                const btnSuspender = e.target.closest('.btn-suspender-usuario');

                if (btnEditar && this.puedeEditar) {
                    const idUsuario = btnEditar.getAttribute('data-id');
                    const usuario = this._usuariosCache.get(idUsuario);
                    if (this.onEdit) this.onEdit(idUsuario, usuario);
                } else if (btnSuspender && this.puedeSuspender) {
                    const idUsuario = btnSuspender.getAttribute('data-id');
                    if (this.onDelete) this.onDelete(idUsuario);
                }
            }, { signal: this._abortController.signal });
        }
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-usuarios');
        if (!tbody) return;

        try {
            const resp = await adminService.listarUsuarios(50, 0, false);
            const usuarios = Array.isArray(resp) ? resp : (resp?.data || []);

            this._usuariosCache.clear();
            usuarios.forEach(u => this._usuariosCache.set(String(u.id_usuario), u));

            if (usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:var(--text-muted);">No existen usuarios registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = usuarios.map(u => {
                const nombresRoles = u.roles && Array.isArray(u.roles) 
                    ? u.roles.map(r => r.nombre_rol).join(', ') 
                    : 'N/A';

                return `
                <tr style="border-bottom:1px solid var(--border-color); ${u.is_active ? '' : 'opacity:0.6;'}">
                    <td style="padding:8px; font-family:monospace; font-weight:600; color:var(--text-main);">${u.username}</td>
                    <td style="padding:8px; color:var(--text-main);">${u.email}</td>
                    <td style="padding:8px; font-size:11px; color:var(--text-muted, #455a64);">${nombresRoles}</td>
                    <td style="padding:8px;">${u.is_active ? '<span style="color:var(--success, green); font-weight:600;">Activo</span>' : '<span style="color:var(--danger, red); font-weight:600;">Inactivo</span>'}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                            ${this.puedeEditar ? `
                                <button class="btn-editar-usuario" data-id="${u.id_usuario}" 
                                    style="background:var(--warning, #f57c00); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">
                                    Editar
                                </button>
                            ` : ''}
                            ${u.is_active && this.puedeSuspender ? `
                                <button class="btn-suspender-usuario" data-id="${u.id_usuario}" 
                                    style="background:var(--danger, #c62828); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">
                                    Suspender
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:var(--danger, red); text-align:center; padding:15px;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
    }
}