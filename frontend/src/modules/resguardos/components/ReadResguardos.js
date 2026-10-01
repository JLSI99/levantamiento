import { resguardosService } from '/src/services/resguardos.js';

export class ReadResguardos {
    constructor() {
        this.container = null;
        this.capacidadGlobal = false;
        this.puedeModificar = false;
        this.callbacks = {};
        
        this.tokenConcurrenciaId = 0;
        this.estaDesmontado = false;
        
        this.asignacionesMemoria = new Map();
        this.paginacion = { limit: 100, offset: 0 };
        this._html5QrCodeScanner = null;

        this.handleEventosTabla = this._handleEventosTabla.bind(this);
        this.handleBusqueda = this._handleBusqueda.bind(this);
    }

    async inicializar(container, capacidadGlobal, puedeModificar, callbacks) {
        this._limpiarEventos();
        
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
            <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <input type="text" id="filtro-busqueda-curp" placeholder="Filtrar por CURP, Custodio, ID Bien, Serie o Descripción..." style="flex: 1; min-width: 220px; padding: 6px 10px; border: 1px solid #bdbdbd; border-radius: 4px; font-size: 12px; font-family: monospace;">
                ${this.puedeModificar ? `
                    <button type="button" id="btn-qr-devolucion-rapida" style="background-color: #0288d1; color: white; border: none; padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
                        📷 Devolución / Escanear QR
                    </button>
                ` : ''}
            </div>

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

            <!-- Modal Escáner QR Devolución -->
            <div id="modal-scanner-devolucion" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999;">
                <div style="background:white; padding:20px; border-radius:8px; max-width:420px; width:90%; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                    <h4 style="margin-top:0; color:#0288d1; font-size:14px; font-weight:700;">Escanear QR de Bien para Devolución Rápida</h4>
                    <p style="font-size:11px; color:#555; margin-bottom:10px;">Coloque el código QR del activo devuelto frente a la cámara.</p>
                    <div id="reader-qr-devolucion" style="width:100%; min-height:250px; background:#000; margin:10px 0; border-radius:4px;"></div>
                    <button type="button" id="btn-cerrar-scanner-devolucion" style="background:#c62828; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px;">
                        Cancelar Escaneo
                    </button>
                </div>
            </div>

            <!-- Modal Acción Devolución Rápida -->
            <div id="modal-accion-devolucion" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999;">
                <div style="background:white; padding:20px; border-radius:8px; max-width:480px; width:92%; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                    <h4 style="margin-top:0; color:#00796b; font-size:15px; font-weight:700; border-bottom:1px solid #e0e0e0; padding-bottom:8px;">📦 Resguardo Encontrado - Recepción de Activo</h4>
                    <div id="modal-devolucion-contenido" style="margin:15px 0; font-size:12px; color:#37474f; line-height:1.6;"></div>
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px; border-top:1px solid #e0e0e0; padding-top:12px;">
                        <button type="button" id="btn-cerrar-modal-devolucion" style="background:#757575; color:white; border:none; padding:7px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            Cerrar
                        </button>
                        <button type="button" id="btn-editar-desde-devolucion" style="background:#1976d2; color:white; border:none; padding:7px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            ✏️ Reasignar / Editar
                        </button>
                        <button type="button" id="btn-confirmar-devolucion-rapida" style="background:#2e7d32; color:white; border:none; padding:7px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            ✓ Concluir y Devolver
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async cargarTabla(filtroBusqueda = '') {
        const tbody = this.container.querySelector('#tabla-resguardos-personales tbody');
        if (!tbody) return;

        this.tokenConcurrenciaId++;
        const currentTokenId = this.tokenConcurrenciaId;
        const columnasTotales = this.capacidadGlobal ? 7 : (this.puedeModificar ? 6 : 5);

        try {
            let respuestaBFF;
            if (this.capacidadGlobal) {
                respuestaBFF = await resguardosService.listarTodosLosResguardosInstitucionales({ 
                    limit: this.paginacion.limit, 
                    offset: this.paginacion.offset 
                });
            } else {
                respuestaBFF = await resguardosService.listarMisResguardos(this.paginacion.limit, this.paginacion.offset);
            }
            
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;

            let asignaciones = Array.isArray(respuestaBFF) ? respuestaBFF : (respuestaBFF?.data || []);

            if (filtroBusqueda.trim() !== '') {
                const query = filtroBusqueda.toUpperCase().trim();
                asignaciones = asignaciones.filter(item => {
                    const idAsignacion = String(item.id_asignacion || '').toUpperCase();
                    const idBien = String(item.bien?.id_bien || '').toUpperCase();
                    const bienSerie = String(item.bien?.serie || '').toUpperCase();
                    const bienDesc = String(item.bien?.descripcion || '').toUpperCase();
                    const curp = String(item.persona?.curp || '').toUpperCase();
                    const nombreCompleto = `${item.persona?.nombres || ''} ${item.persona?.apellidos || ''}`.toUpperCase();
                    
                    return idAsignacion.includes(query) || 
                           idBien.includes(query) || 
                           bienSerie.includes(query) || 
                           bienDesc.includes(query) || 
                           curp.includes(query) || 
                           nombreCompleto.includes(query);
                });
            }

            this.asignacionesMemoria.clear();

            if (asignaciones.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${columnasTotales}" style="text-align:center; padding:15px; color:#757575; font-weight:500;">No se encontraron registros de asignación vigentes.</td></tr>`;
                return;
            }

            tbody.innerHTML = asignaciones.map(item => {
                this.asignacionesMemoria.set(String(item.id_asignacion), item);
                return this._generarFilaTabla(item);
            }).join('');
            
        } catch (error) {
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;
            tbody.innerHTML = `<tr><td colspan="${columnasTotales}" style="text-align:center; padding:15px; color:#c62828; font-weight:600;">Error crítico: No se logró resolver la matriz de resguardos.</td></tr>`;
        }
    }

    _generarFilaTabla(item) {
        const idStr = String(item.id_asignacion);
        const bienDesc = item.bien ? `${item.bien.descripcion} [Marca: ${item.bien.marca || 'N/A'}, Modelo: ${item.bien.modelo || 'N/A'}]` : 'Sin descripción física';
        const ubicacionFisica = item.ubicacion ? `Edif. ${item.ubicacion.edificio} | Aula: ${item.ubicacion.aula} (${item.ubicacion.departamento})` : 'Ubicación no asignada';
        
        const fechaParseada = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'No timbrada';
        const custodioNombre = item.persona ? `${item.persona.apellidos}, ${item.persona.nombres} [${item.persona.curp}]` : 'No asignado';
        
        let html = `
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding:10px; font-family:monospace; color:#1a237e; font-size:11px;">${this._escapeHtml(idStr)}</td>
                ${this.capacidadGlobal ? `<td style="padding:10px; font-weight:500; color:#37474f;">${this._escapeHtml(custodioNombre)}</td>` : ''}
                <td style="padding:10px; font-weight:600; color: #212121;">${this._escapeHtml(bienDesc)}</td>
                <td style="padding:10px; color: #37474f;">${this._escapeHtml(ubicacionFisica)}</td>
                <td style="padding:10px; color: #616161;">${this._escapeHtml(fechaParseada)}</td>
                <td style="padding:10px; text-align:center;">
                    <span style="color:#00796b; font-weight:700; background-color:#e0f2f1; padding:3px 8px; border-radius:12px; font-size:10px; text-transform:uppercase;">
                        Activo (${this._escapeHtml(String(item.dias_vigencia || 0))} días)
                    </span>
                </td>
        `;

        if (this.puedeModificar) {
            html += `
                <td style="padding:10px; text-align:center;">
                    <button class="btn-editar-resguardo" data-id="${this._escapeHtml(idStr)}" style="background-color:#1976d2; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600; margin-right:4px;">Editar</button>
                    <button class="btn-liberar-resguardo" data-id="${this._escapeHtml(idStr)}" style="background-color:#f57c00; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600; margin-right:4px;">Liberar</button>
                    <button class="btn-eliminar-resguardo" data-id="${this._escapeHtml(idStr)}" style="background-color:#c62828; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600;">Borrar</button>
                </td>
            `;
        }

        html += '</tr>';
        return html;
    }

    _vincularEventos() {
        const filtroInput = this.container.querySelector('#filtro-busqueda-curp');
        if (filtroInput) {
            filtroInput.addEventListener('input', this.handleBusqueda);
        }

        const btnQr = this.container.querySelector('#btn-qr-devolucion-rapida');
        if (btnQr) {
            btnQr.addEventListener('click', () => this.iniciarEscanerCamara());
        }

        const btnCerrarScanner = this.container.querySelector('#btn-cerrar-scanner-devolucion');
        if (btnCerrarScanner) {
            btnCerrarScanner.addEventListener('click', () => this.detenerEscanerCamara());
        }

        const tabla = this.container.querySelector('#tabla-resguardos-personales');
        if (tabla && this.puedeModificar) tabla.addEventListener('click', this.handleEventosTabla);
    }

    _limpiarEventos() {
        if (!this.container) return;
        const filtroInput = this.container.querySelector('#filtro-busqueda-curp');
        if (filtroInput) filtroInput.removeEventListener('input', this.handleBusqueda);
        
        const tabla = this.container.querySelector('#tabla-resguardos-personales');
        if (tabla) tabla.removeEventListener('click', this.handleEventosTabla);
    }

    _handleBusqueda(e) {
        this.cargarTabla(e.target.value);
    }

    iniciarEscanerCamara() {
        if (!window.Html5Qrcode) {
            alert('Librería de escáner QR no disponible.');
            return;
        }

        const modalScanner = this.container.querySelector('#modal-scanner-devolucion');
        if (modalScanner) modalScanner.style.display = 'flex';

        this._html5QrCodeScanner = new window.Html5Qrcode("reader-qr-devolucion");
        this._html5QrCodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                this.detenerEscanerCamara();
                this.procesarCodigoEscaneado(decodedText);
            },
            () => {}
        ).catch(err => {
            alert('No se pudo acceder a la cámara: ' + err);
            this.detenerEscanerCamara();
        });
    }

    detenerEscanerCamara() {
        const modalScanner = this.container?.querySelector('#modal-scanner-devolucion');
        if (this._html5QrCodeScanner) {
            this._html5QrCodeScanner.stop().then(() => {
                this._html5QrCodeScanner = null;
                if (modalScanner) modalScanner.style.display = 'none';
            }).catch(() => {
                if (modalScanner) modalScanner.style.display = 'none';
            });
        } else if (modalScanner) {
            modalScanner.style.display = 'none';
        }
    }

    procesarCodigoEscaneado(codigo) {
        const query = codigo.trim().toUpperCase();
        let match = null;

        for (const [id, item] of this.asignacionesMemoria.entries()) {
            const idAsignacion = String(item.id_asignacion || '').toUpperCase();
            const idBien = String(item.bien?.id_bien || '').toUpperCase();
            const bienSerie = String(item.bien?.serie || '').toUpperCase();

            if (idAsignacion === query || idBien === query || bienSerie === query) {
                match = item;
                break;
            }
        }

        if (match) {
            this.mostrarModalDevolucion(match);
        } else {
            const filtroInput = this.container.querySelector('#filtro-busqueda-curp');
            if (filtroInput) filtroInput.value = codigo;
            this.cargarTabla(codigo);
            alert(`Filtro aplicado para el código escaneado: "${codigo}".`);
        }
    }

    mostrarModalDevolucion(item) {
        const modalAccion = this.container.querySelector('#modal-accion-devolucion');
        const contenedorContenido = this.container.querySelector('#modal-devolucion-contenido');
        if (!modalAccion || !contenedorContenido) return;

        const bienDesc = item.bien ? `${item.bien.descripcion} [Marca: ${item.bien.marca || 'N/A'}, Modelo: ${item.bien.modelo || 'N/A'}, Serie: ${item.bien.serie || 'N/A'}]` : 'Sin datos de bien';
        const custodio = item.persona ? `${item.persona.nombres} ${item.persona.apellidos} (${item.persona.curp})` : 'Sin asignar';
        const ubicacion = item.ubicacion ? `Edificio: ${item.ubicacion.edificio}, Aula: ${item.ubicacion.aula}, Depto: ${item.ubicacion.departamento}` : 'Sin ubicación';
        const fecha = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'N/A';

        contenedorContenido.innerHTML = `
            <div style="background:#f5f5f5; padding:12px; border-radius:4px; margin-bottom:10px;">
                <p style="margin:0 0 6px 0;"><strong>ID Asignación:</strong> <span style="font-family:monospace; color:#1a237e;">${this._escapeHtml(String(item.id_asignacion))}</span></p>
                <p style="margin:0 0 6px 0;"><strong>Activo / Bien:</strong> ${this._escapeHtml(bienDesc)}</p>
                <p style="margin:0 0 6px 0;"><strong>Custodio Actual:</strong> ${this._escapeHtml(custodio)}</p>
                <p style="margin:0 0 6px 0;"><strong>Ubicación Topológica:</strong> ${this._escapeHtml(ubicacion)}</p>
                <p style="margin:0;"><strong>Fecha Asignación:</strong> ${this._escapeHtml(fecha)} (${item.dias_vigencia || 0} días vigente)</p>
            </div>
            <p style="margin:0; font-size:11px; color:#2e7d32; font-weight:600;">
                ¿Desea concluir formalmente este resguardo por devolución física de activo al almacén o reasignarlo?
            </p>
        `;

        const btnConfirmar = this.container.querySelector('#btn-confirmar-devolucion-rapida');
        const btnEditar = this.container.querySelector('#btn-editar-desde-devolucion');
        const btnCerrar = this.container.querySelector('#btn-cerrar-modal-devolucion');

        const nuevoBtnConfirmar = btnConfirmar.cloneNode(true);
        const nuevoBtnEditar = btnEditar.cloneNode(true);
        const nuevoBtnCerrar = btnCerrar.cloneNode(true);

        btnConfirmar.parentNode.replaceChild(nuevoBtnConfirmar, btnConfirmar);
        btnEditar.parentNode.replaceChild(nuevoBtnEditar, btnEditar);
        btnCerrar.parentNode.replaceChild(nuevoBtnCerrar, btnCerrar);

        nuevoBtnConfirmar.addEventListener('click', async () => {
            modalAccion.style.display = 'none';
            if (this.callbacks.onRelease) {
                await this.callbacks.onRelease(String(item.id_asignacion));
            }
        });

        nuevoBtnEditar.addEventListener('click', () => {
            modalAccion.style.display = 'none';
            if (this.callbacks.onEdit) {
                this.callbacks.onEdit(item);
            }
        });

        nuevoBtnCerrar.addEventListener('click', () => {
            modalAccion.style.display = 'none';
        });

        modalAccion.style.display = 'flex';
    }

    _handleEventosTabla(e) {
        const target = e.target;
        const idStr = target.getAttribute('data-id');
        if (!idStr) return;

        if (target.classList.contains('btn-editar-resguardo')) {
            const item = this.asignacionesMemoria.get(idStr);
            if (item) this.callbacks.onEdit(item);
        } 
        else if (target.classList.contains('btn-liberar-resguardo')) {
            this.callbacks.onRelease(idStr);
        }
        else if (target.classList.contains('btn-eliminar-resguardo')) {
            this.callbacks.onDelete(idStr);
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    unmount() {
        this.estaDesmontado = true;
        this.tokenConcurrenciaId++;
        this.detenerEscanerCamara();
        this._limpiarEventos();
        this.asignacionesMemoria.clear();
        this.container = null;
    }
}