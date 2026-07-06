import { resguardosService } from '../../services/resguardos.js';
import { guardElement } from '../../components/CanRender.js';

export function crearModuloHistorialResguardos(state) {
    const widget = document.createElement('section');
    widget.className = 'widget-box';
    
    const esResguardantePuro = state.roles.includes('Resguardante');
    const puedeEmitirResguardos = state.capabilities.includes('resguardos:crear');
    const curpPropia = state.usuario?.curp || null;

    widget.innerHTML = `
        <h3>Matriz de Resguardos Institucionales</h3>
        ${puedeEmitirResguardos ? `
            <div id="form-emision-resguardo-container" style="margin-bottom: 20px; padding: 10px; border: 1px dashed var(--border); border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; font-size: 13px;">Asignación Jurídica de Custodia (Levantamiento)</h4>
                <form id="form-crear-resguardo" style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <input type="text" id="res-id-bien" placeholder="ID del Bien" required style="flex: 1; min-width: 120px; font-size: 12px; padding: 4px;">
                    <input type="text" id="res-curp" placeholder="CURP del Resguardatario" required maxlength="18" style="flex: 1; min-width: 150px; font-size: 12px; padding: 4px;">
                    <button type="submit" style="font-size: 12px; padding: 4px 10px;">Emitir Acta</button>
                </form>
                <div id="emision-feedback" style="font-size:11px; margin-top:5px;"></div>
            </div>
        ` : ''}
        <div id="tabla-resguardos-loader" style="font-size: 13px; color: var(--text-muted);">Consultando ms-resguardos...</div>
        <div class="table-responsive" style="max-height: 250px; overflow-y: auto; display:none;">
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

    if (puedeEmitirResguardos) {
        widget.querySelector('#form-crear-resguardo').onsubmit = async (e) => {
            e.preventDefault();
            const fback = widget.querySelector('#emision-feedback');
            const idBien = widget.querySelector('#res-id-bien').value;
            const curpTarget = widget.querySelector('#res-curp').value.toUpperCase();

            try {
                fback.className = 'text-success';
                fback.textContent = 'Procesando firma y asignación...';
                
                await resguardosService.crearAsignacion({ id_bien: idBien, curp_resguardatario: curpTarget });
                
                fback.textContent = 'Contrato de resguardo generado exitosamente.';
                e.target.reset();
                cargarDatosTabla();
            } catch (err) {
                fback.className = 'text-error';
                fback.textContent = `Error: ${err.response?.data?.detail || err.message}`;
            }
        };
    }

    async function cargarDatosTabla() {
        try {
            let resguardosData = await resguardosService.listarTodosLosResguardosInstitucionales({
                limit: 50,
                offset: 0,
                soloVigentes: false
            });

            loader.style.display = 'none';
            tableContainer.style.display = 'block';
            rowsTarget.innerHTML = '';

            if (esResguardantePuro && curpPropia) {
                resguardosData = resguardosData.filter(r => {
                    const targetCurp = r.curp_resguardatario || r.curp;
                    return targetCurp && targetCurp.toUpperCase() === curpPropia.toUpperCase();
                });
            }

            if (!resguardosData || resguardosData.length === 0) {
                rowsTarget.innerHTML = `<tr><td colspan="3" style="padding: 10px; text-align: center; color: var(--text-muted);">No posee contratos de resguardo asignados actualmente.</td></tr>`;
                return;
            }

            resguardosData.forEach(resguardo => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid var(--border)';
                
                const curpVisual = resguardo.curp_resguardatario || resguardo.curp || 'N/A';
                
                row.innerHTML = `
                    <td style="padding: 8px; font-family: monospace;">${resguardo.id_bien || 'N/A'}</td>
                    <td style="padding: 8px;">${curpVisual}</td>
                    <td style="padding: 8px;">
                        <span class="${resguardo.esta_activo ? 'text-success' : 'text-error'}" style="font-weight: bold;">
                            ${resguardo.esta_activo ? 'Vigente' : 'Concluido'}
                        </span>
                    </td>
                `;
                rowsTarget.appendChild(row);
            });
        } catch (error) {
            loader.className = 'text-error';
            loader.textContent = 'Error al consultar la matriz de resguardos distribuida.';
        }
    }

    cargarDatosTabla();

    return guardElement('resguardos:leer', widget, false);
}