import { ubicacionesService } from '../services/ubicaciones.js';

export class CrudUbicaciones {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];

        this.puedeCrearUbi = this.permisos.includes('ubicaciones:crear');
        this.puedeEditarUbi = this.permisos.includes('ubicaciones:editar');
        this.puedeBorrarUbi = this.permisos.includes('ubicaciones:borrar');

        this.puedeCrearDepto = this.permisos.includes('departamentos:crear');
        this.puedeEditarDepto = this.permisos.includes('departamentos:editar');
        this.puedeBorrarDepto = this.permisos.includes('departamentos:borrar');

        this._editingEdificioId = null;
        this._editingAulaId = null;
        this._editingDeptoId = null;
        this._selectedEdificioForAulas = null;

        this._edificiosCache = new Map();
        this._departamentosCache = new Map();

        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
            <div style="width: 100%; font-family: system-ui, -apple-system, sans-serif;">
                <!-- Control de Pestañas -->
                <div style="display: flex; gap: 10px; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px;">
                    <button id="tab-btn-infra" style="padding: 10px 20px; border: none; background: #00796b; color: white; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Infraestructura Física (Edificios y Aulas)
                    </button>
                    <button id="tab-btn-deptos" style="padding: 10px 20px; border: none; background: #e0e0e0; color: #424242; cursor: pointer; font-weight: 600; border-radius: 4px 4px 0 0;">
                        Organigrama (Departamentos)
                    </button>
                </div>

                <!-- SECCIÓN 1: INFRAESTRUCTURA FÍSICA -->
                <div id="section-infraestructura" style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <!-- Formulario de Edificios / Aulas -->
                    <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                        <h4 id="form-edificio-titulo" style="margin-top:0; color:#424242;">Registrar Edificio</h4>
                        ${(this.puedeCrearUbi || this.puedeEditarUbi) ? `
                        <form id="form-edificio" style="margin-bottom: 25px;">
                            <input type="text" name="nombre" id="input-edf-nombre" placeholder="Nombre del Edificio (ej. Edificio K)" required
                                minlength="2" maxlength="100" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">
                            
                            <input type="text" name="clave" id="input-edf-clave" placeholder="Clave Corta (ej. EDF-K)"
                                maxlength="20" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">

                            <button type="submit" id="btn-submit-edificio" style="width:100%; padding:8px; background:#00796b; color:white; border:none; cursor:pointer; font-weight:600;">
                                Crear Edificio
                            </button>
                            <button type="button" id="btn-cancelar-edificio" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">
                                Cancelar Edición
                            </button>
                        </form>
                        ` : '<div style="color:#757575; font-style:italic; margin-bottom:20px;">Sin permisos para gestionar edificios.</div>'}

                        <hr style="border:0; border-top:1px solid #e0e0e0; margin:20px 0;">

                        <!-- Sub-formulario para Aulas -->
                        <h4 id="form-aula-titulo" style="margin-top:0; color:#424242;">Agregar Aula / Espacio</h4>
                        ${(this.puedeCrearUbi || this.puedeEditarUbi) ? `
                        <form id="form-aula">
                            <select id="select-aula-edificio" required style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">
                                <option value="">Seleccione Edificio Destino...</option>
                            </select>
                            
                            <input type="text" name="nombre" id="input-aula-nombre" placeholder="Nombre del Aula (ej. Laboratorio LIS)" required
                                minlength="2" maxlength="100" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">

                            <button type="submit" id="btn-submit-aula" style="width:100%; padding:8px; background:#0288d1; color:white; border:none; cursor:pointer; font-weight:600;">
                                Anexar Aula
                            </button>
                            <button type="button" id="btn-cancelar-aula" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">
                                Cancelar Edición
                            </button>
                        </form>
                        ` : '<div style="color:#757575; font-style:italic;">Sin permisos para gestionar aulas.</div>'}
                    </div>

                    <!-- Tabla de Edificios y Aulas -->
                    <div>
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
                    </div>
                </div>

                <!-- SECCIÓN 2: ORGANIGRAMA DE DEPARTAMENTOS -->
                <div id="section-departamentos" style="display: none; grid-template-columns: 1fr 2fr; gap: 20px;">
                    <!-- Formulario de Departamentos -->
                    <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                        <h4 id="form-depto-titulo" style="margin-top:0; color:#424242;">Alta de Departamento</h4>
                        ${(this.puedeCrearDepto || this.puedeEditarDepto) ? `
                        <form id="form-departamento">
                            <input type="text" name="nombre" id="input-depto-nombre" placeholder="Nombre Oficial del Departamento" required
                                minlength="2" maxlength="150" style="width:100%; margin-bottom:10px; padding:8px; box-sizing:border-box;">

                            <input type="text" name="curp_jefe_departamento" id="input-depto-curp" placeholder="CURP del Jefe / Resguardatario" required
                                pattern="${regexCurp}" minlength="18" maxlength="18"
                                title="Ingrese los 18 caracteres de la CURP oficial"
                                style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase; box-sizing:border-box;">

                            <button type="submit" id="btn-submit-depto" style="width:100%; padding:8px; background:#00796b; color:white; border:none; cursor:pointer; font-weight:600;">
                                Registrar Departamento
                            </button>
                            <button type="button" id="btn-cancelar-depto" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">
                                Cancelar Edición
                            </button>
                        </form>
                        ` : '<div style="color:#757575; font-style:italic;">Sin permisos para gestionar departamentos.</div>'}
                    </div>

                    <!-- Tabla de Departamentos -->
                    <div>
                        <h4 style="margin-top:0; color:#424242;">Estructura Organizacional Institucional</h4>
                        <table style="width:100%; border-collapse:collapse; font-size:12px; background:white;">
                            <thead>
                                <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #e0e0e0;">
                                    <th style="padding:8px;">Nombre del Departamento</th>
                                    <th style="padding:8px;">CURP Jefe Adscrito</th>
                                    <th style="padding:8px;">Estado</th>
                                    <th style="padding:8px; text-align:center;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="tbody-departamentos">
                                <tr><td colspan="4" style="padding:15px; text-align:center;">Cargando organigrama...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;

        const btnTabInfra = document.getElementById('tab-btn-infra');
        const btnTabDeptos = document.getElementById('tab-btn-deptos');
        const secInfra = document.getElementById('section-infraestructura');
        const secDeptos = document.getElementById('section-departamentos');

        if (btnTabInfra && btnTabDeptos) {
            btnTabInfra.addEventListener('click', () => {
                btnTabInfra.style.background = '#00796b';
                btnTabInfra.style.color = 'white';
                btnTabDeptos.style.background = '#e0e0e0';
                btnTabDeptos.style.color = '#424242';
                secInfra.style.display = 'grid';
                secDeptos.style.display = 'none';
            }, { signal });

            btnTabDeptos.addEventListener('click', () => {
                btnTabDeptos.style.background = '#00796b';
                btnTabDeptos.style.color = 'white';
                btnTabInfra.style.background = '#e0e0e0';
                btnTabInfra.style.color = '#424242';
                secDeptos.style.display = 'grid';
                secInfra.style.display = 'none';
            }, { signal });
        }

        const formEdificio = document.getElementById('form-edificio');
        if (formEdificio) {
            formEdificio.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formEdificio);
                const payload = {
                    nombre: formData.get('nombre').trim(),
                    clave: formData.get('clave')?.trim() || null
                };

                try {
                    if (this._editingEdificioId) {
                        await ubicacionesService.actualizarEdificio(this._editingEdificioId, payload);
                        alert('Edificio actualizado correctamente');
                    } else {
                        await ubicacionesService.crearEdificio(payload);
                        alert('Edificio dado de alta exitosamente');
                    }
                    this.desactivarEdicionEdificio();
                    this.cargarDatos();
                } catch (err) {
                    alert('Error en la operación de Edificio: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal });
        }

        const formAula = document.getElementById('form-aula');
        if (formAula) {
            formAula.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formAula);
                const idEdificioSel = document.getElementById('select-aula-edificio').value;
                const payload = { nombre: formData.get('nombre').trim() };

                try {
                    if (this._editingAulaId) {
                        await ubicacionesService.actualizarAula(this._editingAulaId, payload);
                        alert('Aula actualizada con éxito');
                    } else {
                        if (!idEdificioSel) {
                            alert('Debe seleccionar un edificio base');
                            return;
                        }
                        await ubicacionesService.crearAula(idEdificioSel, payload);
                        alert('Aula anexada al edificio correctamente');
                    }
                    this.desactivarEdicionAula();
                    this.cargarDatos();
                } catch (err) {
                    alert('Error al procesar el aula: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal });
        }

        const formDepto = document.getElementById('form-departamento');
        if (formDepto) {
            formDepto.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formDepto);
                const payload = {
                    nombre: formData.get('nombre').trim(),
                    curp_jefe_departamento: formData.get('curp_jefe_departamento').toUpperCase().trim()
                };

                try {
                    if (this._editingDeptoId) {
                        await ubicacionesService.actualizarDepartamento(this._editingDeptoId, payload);
                        alert('Estructura departamental actualizada');
                    } else {
                        await ubicacionesService.crearDepartamento(payload);
                        alert('Departamento registrado correctamente');
                    }
                    this.desactivarEdicionDepto();
                    this.cargarDatos();
                } catch (err) {
                    alert('Error en departamento: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal });
        }

        const tbodyEdf = document.getElementById('tbody-edificios');
        if (tbodyEdf) {
            tbodyEdf.addEventListener('click', async (e) => {
                const btnEdEdf = e.target.closest('.btn-editar-edificio');
                const btnDelEdf = e.target.closest('.btn-borrar-edificio');
                const btnEdAula = e.target.closest('.btn-editar-aula');
                const btnDelAula = e.target.closest('.btn-borrar-aula');

                if (btnEdEdf) {
                    this.activarEdicionEdificio(btnEdEdf.getAttribute('data-id'));
                } else if (btnDelEdf && this.puedeBorrarUbi) {
                    const id = btnDelEdf.getAttribute('data-id');
                    if (confirm('¿Dar de baja este edificio? Las aulas adscritas podrían quedar inaccesibles.')) {
                        try {
                            await ubicacionesService.darBajaEdificio(id);
                            this.cargarDatos();
                        } catch (err) {
                            alert('Fallo al dar de baja: ' + err.message);
                        }
                    }
                } else if (btnEdAula) {
                    this.activarEdicionAula(
                        btnEdAula.getAttribute('data-id-aula'),
                        btnEdAula.getAttribute('data-id-edificio'),
                        btnEdAula.getAttribute('data-nombre')
                    );
                } else if (btnDelAula && this.puedeBorrarUbi) {
                    const idAula = btnDelAula.getAttribute('data-id-aula');
                    if (confirm('¿Eliminar esta aula/espacio físico del inventario?')) {
                        try {
                            await ubicacionesService.darBajaAula(idAula);
                            this.cargarDatos();
                        } catch (err) {
                            alert('Error al eliminar aula: ' + err.message);
                        }
                    }
                }
            }, { signal });
        }

        const tbodyDepto = document.getElementById('tbody-departamentos');
        if (tbodyDepto) {
            tbodyDepto.addEventListener('click', async (e) => {
                const btnEdDepto = e.target.closest('.btn-editar-depto');
                const btnDelDepto = e.target.closest('.btn-borrar-depto');

                if (btnEdDepto) {
                    this.activarEdicionDepto(btnEdDepto.getAttribute('data-id'));
                } else if (btnDelDepto && this.puedeBorrarDepto) {
                    const id = btnDelDepto.getAttribute('data-id');
                    if (confirm('¿Dar de baja esta estructura departamental?')) {
                        try {
                            await ubicacionesService.darBajaDepartamento(id);
                            this.cargarDatos();
                        } catch (err) {
                            alert('Error al dar de baja departamento: ' + err.message);
                        }
                    }
                }
            }, { signal });
        }

        document.getElementById('btn-cancelar-edificio')?.addEventListener('click', () => this.desactivarEdicionEdificio(), { signal });
        document.getElementById('btn-cancelar-aula')?.addEventListener('click', () => this.desactivarEdicionAula(), { signal });
        document.getElementById('btn-cancelar-depto')?.addEventListener('click', () => this.desactivarEdicionDepto(), { signal });
    }

    // =========================================================================
    // HIDRATACIÓN DE MODO EDICIÓN Y ESTADOS DE FORMULARIO
    // =========================================================================
    activarEdicionEdificio(idEdificio) {
        const edf = this._edificiosCache.get(idEdificio);
        if (!edf) return;

        this._editingEdificioId = idEdificio;
        document.getElementById('input-edf-nombre').value = edf.nombre;
        document.getElementById('input-edf-clave').value = edf.clave || '';

        document.getElementById('form-edificio-titulo').textContent = 'Editar Edificio';
        const btnSubmit = document.getElementById('btn-submit-edificio');
        btnSubmit.textContent = 'Actualizar Edificio';
        btnSubmit.style.background = '#e65100';
        document.getElementById('btn-cancelar-edificio').style.display = 'block';
    }

    desactivarEdicionEdificio() {
        this._editingEdificioId = null;
        document.getElementById('form-edificio')?.reset();
        document.getElementById('form-edificio-titulo').textContent = 'Registrar Edificio';
        const btnSubmit = document.getElementById('btn-submit-edificio');
        if (btnSubmit) {
            btnSubmit.textContent = 'Crear Edificio';
            btnSubmit.style.background = '#00796b';
        }
        document.getElementById('btn-cancelar-edificio').style.display = 'none';
    }

    activarEdicionAula(idAula, idEdificio, nombreAula) {
        this._editingAulaId = idAula;
        document.getElementById('input-aula-nombre').value = nombreAula;
        
        const selEdificio = document.getElementById('select-aula-edificio');
        if (selEdificio) {
            selEdificio.value = idEdificio;
            selEdificio.disabled = true;
        }

        document.getElementById('form-aula-titulo').textContent = 'Editar Nombre de Aula';
        const btnSubmit = document.getElementById('btn-submit-aula');
        btnSubmit.textContent = 'Actualizar Aula';
        btnSubmit.style.background = '#e65100';
        document.getElementById('btn-cancelar-aula').style.display = 'block';
    }

    desactivarEdicionAula() {
        this._editingAulaId = null;
        document.getElementById('form-aula')?.reset();
        const selEdificio = document.getElementById('select-aula-edificio');
        if (selEdificio) selEdificio.disabled = false;

        document.getElementById('form-aula-titulo').textContent = 'Agregar Aula / Espacio';
        const btnSubmit = document.getElementById('btn-submit-aula');
        if (btnSubmit) {
            btnSubmit.textContent = 'Anexar Aula';
            btnSubmit.style.background = '#0288d1';
        }
        document.getElementById('btn-cancelar-aula').style.display = 'none';
    }

    activarEdicionDepto(idDepto) {
        const depto = this._departamentosCache.get(idDepto);
        if (!depto) return;

        this._editingDeptoId = idDepto;
        document.getElementById('input-depto-nombre').value = depto.nombre;
        document.getElementById('input-depto-curp').value = depto.curp_jefe_departamento;

        document.getElementById('form-depto-titulo').textContent = 'Editar Departamento';
        const btnSubmit = document.getElementById('btn-submit-depto');
        btnSubmit.textContent = 'Actualizar Departamento';
        btnSubmit.style.background = '#e65100';
        document.getElementById('btn-cancelar-depto').style.display = 'block';
    }

    desactivarEdicionDepto() {
        this._editingDeptoId = null;
        document.getElementById('form-departamento')?.reset();
        document.getElementById('form-depto-titulo').textContent = 'Alta de Departamento';
        const btnSubmit = document.getElementById('btn-submit-depto');
        if (btnSubmit) {
            btnSubmit.textContent = 'Registrar Departamento';
            btnSubmit.style.background = '#00796b';
        }
        document.getElementById('btn-cancelar-depto').style.display = 'none';
    }

    // =========================================================================
    // CARGA Y POBLAMIENTO ASÍNCRONO DE TABLAS Y OPCIONES
    // =========================================================================
    async cargarDatos() {
        await Promise.all([
            this.cargarTopologiaEdificios(),
            this.cargarOrganigramaDepartamentos()
        ]);
    }

    async cargarTopologiaEdificios() {
        const tbody = document.getElementById('tbody-edificios');
        const selectEdificioAula = document.getElementById('select-aula-edificio');
        if (!tbody) return;

        try {
            const resp = await ubicacionesService.listarEdificios(50, 0, false);
            const edificios = Array.isArray(resp) ? resp : (resp?.data || []);

            this._edificiosCache.clear();
            edificios.forEach(e => this._edificiosCache.set(e.id_edificio, e));

            if (selectEdificioAula) {
                const valActual = selectEdificioAula.value;
                selectEdificioAula.innerHTML = '<option value="">Seleccione Edificio Destino...</option>' +
                    edificios.map(e => `<option value="${e.id_edificio}">${e.nombre} (${e.clave || 'S/C'})</option>`).join('');
                selectEdificioAula.value = valActual;
            }

            if (edificios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">No hay edificios registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = edificios.map(e => {
                const aulasList = e.aulas && e.aulas.length > 0
                    ? e.aulas.map(a => `
                        <span style="display:inline-flex; align-items:center; gap:4px; background:#e1f5fe; color:#0277bd; padding:2px 6px; border-radius:3px; margin:2px; font-size:11px;">
                            ${a.nombre}
                            ${this.puedeEditarUbi ? `<button class="btn-editar-aula" data-id-aula="${a.id_aula}" data-id-edificio="${e.id_edificio}" data-nombre="${a.nombre}" style="border:none; background:none; cursor:pointer; color:#f57c00; font-weight:bold; padding:0 2px;">✎</button>` : ''}
                            ${this.puedeBorrarUbi ? `<button class="btn-borrar-aula" data-id-aula="${a.id_aula}" style="border:none; background:none; cursor:pointer; color:#c62828; font-weight:bold; padding:0 2px;">×</button>` : ''}
                        </span>
                    `).join('')
                    : '<span style="color:#9e9e9e; font-style:italic;">Sin aulas registradas</span>';

                return `
                    <tr style="border-bottom:1px solid #e0e0e0;">
                        <td style="padding:8px; font-family:monospace; font-weight:600; color:#555;">${e.clave || e.id_edificio.substring(0, 8)}</td>
                        <td style="padding:8px; font-weight:600; color:#212121;">${e.nombre}</td>
                        <td style="padding:8px;">${aulasList}</td>
                        <td style="padding:8px; text-align:center;">
                            <div style="display:flex; gap:4px; justify-content:center;">
                                ${this.puedeEditarUbi ? `
                                    <button class="btn-editar-edificio" data-id="${e.id_edificio}" 
                                        style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                        Editar
                                    </button>
                                ` : ''}
                                ${e.is_active && this.puedeBorrarUbi ? `
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

    async cargarOrganigramaDepartamentos() {
        const tbody = document.getElementById('tbody-departamentos');
        if (!tbody) return;

        try {
            const resp = await ubicacionesService.listarDepartamentos(50, 0, false);
            const deptos = Array.isArray(resp) ? resp : (resp?.data || []);

            this._departamentosCache.clear();
            deptos.forEach(d => this._departamentosCache.set(d.id_departamento, d));

            if (deptos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px;">No hay departamentos registrados.</td></tr>';
                return;
            }

            tbody.innerHTML = deptos.map(d => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-weight:600; color:#212121;">${d.nombre}</td>
                    <td style="padding:8px; font-family:monospace; color:#37474f;">${d.curp_jefe_departamento}</td>
                    <td style="padding:8px;">${d.is_active ? '<span style="color:green; font-weight:600;">Activo</span>' : '<span style="color:red; font-weight:600;">Inactivo</span>'}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:4px; justify-content:center;">
                            ${this.puedeEditarDepto ? `
                                <button class="btn-editar-depto" data-id="${d.id_departamento}" 
                                    style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Editar
                                </button>
                            ` : ''}
                            ${d.is_active && this.puedeBorrarDepto ? `
                                <button class="btn-borrar-depto" data-id="${d.id_departamento}" 
                                    style="background:#c62828; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Dar Baja
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="color:red; padding:15px; text-align:center;">Error al recuperar organigrama departamental</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
        const container = document.getElementById(this.containerId);
        if (container) container.innerHTML = '';
    }
}