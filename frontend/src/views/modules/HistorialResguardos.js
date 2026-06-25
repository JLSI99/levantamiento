import { resguardosService } from '../../services/resguardos.js';
import { guardElement } from '../../components/CanRender.js';

export function crearModuloHistorialResguardos() {
    const widget = document.createElement('section');
    widget.className = 'widget-box';
    widget.innerHTML = `
        <h3>Matriz Global de Resguardos Institucionales</h3>
        <div id="tabla-resguardos-loader" style="font-size: 13px; color: var(--text-muted);">Consultando ms-resguardos...</div>
        <div class="table-responsive" style="max-height: 300px; overflow-y: auto; display:none;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border); background-color: var(--bg-main);">
                        <th style="padding: 8px;">Activo ID</th>
                        <th style="padding: 8px;">CURP Resguardatario</th>
                        <th style="padding: 8px;">Estatus</th>
                    </tr>
                </thead>
                <tbody id="resguardos-rows-target"></tbody>
            </table>
        </div>
    `;

    const loader = widget.querySelector('#tabla-resguardos-loader');
    const tableContainer = widget.querySelector('.table-responsive');
    const rowsTarget = widget.querySelector('#resguardos-rows-target');

    (async () => {
        try {
            const resguardosData = await resguardosService.listarTodosLosResguardosInstitucionales({
                limit: 20,
                offset: 0,
                soloVigentes: false
            });

            loader.style.display = 'none';
            tableContainer.style.display = 'block';
            rowsTarget.innerHTML = '';

            if (!resguardosData || resguardosData.length === 0) {
                rowsTarget.innerHTML = `<tr><td colspan="3" style="padding: 10px; text-align: center; color: var(--text-muted);">No existen contratos de resguardo activos.</td></tr>`;
                return;
            }

            resguardosData.forEach(resguardo => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid var(--border)';
                row.innerHTML = `
                    <td style="padding: 8px; font-family: monospace;">${resguardo.id_bien || 'N/A'}</td>
                    <td style="padding: 8px;">${resguardo.curp_resguardatario || resguardo.curp || 'N/A'}</td>
                    <td style="padding: 8px;">
                        <span class="${resguardo.esta_activo ? 'text-success' : 'text-error'}">
                            ${resguardo.esta_activo ? 'Vigente' : 'Concluido'}
                        </span>
                    </td>
                `;
                rowsTarget.appendChild(row);
            });
        } catch (error) {
            loader.className = 'text-error';
            loader.textContent = 'Error al consultar la matriz de resguardos distributed.';
        }
    })();

    return guardElement('OP_LEER_RESGUARDOS', widget);
}