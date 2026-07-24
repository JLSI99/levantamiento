import authStore from '../../store/authStore.js';
import { resguardosService } from '../../services/resguardos.js';
import { SelectorUbicaciones } from '../../components/SelectorUbicaciones.js';

export class HistorialResguardos {
    constructor(containerId) {
        this.containerId = containerId;
        this.estaDesmontado = false;
        this.tokenConcurrenciaId = 0;
        this.onFiltroInputBound = null;
        this.onAccionesClickBound = null;
        this.onFormSubmitBound = null;
        this.capacidadGlobal = false;
        
        this.selectorUbicaciones = null;
        this.ubicacionActual = null;
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const state = authStore.getSnapshot();
        if (!state || !state.isAuthenticated || !state.user) {
            this._renderizarBloqueo403(container, "Identidad no verificada. Inicie sesión para establecer canal patrimonial seguro.");
            return;
        }

        const permisos = state.capabilities || [];
        
        const puedeListarTodo = permisos.includes('resguardos:leer') || permisos.includes('resguardos:crear');
        const puedeListarPropios = permisos.includes('resguardos:leer');
        const puedeModificar = permisos.includes('resguardos:liberar') || permisos.includes('resguardos:crear') || permisos.includes('resguardos:write');

        if (!puedeListarTodo && !puedeListarPropios) {
            this._renderizarBloqueo403(container, "Acceso Denegado: Su perfil no cuenta con capacidades explícitas de lectura en la matriz de resguardos patrimoniales.");
            return;
        }

        this.capacidadGlobal = puedeListarTodo;

        container.innerHTML = `
            <div class="module-card" style="padding:20px; background:white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin-top:0; color:#1a237e; font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px; font-weight:700;">
                    ${this.capacidadGlobal ? 'Panel Maestro de Custodia e Inventario Institucional' : 'Mis Resguardos y Asignaciones Vigentes'}
                </h3>
                <p style="font-size:12px; color:#546e7a; margin:8px 0 15px 0; font-weight: 500;">
                    ${this.capacidadGlobal ? 'Consola global de fiscalización, liberación, y timbrado de actas de resguardo.' : 'Listado oficial de activos asignados bajo su responsabilidad legal.'}
                </p>
                
                ${this.capacidadGlobal && puedeModificar ? `
                <div style="background:#f8f9fa; padding:15px; border:1px solid #e0e0e0; border-radius:4px; margin-bottom:20px;">
                    <h4 style="margin:0 0 10px 0; font-size:13px; color:#37474f;">Nueva Asignación de Resguardo</h4>
                    <form id="form-crear-resguardo">
                        <div style="display:flex; gap:15px; margin-bottom:10px;">
                            <div style="flex:1;">
                                <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">ID del Bien (UUID) *</label>
                                <input type="text" name="id_bien" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                            </div>
                            <div style="flex:1;">
                                <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">CURP del Responsable *</label>
                                <input type="text" name="curp" required maxlength="18" minlength="18" class="input-monospace" placeholder="18 caracteres" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; text-transform:uppercase;">
                            </div>
                        </div>
                        <div id="contenedor-selector-ubicacion-resguardo"></div>
                        <button type="submit" id="btn-crear-resguardo" style="background:#00796b; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; margin-top:5px;">
                            Emitir Acta de Resguardo
                        </button>
                        <div id="resguardo-error-feedback" style="color:#c62828; font-size:11px; margin-top:5px;"></div>
                    </form>
                </div>
                ` : ''}

                ${this.capacidadGlobal ? `
                <div style="margin-bottom: 15px; display: flex; gap: 10px;" id="controles-globales-resguardos">
                    <input type="text" id="filtro-busqueda-curp" placeholder="Filtrar unívocamente por CURP o Nombre del Responsable..." style="flex: 1; padding: 6px 10px; border: 1px solid #bdbdbd; border-radius: 4px; font-size: 12px; font-family: monospace;">
                </div>
                ` : ''}

                <div style="overflow-x:auto; border: 1px solid #e0e0e0; border-radius:4px;">
                    <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;" id="tabla-resguardos-personales">
                        <thead>
                            <tr style="background-color:#f5f5f5; border-bottom: 1px solid #e0e0e0;">
                                <th style="padding:10px; color: #424242; font-weight:700;">Identificador Asignación</th>
                                ${this.capacidadGlobal ? '<th style="padding:10px; color: #424242; font-weight:700;">Custodio / Responsable</th>' : ''}
                                <th style="padding:10px; color: #424242; font-weight:700;">Descripción del Bien Fijo</th>
                                <th style="padding:10px; color: #424242; font-weight:700;">Ubicación Topológica</th>
                                <th style="padding:10px; color: #424242; font-weight:700;">Fecha Asignación</th>
                                <th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Vigencia Légitima</th>
                                ${puedeModificar ? '<th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Operaciones</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="${this.capacidadGlobal ? '7' : (puedeModificar ? '6' : '5')}" style="text-align:center; padding:15px; color:#757575;">Estableciendo canal seguro y recuperando asignaciones...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (this.capacidadGlobal && puedeModificar) {
            const subContainer = container.querySelector('#contenedor-selector-ubicacion-resguardo');
            if (subContainer) {
                this.selectorUbicaciones = new SelectorUbicaciones(subContainer, (geoData) => {
                    this.ubicacionActual = geoData;
                });
                await this.selectorUbicaciones.inicializar();
            }
        }

        await this.cargarTabla();
        this.vincularEventos(puedeModificar);
    }

    async cargarTabla(filtroCurp = '') {
        const tabla = document.getElementById('tabla-resguardos-personales');
        if (!tabla) return;
        const tbody = tabla.querySelector('tbody');
        if (!tbody) return;

        this.tokenConcurrenciaId++;
        const currentTokenId = this.tokenConcurrenciaId;
        
        const state = authStore.getSnapshot();
        const permisos = state.capabilities || [];
        const puedeModificar = permisos.includes('resguardos:crear') || permisos.includes('resguardos:write');
        const columnasTotales = this.capacidadGlobal ? 7 : (puedeModificar ? 6 : 5);

        try {
            let respuestaBFF;
            if (this.capacidadGlobal) {
                respuestaBFF = await resguardosService.listarTodosLosResguardosInstitucionales({ limit: 100, offset: 0});
            } else {
                respuestaBFF = await resguardosService.listarMisResguardos(50, 0);
            }
            
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;

            tbody.innerHTML = '';

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

            asignaciones.forEach(item => {
                const bienDesc = item.bien ? `${item.bien.descripcion} [Marca: ${item.bien.marca || 'N/A'}, Modelo: ${item.bien.modelo || 'N/A'}]` : 'Sin descripción física';
                const ubicacionFisica = item.ubicacion ? `Edif. ${item.ubicacion.edificio} - Aula: ${item.ubicacion.aula} (${item.ubicacion.departamento})` : 'Ubicación no asignada';
                const fechaParseada = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'No timbrada';
                const custodioNombre = item.persona ? `${item.persona.apellidos}, ${item.persona.nombres} [${item.persona.curp}]` : 'No asignado';

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e0e0e0';
                tr.innerHTML = `
                    <td style="padding:10px; font-family:monospace; color:#1a237e; font-size:11px;">${this._escapeHtml(item.id_asignacion)}</td>
                    ${this.capacidadGlobal ? '<td style="padding:10px; font-weight:500; color:#37474f;">' + this._escapeHtml(custodioNombre) + '</td>' : ''}
                    <td style="padding:10px; font-weight:600; color: #212121;">${this._escapeHtml(bienDesc)}</td>
                    <td style="padding:10px; color: #37474f;">${this._escapeHtml(ubicacionFisica)}</td>
                    <td style="padding:10px; color: #616161;">${this._escapeHtml(fechaParseada)}</td>
                    <td style="padding:10px; text-align:center;">
                        <span style="color:#00796b; font-weight:700; background-color:#e0f2f1; padding:3px 8px; border-radius:12px; font-size:10px; text-transform:uppercase;">
                            Activo (${item.dias_vigencia} días)
                        </span>
                    </td>
                    ${puedeModificar ? `
                    <td style="padding:10px; text-align:center;">
                        <button class="btn-liberar-resguardo" data-id="${item.id_asignacion}" style="background-color:#e65100; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight:600;">Liberar Bien</button>
                    </td>
                    ` : ''}
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            if (this.estaDesmontado || currentTokenId !== this.tokenConcurrenciaId) return;
            tbody.innerHTML = `<tr><td colspan="${columnasTotales}" style="text-align:center; padding:15px; color:#c62828; font-weight:600;">Error crítico: No se logró resolver la matriz de resguardos.</td></tr>`;
        }
    }

    vincularEventos(puedeModificar) {
        const filtroInput = document.getElementById('filtro-busqueda-curp');
        if (filtroInput && this.capacidadGlobal) {
            this.onFiltroInputBound = (e) => this.cargarTabla(e.target.value);
            filtroInput.addEventListener('input', this.onFiltroInputBound);
        }

        const tabla = document.getElementById('tabla-resguardos-personales');
        if (tabla && puedeModificar) {
            this.onAccionesClickBound = async (e) => {
                if (e.target.classList.contains('btn-liberar-resguardo')) {
                    const idAsignacion = e.target.getAttribute('data-id');
                    if (confirm('¿Confirma la liberación legal del activo patrimonial?')) {
                        try {
                            await resguardosService.concluirResguardoOrdinario(idAsignacion);
                            alert('El acta de resguardo ha sido dada de baja lógica de manera exitosa.');
                            this.cargarTabla(filtroInput ? filtroInput.value : '');
                        } catch (err) {
                            alert('Error de mutación: No se pudo completar la directiva de desvinculación patrimonial.');
                        }
                    }
                }
            };
            tabla.addEventListener('click', this.onAccionesClickBound);
        }

        const formCrear = document.getElementById('form-crear-resguardo');
        if (formCrear && puedeModificar) {
            this.onFormSubmitBound = async (e) => {
                e.preventDefault();
                const feedback = document.getElementById('resguardo-error-feedback');
                const btn = document.getElementById('btn-crear-resguardo');
                if (feedback) feedback.textContent = '';

                if (!this.ubicacionActual || !this.ubicacionActual.id_edificio || !this.ubicacionActual.id_aula || !this.ubicacionActual.id_departamento) {
                    if (feedback) feedback.textContent = "Error: Mapeo topológico incompleto (Edificio, Aula y Depto requeridos).";
                    return;
                }

                const formData = new FormData(formCrear);
                const payload = {
                    id_bien: formData.get('id_bien').trim(),
                    curp: formData.get('curp').trim().toUpperCase(),
                    id_edificio: this.ubicacionActual.id_edificio,
                    id_aula: this.ubicacionActual.id_aula,
                    id_departamento: this.ubicacionActual.id_departamento
                };

                try {
                    if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }
                    await resguardosService.crearAsignacion(payload);
                    alert('Acta de resguardo generada exitosamente.');
                    formCrear.reset();
                    if (this.selectorUbicaciones) await this.selectorUbicaciones.inicializar();
                    this.cargarTabla(filtroInput ? filtroInput.value : '');
                } catch (err) {
                    if (feedback) feedback.textContent = err.response?.data?.detail || "Fallo estructural al crear la asignación.";
                } finally {
                    if (btn) { btn.disabled = false; btn.textContent = 'Emitir Acta de Resguardo'; }
                }
            };
            formCrear.addEventListener('submit', this.onFormSubmitBound);
        }
    }

    _renderizarBloqueo403(container, mensaje) {
        container.innerHTML = `
            <div style="padding:30px; background:#ffebee; border:1px solid #ffcdd2; border-radius:6px; color:#b71c1c; font-family:sans-serif;">
                <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:700; text-transform:uppercase;">Acceso Restringido (403 Forbidden)</h4>
                <p style="margin:0; font-size:12px; color:#c62828;">${mensaje}</p>
            </div>
        `;
    }

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    unmount() {
        this.estaDesmontado = true;
        this.tokenConcurrenciaId++;
        
        const filtroInput = document.getElementById('filtro-busqueda-curp');
        if (filtroInput && this.onFiltroInputBound) filtroInput.removeEventListener('input', this.onFiltroInputBound);
        
        const tabla = document.getElementById('tabla-resguardos-personales');
        if (tabla && this.onAccionesClickBound) tabla.removeEventListener('click', this.onAccionesClickBound);

        const formCrear = document.getElementById('form-crear-resguardo');
        if (formCrear && this.onFormSubmitBound) formCrear.removeEventListener('submit', this.onFormSubmitBound);

        if (this.selectorUbicaciones) this.selectorUbicaciones.unmount();
    }
}