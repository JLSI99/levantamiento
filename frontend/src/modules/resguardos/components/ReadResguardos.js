import { resguardosService } from '../../../services/resguardos.js';

export class ReadResguardos {
    constructor() {
        this.container = null;
        this.capacidadGlobal = false;
        this.puedeModificar = false;
        this.callbacks = {};
        this.tokenConcurrenciaId = 0;
        this.estaDesmontado = false;

        this.handleEventosTabla = this._handleEventosTabla.bind(this);
        this.handleBusqueda = this._handleBusqueda.bind(this);
    }

    async inicializar(container, capacidadGlobal, puedeModificar, callbacks) {
        this.container = container;
        this.capacidadGlobal = capacidadGlobal;
        this.puedeModificar = puedeModificar;
        this.callbacks = callbacks;

        this.container.innerHTML = this._obtenerPlantillaLectura();
        this._vincularEventos();
        
        await this.cargarTabla();
    }

    _obtenerPlantillaLectura() {
        return `
            ${this.capacidadGlobal ? `
            <div style="margin-bottom: 15px; display: flxex; gap: 10px;">
                <input type="text" id="filtro-busqueda-curp" placeholder="Filtrar unívocamente por CURP o Nombre del Responsable..." style="flex: 1; padding: 6px 10px; border: 1px solid #bdbdbd; border-radius: 4px; font-size: 12px; font-family: monospace;">
            </div>` : ''}
            <div style="overflow-x:auto; border: 1px solid #e0e0e0; border-radius:4px;">
                <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;" id="tabla-resguardos-personales">
                    <thead>
                        <tr style="background-color:#f5f5f5; border-bottom: 1px solid #e0e0e0;">
                            <th style="padding:10px; color: #424242; font-weight:700;">Identificador Asignación</th>
                            ${this.capacidadGlobal ? '<th style="padding:10px; color: #424242; font-weight:700;">Custodio / Responsable</th>' : ''}
                            <th style="padding:10px; color: #424242; font-weight:700;">Descripción del Bien Fijo</th>
                            <th style="padding:10px; color: #424242; font-weight:700;">Ubicación Topológica</th>
                            <th style="padding:10px; color: #424242; font-weight:700;">Fecha Asignación</th>
                            <th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Vigencia</th>
                            ${this.puedeModificar ? '<th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Operaciones</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="${this.capacidadGlobal ? '7' : (this.puedeModificar ? '6' : '5')}" style="text-align:center; padding:15px; color:#757575;">Estableciendo canal seguro y recuperando asignaciones...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    async cargarTabla(filtroCurp = '') {
        const tbody = this.container.querySelector('#tabla-resguardos-personales tbody');
        if (!tbody) return;

        this.tokenConcurrenciaId++;
        const currentTokenId = this.tokenConcurrenciaId;
        const columnasTotales = this.capacidadGlobal ? 7 : (this.puedeModificar ? 6 : 5);

        try {
            let respuestaBFF;
            if (this.capacidadGlobal) {
                respuestaBFF = await resguardosService.listarTodosLosResguardosInstitucionales({ limit: 100, offset: 0 });
            } else {
                respuestaBFF = await resguardosService.listarMisResguardos(50, 0);
            }
            
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;

            let asignaciones = Array.isArray(respuestaBFF) ? respuestaBFF : (respuestaBFF?.data || []);

            if (this.capacidadGlobal && filtroCurp.trim() !== '') {
                const query = filtroCurp.toUpperCase().trim();
                asignaciones = asignaciones.filter(item => 
                    item.persona?.curp?.toUpperCase().includes(query) ||
                    `${item.persona?.nombres} ${item.persona?.apellidos}`.toUpperCase().includes(query)
                );
            }

            if (asignaciones.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${columnasTotales}" style="text-align:center; padding:15px; color:#757575; font-weight:500;">No se encontraron registros de asignación vigentes.</td></tr>`;
                return;
            }

