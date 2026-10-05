import { ubicacionesService } from '/src/services/ubicaciones.js';
import { ReadAulas } from '/src/modules/ubicaciones/components/aulasComponents/ReadAulas.js';

export class ReadEdificios {
    constructor(tableContainerId, permisos) {
        this.tableContainerId = tableContainerId;
        this.permisos = permisos || {};
        this.puedeEditar = this.permisos.editar || false;
        this.puedeBorrar = this.permisos.borrar || false;
    }

    renderStructure() {
        const container = document.getElementById(this.tableContainerId);
        if (!container) return;

        container.innerHTML = `
            <h4 style="margin-top:0; color:#424242;">Catálogo de Infraestructura Físico-Topológica</h4>
            <table style="width:100%; border-collapse:collapse; font-size:12px; background:white;">
                <thead>
                    <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                        <th style="padding:8px;">Clave / ID</th>
                        <th style="padding:8px;">Edificio / Nombre</th>
                        <th style="padding:8px;">Espacios / Aulas Adscritas</th>
                        <th style="padding:8px; text-align:center;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="tbody-edificios">
                    <tr><td colspan="4" style="padding:15px; text-align:center;">Cargando catálogo...</td></tr>
                </tbody>
            </table>
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
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">No hay edificios registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = edificios.map(e => {
                const aulasList = ReadAulas.renderBadges(e.aulas, e.id_edificio, this.puedeEditar, this.puedeBorrar);

                return `
                    <tr style="border-bottom:1px solid #e0e0e0;">
                        <td style="padding:8px; font-family:monospace; font-weight:600; color:#555;">${e.clave || e.id_edificio.substring(0, 8)}</td>
                        <td style="padding:8px; font-weight:600; color:#212121;">${e.nombre}</td>
                        <td style="padding:8px;">${aulasList}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center;">
                                ${this.puedeEditar ? `
                                    <button class="btn-editar-edificio" data-id="${e.id_edificio}" 
                                        style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                        Editar
                                    </button>
                                ` : ''}
                                ${e.is_active && this.puedeBorrar ? `
                                    <button class="btn-borrar-edificio" data-id="${e.id_edificio}" 
                                        style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                        Dar Baja
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red; padding:15px; text-align:center;">Error al recuperar catálogo topológico</td></tr>';
        }
    }
}