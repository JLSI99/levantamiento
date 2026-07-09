import { resguardosService } from '../../services/resguardos.js';

export class HistorialResguardos {
    constructor(containerId) {
        this.containerId = containerId;
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="wizard-container" style="padding:15px; background:white;">
                <p style="font-size:12px; color:var(--text-muted); margin:0 0 15px 0;">Actas de resguardo vigentes asignadas bajo su resguardo directo o departamento.</p>
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px;" id="tabla-resguardos-personales">
                        <thead>
                            <tr style="background-color:var(--bg-main); text-align:left;">
                                <th style="padding:8px; border:1px solid var(--border-color);">Código Activo</th>
                                <th style="padding:8px; border:1px solid var(--border-color);">Descripción del Bien</th>
                                <th style="padding:8px; border:1px solid var(--border-color);">Fecha de Timbrado</th>
                                <th style="padding:8px; border:1px solid var(--border-color);">Estado Legal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td colspan="4" style="text-align:center; padding:10px; color:var(--text-muted);">Consultando asignaciones...</td></tr>
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

        try {
            const datos = await resguardosService.listarMisResguardos(50, 0);
            tbody.innerHTML = '';

            if (datos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--text-muted);">No cuenta con activos fijos asignados bajo su CURP.</td></tr>';
                return;
            }

            datos.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:8px; border:1px solid var(--border-color); font-family:monospace; font-weight:bold; color:var(--primary);">${this._escapeHtml(item.bien_codigo)}</td>
                    <td style="padding:8px; border:1px solid var(--border-color);">${this._escapeHtml(item.bien_descripcion)}</td>
                    <td style="padding:8px; border:1px solid var(--border-color);">${new Date(item.fecha_asignacion).toLocaleDateString('es-MX')}</td>
                    <td style="padding:8px; border:1px solid var(--border-color);">
                        <span style="color:var(--success); font-weight:600; background-color:#e0f2f1; padding:2px 6px; border-radius:10px;">${item.vigente ? 'Vigente' : 'Concluido'}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--text-error); font-weight:600;">Error de interconexión con el subdominio de resguardos</td></tr>';
            }
        }
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    unmount() {
    
    }
}