            tbody.innerHTML = asignaciones.map(item => this._generarFilaTabla(item)).join('');
            
        } catch (error) {
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;
            tbody.innerHTML = `<tr><td colspan="${columnasTotales}" style="text-align:center; padding:15px; color:#c62828; font-weight:600;">Error crítico: No se logró resolver la matriz de resguardos.</td></tr>`;
        }
    }

    _generarFilaTabla(item) {
        const bienDesc = item.bien ? `${item.bien.descripcion} [Marca: ${item.bien.marca || 'N/A'}, Modelo: ${item.bien.modelo || 'N/A'}]` : 'Sin descripción física';
        const ubicacionFisica = item.ubicacion ? `Edif. ${item.ubicacion.edificio} - Aula: ${item.ubicacion.aula} (${item.ubicacion.departamento})` : 'Ubicación no asignada';
        const fechaParseada = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'No timbrada';
        const custodioNombre = item.persona ? `${item.persona.apellidos}, ${item.persona.nombres} [${item.persona.curp}]` : 'No asignado';
        
        const itemDataJSON = this._escapeHtml(JSON.stringify(item));

        let html = `
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding:10px; font-family:monospace; color:#1a237e; font-size:11px;">${this._escapeHtml(item.id_asignacion)}</td>
                ${this.capacidadGlobal ? `<td style="padding:10px; font-weight:500; color:#37474f;">${this._escapeHtml(custodioNombre)}</td>` : ''}
                <td style="padding:10px; font-weight:600; color: #212121;">${this._escapeHtml(bienDesc)}</td>
                <td style="padding:10px; color: #37474f;">${this._escapeHtml(ubicacionFisica)}</td>
                <td style="padding:10px; color: #616161;">${this._escapeHtml(fechaParseada)}</td>
                <td style="padding:10px; text-align:center;">
                    <span style="color:#00796b; font-weight:700; background-color:#e0f2f1; padding:3px 8px; border-radius:12px; font-size:10px; text-transform:uppercase;">
                        Activo (${item.dias_vigencia} días)
                    </span>
                </td>
        `;

        if (this.puedeModificar) {
            html += `
                <td style="padding:10px; text-align:center;">
                    <button class="btn-editar-resguardo" data-item="${itemDataJSON}" style="background-color:#1976d2; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600; margin-right:4px;">Editar</button>
                    <button class="btn-liberar-resguardo" data-id="${item.id_asignacion}" style="background-color:#f57c00; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600; margin-right:4px;">Liberar</button>
                    <button class="btn-eliminar-resguardo" data-id="${item.id_asignacion}" style="background-color:#c62828; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600;">Borrar</button>
                </td>
            `;
        }

        html += '</tr>';
        return html;
    }

    _vincularEventos() {
        const filtroInput = this.container.querySelector('#filtro-busqueda-curp');
        if (filtroInput) filtroInput.addEventListener('input', this.handleBusqueda);

        const tabla = this.container.querySelector('#tabla-resguardos-personales');
        if (tabla && this.puedeModificar) tabla.addEventListener('click', this.handleEventosTabla);
    }

    handleBusqueda(e) {
        this.cargarTabla(e.target.value);
    }

    _handleEventosTabla(e) {
        const target = e.target;
        if (target.classList.contains('btn-editar-resguardo')) {
            const itemDataRaw = target.getAttribute('data-item');
            if (itemDataRaw) {
                const item = JSON.parse(this._unescapeHtml(itemDataRaw));
                this.callbacks.onEdit(item);
            }
        } 
        else if (target.classList.contains('btn-liberar-resguardo')) {
            this.callbacks.onRelease(target.getAttribute('data-id'));
        }
        else if (target.classList.contains('btn-eliminar-resguardo')) {
            this.callbacks.onDelete(target.getAttribute('data-id'));
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    _unescapeHtml(str) {
        if (!str) return '';
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    }

    unmount() {
        this.estaDesmontado = true;
        this.tokenConcurrenciaId++;
        if (!this.container) return;

        const filtroInput = this.container.querySelector('#filtro-busqueda-curp');
        if (filtroInput) filtroInput.removeEventListener('input', this.handleBusqueda);
        
        const tabla = this.container.querySelector('#tabla-resguardos-personales');
        if (tabla) tabla.removeEventListener('click', this.handleEventosTabla);
    }
}