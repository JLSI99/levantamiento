import { ubicacionesService } from '../../../services/ubicaciones.js';

export class CrudDepartamentos {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];

        this.puedeCrearDepto = this.permisos.includes('departamentos:crear');
        this.puedeEditarDepto = this.permisos.includes('departamentos:editar');
        this.puedeBorrarDepto = this.permisos.includes('departamentos:borrar');

        this._editingDeptoId = null;
        this._departamentosCache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
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
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;
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

        document.getElementById('btn-cancelar-depto')?.addEventListener('click', () => this.desactivarEdicionDepto(), { signal });
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

    async cargarDatos() {
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
    }
}