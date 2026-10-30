import { ubicacionesService } from '/src/services/ubicaciones.js';
import { ReadAulas } from '/src/modules/ubicaciones/components/aulasComponents/ReadAulas.js';

export class ReadEdificios {
    constructor(tableContainerId, permisos) {
        this.tableContainerId = tableContainerId;
        this.permisos = permisos || {};
        
        const isObj = typeof this.permisos === 'object' && !Array.isArray(this.permisos);
        this.puedeEditar = isObj ? Boolean(this.permisos.editar) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:editar');
        this.puedeBorrar = isObj ? Boolean(this.permisos.borrar) : Array.isArray(this.permisos) && this.permisos.includes('ubicaciones:borrar');
    }

    renderStructure() {
        const container = document.getElementById(this.tableContainerId);
        if (!container) return;

        container.innerHTML = `
            <div style="width:100%; box-sizing:border-box;">
                <h4 style="margin-top:0; color:var(--text-main, #424242); font-size:14px; font-weight:700; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Catálogo de Infraestructura Físico-Topológica</h4>
                <div style="width:100%; overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; background:var(--bg-card, white); min-width:450px;">
                        <thead>
                            <tr style="background:var(--table-header-bg, #f5f5f5); text-align:left; border-bottom:2px solid var(--border-color);">
                                <th style="padding:8px; color:var(--text-main);">Clave / ID</th>
                                <th style="padding:8px; color:var(--text-main);">Edificio / Nombre</th>
                                <th style="padding:8px; color:var(--text-main);">Espacios / Aulas Adscritas</th>
                                <th style="padding:8px; text-align:center; color:var(--text-main);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-edificios">
                            <tr><td colspan="4" style="padding:15px; text-align:center; color:var(--text-muted);">Cargando catálogo...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async cargarDatos(cacheMap, onEdificiosLoaded) {
        const tbody = document.getElementById('tbody-edificios');
        if (!tbody) return;

        try {
            const resp = await ubicacionesService.listarEdificios(50, 0, false);
            const edificios = Array.isArray(resp) ? resp : (resp?.data || []);

            cacheMap.clear();
            edificios.forEach(e => cacheMap.set(e.id_edificio, e));

            if (onEdificiosLoaded) {
                onEdificiosLoaded(edificios);
            }

            if (edificios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">No hay edificios registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = edificios.map(e => {
                const aulasList = ReadAulas.renderBadges(e.aulas, e.id_edificio, this.puedeEditar, this.puedeBorrar);

                return `
                    <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:8px; font-family:monospace; font-weight:600; color:var(--text-muted, #555);">${e.clave || e.id_edificio.substring(0, 8)}</td>
                        <td style="padding:8px; font-weight:600; color:var(--text-main, #212121);">${e.nombre}</td>
                        <td style="padding:8px; color:var(--text-main);">${aulasList}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                                ${this.puedeEditar ? `
                                    <button class="btn-editar-edificio" data-id="${e.id_edificio}" 
                                        style="background:var(--warning, #f57c00); color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-size:11px; font-weight:600;">
                                        Editar
                                    </button>
                                ` : ''}
                                ${e.is_active && this.puedeBorrar ? `
                                    <button class="btn-borrar-edificio" data-id="${e.id_edificio}" 
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
            tbody.innerHTML = '<tr><td colspan="4" style="color:var(--danger, red); padding:15px; text-align:center;">Error al recuperar catálogo topológico</td></tr>';
        }
    }
}