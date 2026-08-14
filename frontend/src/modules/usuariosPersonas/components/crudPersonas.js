import { adminService } from '../services/admin.js';

export class CrudPersonas {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this.puedeCrear = this.permisos.includes('personas:crear');
        this.puedeEditar = this.permisos.includes('personas:actualizar') || this.permisos.includes('personas:editar');
        this.puedeEliminar = this.permisos.includes('personas:eliminar') || this.permisos.includes('personas:borrar');
        
        // Estado de Edición y Caché Local
        this._editingId = null;
        this._personasCache = new Map();
        this._abortController = new AbortController();
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const regexNombres = "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$";
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                ${(this.puedeCrear || this.puedeEditar) ? `
                <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <h4 id="form-persona-titulo" style="margin-top:0; color:#424242;">Registrar Persona</h4>
                    <form id="form-persona">
                        <input type="text" name="curp" id="input-curp" placeholder="CURP" required 
                            pattern="${regexCurp}" minlength="18" maxlength="18" 
                            title="Debe ser una CURP válida de 18 caracteres"
                            style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase;">
                            
                        <input type="text" name="nombres" id="input-nombres" placeholder="Nombres" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <input type="text" name="apellidos" id="input-apellidos" placeholder="Apellidos" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <button type="submit" id="btn-submit-persona" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; cursor:pointer;">Guardar Persona</button>
                        <button type="button" id="btn-cancelar-persona" style="display:none; width:100%; margin-top:8px; padding:8px; background:#757575; color:white; border:none; cursor:pointer;">Cancelar Edición</button>
                    </form>
                </div>` : '<div style="color:#757575; font-style:italic;">No tiene permisos de gestión demográfica.</div>'}
                
                <div>
                    <h4 style="margin-top:0; color:#424242;">Catálogo Demográfico</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#f5f5f5; text-align:left;">
                                <th style="padding:8px;">CURP</th>
                                <th style="padding:8px;">Nombre Completo</th>
                                <th style="padding:8px; text-align:center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-personas">
                            <tr><td colspan="3">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;
        const form = document.getElementById('form-persona');
        const tbody = document.getElementById('tbody-personas');
        const btnCancelar = document.getElementById('btn-cancelar-persona');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const payload = {
                    curp: formData.get('curp').toUpperCase().trim(),
                    nombres: formData.get('nombres').trim(),
                    apellidos: formData.get('apellidos').trim()
                };

                try {
                    if (this._editingId) {
                        await adminService.actualizarPersona(this._editingId, payload);
                        alert('Persona actualizada con éxito');
                    } else {
                        await adminService.crearPersona(payload);
                        alert('Persona registrada con éxito');
                    }
                    this.desactivarModoEdicion();
                    this.cargarDatos();
                } catch (error) {
                    alert('Error en la operación: ' + (error.response?.data?.detail || error.message));
                }
            }, { signal });
        }

        if (tbody) {
            tbody.addEventListener('click', async (e) => {
                const btnEditar = e.target.closest('.btn-editar-persona');
                const btnEliminar = e.target.closest('.btn-eliminar-persona');

                if (btnEditar) {
                    const idPersona = btnEditar.getAttribute('data-id');
                    this.activarModoEdicion(idPersona);
                } else if (btnEliminar && this.puedeEliminar) {
                    const idPersona = btnEliminar.getAttribute('data-id');
                    await this.eliminarPersona(idPersona);
                }
            }, { signal });
        }

        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => {
                this.desactivarModoEdicion();
            }, { signal });
        }
    }

    async eliminarPersona(idPersona) {
        const persona = this._personasCache.get(idPersona);
        const confirmacion = confirm(`¿Está seguro de eliminar el registro demográfico de ${persona ? persona.nombres : 'esta persona'}?\n\nEsta acción fallará si el registro posee cuentas o resguardos activos vinculados.`);
        
        if (!confirmacion) return;

        try {
            // Corrección de contrato: Se invoca darBajaPersona en lugar de eliminarPersona
            await adminService.darBajaPersona(idPersona);
            alert('Registro demográfico eliminado correctamente.');
            this.cargarDatos();
        } catch (error) {
            const detalle = error.response?.data?.detail || error.message;
            alert(`No se puede eliminar la persona: ${detalle}`);
        }
    }

    activarModoEdicion(idPersona) {
        const persona = this._personasCache.get(idPersona);
        if (!persona) return;

        this._editingId = idPersona;

        document.getElementById('input-curp').value = persona.curp;
        document.getElementById('input-nombres').value = persona.nombres;
        document.getElementById('input-apellidos').value = persona.apellidos;

        document.getElementById('form-persona-titulo').textContent = 'Editar Persona';
        const btnSubmit = document.getElementById('btn-submit-persona');
        btnSubmit.textContent = 'Actualizar Persona';
        btnSubmit.style.background = '#e65100';
        document.getElementById('btn-cancelar-persona').style.display = 'block';
    }

    desactivarModoEdicion() {
        this._editingId = null;
        const form = document.getElementById('form-persona');
        if (form) form.reset();

        document.getElementById('form-persona-titulo').textContent = 'Registrar Persona';
        const btnSubmit = document.getElementById('btn-submit-persona');
        if (btnSubmit) {
            btnSubmit.textContent = 'Guardar Persona';
            btnSubmit.style.background = '#1a237e';
        }
        const btnCancelar = document.getElementById('btn-cancelar-persona');
        if (btnCancelar) btnCancelar.style.display = 'none';
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-personas');
        if (!tbody) return;
        try {
            const resp = await adminService.listarPersonas(50, 0, false);
            const personas = Array.isArray(resp) ? resp : (resp?.data || []);
            
            this._personasCache.clear();
            personas.forEach(p => this._personasCache.set(p.id_persona, p));

            if (personas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No existen personas registradas.</td></tr>';
                return;
            }

            tbody.innerHTML = personas.map(p => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-family:monospace;">${p.curp}</td>
                    <td style="padding:8px;">${p.apellidos}, ${p.nombres}</td>
                    <td style="padding:8px; text-align:center;">
                        <div style="display:flex; gap:4px; justify-content:center;">
                            ${this.puedeEditar ? `
                                <button class="btn-editar-persona" data-id="${p.id_persona}" 
                                    style="background:#f57c00; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Editar
                                </button>
                            ` : ''}
                            ${this.puedeEliminar ? `
                                <button class="btn-eliminar-persona" data-id="${p.id_persona}" 
                                    style="background:#d32f2f; color:white; border:none; padding:4px 8px; cursor:pointer; border-radius:3px;">
                                    Eliminar
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="3" style="color:red;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        this._abortController.abort();
        const container = document.getElementById(this.containerId);
        if (container) container.innerHTML = '';
    }
}