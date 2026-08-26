import { ubicacionesService } from '../../../services/ubicaciones.js';

export class CrudEdificios {
    constructor(formContainerId, tableContainerId, permisos) {
        this.formContainerId = formContainerId;
        this.tableContainerId = tableContainerId;
        this.permisos = permisos || [];

        this.puedeCrearUbi = this.permisos.includes('ubicaciones:crear');
        this.puedeEditarUbi = this.permisos.includes('ubicaciones:editar');
        this.puedeBorrarUbi = this.permisos.includes('ubicaciones:borrar');

        this._editingEdificioId = null;
        this._edificiosCache = new Map();
        this._abortController = new AbortController();

        // Callbacks expuestos para el orquestador
        this.onEdificiosLoaded = null;
        this.onEditAulaRequest = null;
        this.onDeleteAulaRequest = null;
    }

    render() {
        const formContainer = document.getElementById(this.formContainerId);
        const tableContainer = document.getElementById(this.tableContainerId);
        if (!formContainer || !tableContainer) return;

        // Render Formulario Edificios
        formContainer.innerHTML = `
            <h4 id="form-edificio-titulo" style="margin-top:0; color:#424242;">Registrar Edificio</h4>
            ${(this.puedeCrearUbi || this.puedeEditarUbi) ? `
            <form id="form-edificio">
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
            ` : '<div style="color:#757575; font-style:italic;">Sin permisos para gestionar edificios.</div>'}
        `;

        // Render Tabla Edificios
        tableContainer.innerHTML = `
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
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;
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
                } else if (btnEdAula && this.onEditAulaRequest) {
                    this.onEditAulaRequest(
                        btnEdAula.getAttribute('data-id-aula'),
                        btnEdAula.getAttribute('data-id-edificio'),
                        btnEdAula.getAttribute('data-nombre')
                    );
                } else if (btnDelAula && this.onDeleteAulaRequest) {
                    this.onDeleteAulaRequest(btnDelAula.getAttribute('data-id-aula'));
                }
            }, { signal });
        }

        document.getElementById('btn-cancelar-edificio')?.addEventListener('click', () => this.desactivarEdicionEdificio(), { signal });
    }

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

    async cargarDatos() {
        const tbody = document.getElementById('tbody-edificios');
        if (!tbody) return;

        try {
            const resp = await ubicacionesService.listarEdificios(50, 0, false);
            const edificios = Array.isArray(resp) ? resp : (resp?.data || []);

            this._edificiosCache.clear();
            edificios.forEach(e => this._edificiosCache.set(e.id_edificio, e));

            if (this.onEdificiosLoaded) {
                this.onEdificiosLoaded(edificios);
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

    unmount() {
        this._abortController.abort();
    }
}