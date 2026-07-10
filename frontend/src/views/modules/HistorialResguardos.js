import { resguardosService } from '../../services/resguardos.js';

export class HistorialResguardos {
    constructor(containerId) {
        this.containerId = containerId;
        this.estaDesmontado = false;
        this.tokenConcurrenciaId = 0;
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="module-card" style="padding:20px; background:white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin-top:0; color:#1a237e; font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px; font-weight:700;">
                    Mis Resguardos y Asignaciones Vigentes
                </h3>
                <p style="font-size:12px; color:#546e7a; margin:8px 0 15px 0; font-weight: 500;">
                    Listado oficial de activos fijos del instituto asignados bajo su responsabilidad legal y resguardo patrimonial directo.
                </p>
                <div style="overflow-x:auto; border: 1px solid #e0e0e0; border-radius:4px;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;" id="tabla-resguardos-personales">
                        <thead>
                            <tr style="background-color:#f5f5f5; border-bottom: 1px solid #e0e0e0;">
                                <th style="padding:10px; color: #424242; font-weight:700;">Identificador Asignación</th>
                                <th style="padding:10px; color: #424242; font-weight:700;">Descripción del Bien Fijo</th>
                                <th style="padding:10px; color: #424242; font-weight:700;">Ubicación Topológica (Edificio - Aula - Depto)</th>
                                <th style="padding:10px; color: #424242; font-weight:700;">Fecha Asignación</th>
                                <th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Vigencia Légitima</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="5" style="text-align:center; padding:15px; color:#757575;">Estableciendo canal seguro y recuperando asignaciones...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        await this.cargarTabla();
    }

    async cargarTabla() {
        const tabla = document.getElementById('tabla-resguardos-personales');
        if (!tabla) return;
        const tbody = tabla.querySelector('tbody');
        if (!tbody) return;

        this.tokenConcurrenciaId++;
        const currentTokenId = this.tokenConcurrenciaId;

        try {
            const respuestaBFF = await resguardosService.listarMisResguardos(50, 0);
            
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;

            tbody.innerHTML = '';

            const asignaciones = Array.isArray(respuestaBFF) ? respuestaBFF : (respuestaBFF?.data || []);

            if (asignaciones.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#757575; font-weight:500;">Usted no cuenta con activos fijos asignados bajo su cargo en el ciclo actual.</td></tr>';
                return;
            }

            asignaciones.forEach(item => {
                const bienDesc = item.bien ? `${item.bien.descripcion} [Marca: ${item.bien.marca || 'N/A'}, Modelo: ${item.bien.modelo || 'N/A'}]` : 'Sin descripción física';
                const ubicacionFisica = item.ubicacion ? `Edif. ${item.ubicacion.edificio} - Aula: ${item.ubicacion.aula} (${item.ubicacion.departamento})` : 'Ubicación no asignada';
                const fechaParseada = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'No timbrada';

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e0e0e0';
                tr.innerHTML = `
                    <td style="padding:10px; font-family:monospace; color:#1a237e; font-size:11px;">${this._escapeHtml(item.id_asignacion)}</td>
                    <td style="padding:10px; font-weight:600; color: #212121;">${this._escapeHtml(bienDesc)}</td>
                    <td style="padding:10px; color: #37474f;">${this._escapeHtml(ubicacionFisica)}</td>
                    <td style="padding:10px; color: #616161;">${this._escapeHtml(fechaParseada)}</td>
                    <td style="padding:10px; text-align:center;">
                        <span style="color:#00796b; font-weight:700; background-color:#e0f2f1; padding:3px 8px; border-radius:12px; font-size:10px; text-transform:uppercase;">
                            Activo (${item.dias_vigencia} días)
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:15px; color:#c62828; font-weight:600;">Error crítico: No se logró resolver la matriz de resguardos personales. Contrato alterado.</td></tr>';
            console.error('Fallo en el mapeo de datos de resguardos desde el BFF:', error);
        }
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    unmount() {
        this.estaDesmontado = true;
        this.tokenConcurrenciaId++;
    }
}