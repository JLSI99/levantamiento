import { ubicacionesService } from '/src/services/ubicaciones.js';

export class ReadDepartamentos {
    constructor(permisos) {
        this.permisos = permisos || {};
        this.puedeEditar = this.permisos.editar || false;
        this.puedeBorrar = this.permisos.borrar || false;
    }

    renderTableHTML() {
        return `
            <h4 style="margin-top:0; color:#424242;">Estructura Organizacional Institucional</h4>
            <table style="width:100%; border-collapse:collapse; font-size:12px; background:white;">
                <thead>
                    <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                        <th style="padding:8px;">Nombre del Departamento</th>
                        <th style="padding:8px;">CURP Jefe Adscrito</th>
                        <th style="padding:8px;">Estado</th>
                        <th style="padding:8px; text-align:center;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-departamentos">
                    <tr><td colspan="4" style="padding:15px; text-align:center;">Cargando organigrama...</td></tr>
                </tbody>
            </table>
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
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">No hay departamentos registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = deptos.map(d => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-weight:600; color:#212121;">${d.nombre}</td>
                    <td style="padding:8px; font-family:monospace; color:#37474f;">${d.curp_jefe_departamento}</td>
                    <td style="padding:8px;">${d.is_active ? '<span style="color:green; font-weight:600;">Activo</span>' : '<span style="color:red; font-weight:600;">Inactivo</span>'}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:4px; justify-content:center;">
                            ${this.puedeEditar ? `
                                <button class="btn-editar-depto" data-id="${d.id_departamento}" 
                                    style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Editar
                                </button>
                            ` : ''}
                            ${d.is_active && this.puedeBorrar ? `
                                <button class="btn-borrar-depto" data-id="${d.id_departamento}" 
                                    style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Dar Baja
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red; padding:15px; text-align:center;">Error al recuperar organigrama departamental</td></tr>';
        }
    }
}