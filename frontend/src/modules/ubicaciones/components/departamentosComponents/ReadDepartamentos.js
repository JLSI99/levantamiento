import { ubicacionesService } from '/src/services/ubicaciones.js';

export class ReadDepartamentos {
    constructor(permisos) {
        this.permisos = permisos || {};
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj ? Boolean(this.permisos.editar) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:editar');
        this.puedeBorrar = isObj ? Boolean(this.permisos.borrar) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:borrar');
    }

    renderTableHTML() {
        return `
            <h4 style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Estructura Organizacional Institucional</h4>
            <div style="width:100%; overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; background:var(--bg-card, white); min-width:450px;">
                    <thead>
                        <tr style="background:var(--table-header-bg, #f5f5f5); text-align:left; border-bottom:2px solid var(--border-color);">
                            <th style="padding:8px; color:var(--text-main);">Nombre del Departamento</th>
                            <th style="padding:8px; color:var(--text-main);">Jefe Adscrito (Responsable)</th>
                            <th style="padding:8px; color:var(--text-main);">Estado</th>
                            <th style="padding:8px; text-align:center; color:var(--text-main);">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-departamentos">
                        <tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-muted);">Cargando organigrama...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    async cargarDatos(cacheMap) {
        const tbody = document.getElementById('tbody-departamentos');
        if (!tbody) return;

        try {
            const resp = await ubicacionesService.listarDepartamentos(50, 0, false);
            const deptos = Array.isArray(resp) ? resp : (resp?.data || []);

            cacheMap.clear();
            deptos.forEach(d => cacheMap.set(d.id_departamento, d));

            if (deptos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">No hay departamentos registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = deptos.map(d => {
                const jefe = d.jefe_departamento;
                const nombreJefe = jefe 
                    ? `${jefe.nombres || ''} ${jefe.apellidos || ''}`.trim() 
                    : 'Sin asignar';

                return `
                    <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:8px; font-weight:600; color:var(--text-main);">${d.nombre}</td>
                        <td style="padding:8px; color:var(--text-muted, #37474f);">
                            <div style="font-weight:600; color:var(--primary, #1a237e);">${nombreJefe}</div>
                            <small style="font-family:monospace; color:var(--text-muted, #757575);">CURP: ${d.curp_jefe_departamento || 'N/D'}</small>
                        </td>
                        <td style="padding:8px;">${d.is_active ? '<span style="color:var(--success, green); font-weight:600;">Activo</span>' : '<span style="color:var(--danger, red); font-weight:600;">Inactivo</span>'}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                                ${this.puedeEditar ? `
                                    <button class="btn-editar-depto" data-id="${d.id_departamento}" 
                                        style="background:var(--warning, #f57c00); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">
                                        Editar
                                    </button>
                                ` : ''}
                                ${d.is_active && this.puedeBorrar ? `
                                    <button class="btn-borrar-depto" data-id="${d.id_departamento}" 
                                        style="background:var(--danger, #c62828); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">
                                        Dar Baja
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:var(--danger, red); padding:15px; text-align:center;">Error al recuperar organigrama departamental</td></tr>';
        }
    }
}