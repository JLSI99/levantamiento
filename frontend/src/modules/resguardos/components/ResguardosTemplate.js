export const ResguardosTemplate = {
    obtenerEstructuraPrincipal(capacidadGlobal, puedeModificar) {
        return `
            <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                ${puedeModificar ? `
                    <button type="button" id="btn-qr-devolucion-rapida" style="background-color: #0288d1; color: white; border: none; padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        📷 Devolución / Escanear QR
                    </button>
                ` : ''}

                <input type="text" id="filtro-busqueda-curp" placeholder="Filtrar por CURP, Custodio, No. Inventario, Serie..." style="flex: 1; min-width: 200px; padding: 6px 10px; border: 1px solid #bdbdbd; border-radius: 4px; font-size: 12px; font-family: monospace; box-sizing:border-box;">
                
                ${capacidadGlobal ? `
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button type="button" id="btn-orden-custodio" style="background: #f5f5f5; color: #333; border: 1px solid #bdbdbd; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                            Ordenar por Custodio ↕
                        </button>
                    </div>

                    <div style="position:relative; width: 190px;" id="dropdown-filtro-deptos-container">
                        <div id="dropdown-filtro-deptos-toggle-btn" style="height:32px; padding:0 8px; border:1px solid #bdbdbd; border-radius:4px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12px; box-sizing:border-box; overflow:hidden;">
                            <div id="dropdown-filtro-deptos-placeholder" style="display:flex; gap:4px; align-items:center; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; flex:1;">
                                <span style="color:#757575;">-- Filtrar Deptos --</span>
                            </div>
                            <span style="font-size:10px; color:#555; margin-left:6px; flex-shrink:0;">▼</span>
                        </div>
                        <div id="dropdown-filtro-deptos-panel" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:180px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-top:none; border-radius:0 0 4px 4px; z-index:100; box-shadow:0 4px 6px rgba(0,0,0,0.1); box-sizing:border-box;">
                            <div id="dropdown-filtro-deptos-options-list" style="padding:4px 0;"></div>
                        </div>
                    </div>

                    <div style="position:relative; width: 180px;" id="dropdown-filtro-edificios-container">
                        <div id="dropdown-filtro-edificios-toggle-btn" style="height:32px; padding:0 8px; border:1px solid #bdbdbd; border-radius:4px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12px; box-sizing:border-box; overflow:hidden;">
                            <div id="dropdown-filtro-edificios-placeholder" style="display:flex; gap:4px; align-items:center; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; flex:1;">
                                <span style="color:#757575;">-- Filtrar Edificios --</span>
                            </div>
                            <span style="font-size:10px; color:#555; margin-left:6px; flex-shrink:0;">▼</span>
                        </div>
                        <div id="dropdown-filtro-edificios-panel" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:180px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-top:none; border-radius:0 0 4px 4px; z-index:100; box-shadow:0 4px 6px rgba(0,0,0,0.1); box-sizing:border-box;">
                            <div id="dropdown-filtro-edificios-options-list" style="padding:4px 0;"></div>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div style="overflow-x:auto; border: 1px solid #e0e0e0; border-radius:4px;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;" id="tabla-resguardos-personales">
                    <thead>
                        <tr style="background-color:#f5f5f5; border-bottom: 1px solid #e0e0e0;">
                            ${capacidadGlobal ? '<th style="padding:10px; color: #424242; font-weight:700;">Custodio / Responsable</th>' : ''}
                            <th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Descripción del Bien Fijo</th>
                            <th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Ubicación Topológica</th>
                            <th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Fecha Asignación</th>
                            ${puedeModificar ? '<th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Operaciones</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${capacidadGlobal ? '5' : (puedeModificar ? '4' : '3')}" style="text-align:center; padding:15px; color:#757575;">Estableciendo canal seguro y recuperando asignaciones...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    },

    generarFila(item, capacidadGlobal, peutModifier) {
        const idStr = String(item.id_asignacion);
        const numeroInv = item.bien?.numero_inventario ? `[Inv: ${item.bien.numero_inventario}]` : '';
        const bienDesc = item.bien ? `${item.bien.descripcion} ${numeroInv} [Marca: ${item.bien.marca || 'N/A'}, Modelo: ${item.bien.modelo || 'N/A'}]` : 'Sin descripción física';
        
        const ubicacionFisica = item.ubicacion ? `Edif. ${item.ubicacion.edificio} | Aula: ${item.ubicacion.aula}` : 'Ubicación no asignada';
        const fechaParseada = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'No timbrada';
        const custodioNombre = item.persona ? `${item.persona.apellidos}, ${item.persona.nombres} [${item.persona.curp}]` : 'No asignado';
        
        let html = `
            <tr style="border-bottom: 1px solid #e0e0e0;">
                ${capacidadGlobal ? `<td style="padding:10px; font-weight:500; color:#37474f;">${custodioNombre}</td>` : ''}
                <td style="padding:10px; font-weight:600; color: #212121;">${bienDesc}</td>
                <td style="padding:10px; color: #37474f;">${ubicacionFisica}</td>
                <td style="padding:10px; color: #616161;">${fechaParseada}</td>
        `;

        if (peutModifier) {
            html += `
                <td style="padding:10px; text-align:center;">
                    <button class="btn-editar-resguardo" data-id="${idStr}" style="background-color:#1976d2; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600; margin-right:4px;">Editar</button>
                    <button class="btn-liberar-resguardo" data-id="${idStr}" style="background-color:#f57c00; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600; margin-right:4px;">Liberar</button>
                    <button class="btn-eliminar-resguardo" data-id="${idStr}" style="background-color:#c62828; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600;">Borrar</button>
                </td>
            `;
        }

        html += '</tr>';
        return html;
    }
};