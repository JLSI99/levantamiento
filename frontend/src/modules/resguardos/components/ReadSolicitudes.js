import { resguardosService } from '/src/services/resguardos.js';

export class ReadSolicitudes {
    constructor(modoAdmin = false) {
        this.modoAdmin = modoAdmin;
        this.container = null;
    }

    async cargarTabla(containerElement) {
        this.container = containerElement;
        this.container.innerHTML = `
            <div style="text-align:center; padding:15px; color:var(--text-muted); font-size:12px;">
                Cargando bandeja de solicitudes...
            </div>
        `;

        try {
            const response = this.modoAdmin 
                ? await resguardosService.listarTodasLasSolicitudes({ estado: 'PENDIENTE' })
                : await resguardosService.listarMisSolicitudes();

            const solicitudes = response.data || [];
            this._renderTabla(solicitudes);
        } catch (err) {
            this.container.innerHTML = `
                <div style="color:var(--danger); padding:10px; font-size:11px;">
                    Error al cargar las solicitudes: ${err.response?.data?.detail || err.message}
                </div>
            `;
        }
    }

    _renderTabla(lista) {
        if (lista.length === 0) {
            this.container.innerHTML = `
                <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:12px;">
                    No existen solicitudes de resguardo registradas en esta vista.
                </div>
            `;
            return;
        }

        let rowsHtml = lista.map(s => {
            const fechaStr = new Date(s.fecha_solicitud).toLocaleString('es-MX');
            const bienDesc = `${s.bien_solicitado} (Requerimiento)`;

            const ubiStr = `Edif. ${s.ubicacion.edificio} | Aula: ${s.ubicacion.aula} | Depto: ${s.ubicacion.departamento}`;
            
            let statusBadge = '';
            if (s.estado === 'PENDIENTE') statusBadge = '<span style="background:#fff3e0; color:#ef6c00; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">PENDIENTE</span>';
            else if (s.estado === 'APROBADA') statusBadge = '<span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">APROBADA</span>';
            else statusBadge = '<span style="background:#ffebee; color:#c62828; padding:2px 6px; border-radius:3px; font-weight:700; font-size:10px;">RECHAZADA</span>';

            const solicitanteStr = `${s.solicitante.apellidos}, ${s.solicitante.nombres}`;
            const justifStr = s.justificacion ? `<div style="font-size:10px; color:var(--text-muted); font-style:italic;">Motivo: ${s.justificacion}</div>` : '';

            return `
                <tr style="border-bottom: 1px solid var(--border-color, #eee);">
                    ${this.modoAdmin ? `<td style="padding:8px; font-weight:600;">${solicitanteStr}</td>` : ''}
                    <td style="padding:8px; font-weight:600;">
                        ${bienDesc}
                        ${justifStr}
                    </td>
                    <td style="padding:8px; font-size:11px;">${ubiStr}</td>
                    <td style="padding:8px; text-align:center;">${statusBadge}</td>
                    <td style="padding:8px; font-size:11px; text-align:center;">${fechaStr}</td>
                    ${this.modoAdmin && s.estado === 'PENDIENTE' ? `
                        <td style="padding:8px; text-align:center;">
                            <button class="btn-aprobar-sol" data-id="${s.id_solicitud}" data-bien="${s.bien_solicitado}" style="background:#2e7d32; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:10px; font-weight:600; margin-right:4px;">Aprobar y Asignar</button>
                            <button class="btn-rechazar-sol" data-id="${s.id_solicitud}" style="background:#c62828; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:10px; font-weight:600;">Rechazar</button>
                        </td>
                    ` : (this.modoAdmin ? '<td style="padding:8px; text-align:center; color:var(--text-muted); font-size:10px;">Procesada</td>' : '')}
                </tr>
            `;
        }).join('');

        this.container.innerHTML = `
            <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
                <thead>
                    <tr style="background-color:var(--table-header-bg, #f5f5f5); border-bottom:1px solid var(--border-color, #ccc);">
                        ${this.modoAdmin ? '<th style="padding:8px;">Solicitante</th>' : ''}
                        <th style="padding:8px;">Bien Necesario / Requerimiento</th>
                        <th style="padding:8px;">Ubicación Propuesta</th>
                        <th style="padding:8px; text-align:center;">Estado</th>
                        <th style="padding:8px; text-align:center;">Fecha Solicitud</th>
                        ${this.modoAdmin ? '<th style="padding:8px; text-align:center;">Dictamen</th>' : ''}
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        `;

        if (this.modoAdmin) this._bindAdminEvents();
    }

    _bindAdminEvents() {
        this.container.querySelectorAll('.btn-aprobar-sol').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const bienRequerido = btn.getAttribute('data-bien');
                const numInv = prompt(`Aprobar requerimiento "${bienRequerido}":\n\nIngrese el Número de Inventario del activo físico asignado:`);
                
                if (numInv && numInv.trim() !== '') {
                    try {
                        await resguardosService.aprobarSolicitud(id, numInv.trim());
                        alert('✅ Solicitud aprobada y resguardo formalizado correctamente.');
                        await this.cargarTabla(this.container);
                    } catch (err) {
                        alert(err.response?.data?.detail || 'Error al aprobar solicitud.');
                    }
                }
            });
        });

        this.container.querySelectorAll('.btn-rechazar-sol').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const motivo = prompt('Escriba el motivo o justificación del rechazo:');
                if (motivo && motivo.trim() !== '') {
                    try {
                        await resguardosService.rechazarSolicitud(id, motivo.trim());
                        await this.cargarTabla(this.container);
                    } catch (err) {
                        alert(err.response?.data?.detail || 'Error al rechazar solicitud.');
                    }
                }
            });
        });
    }
}