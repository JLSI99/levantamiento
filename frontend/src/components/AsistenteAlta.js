import { adminService } from '../services/admin.js';

export class AsistenteAlta {
    constructor(containerElement) {
        this.container = containerElement;
        this.curpPersonaCreada = null;
        this.eventoFormPersona = null;
        this.eventoFormUsuario = null;
    }

    _obtenerUsuarioAutenticado() {
        try {
            const sesionRaw = localStorage.getItem('usuario_sesion');
            if (!sesionRaw) return null;
            return JSON.parse(sesionRaw);
        } catch (e) {
            return null;
        }
    }

    render() {
        if (!this.container) return;
        
        // Defensa en Profundidad: Validación perimetral interna inline
        const usuario = this._obtenerUsuarioAutenticado();
        const esAdmin = usuario?.roles?.some(r => parseInt(r.id_rol, 10) === 1);

        if (!esAdmin) {
            this.container.innerHTML = `
                <span style="font-size:12px; color:#c62828; font-weight:600; display:block; padding:10px; background:#ffebee; border-radius:4px;">
                    Infracción Crítica: El sub-componente de aprovisionamiento requiere credenciales directas de Administrador Central.
                </span>
            `;
            return;
        }

        this.container.innerHTML = `
            <div class="wizard-context" style="padding:5px; margin-top:10px;">
                <div style="display:flex; gap:20px; margin-bottom:15px; font-size:12px; border-bottom: 1px solid #f5f5f5; padding-bottom: 8px;">
                    <span id="step-1-label" style="font-weight:bold; color: #1a237e;">Fase 1: Datos Demográficos</span>
                    <span id="step-2-label" style="color:#757575; font-weight: normal;">Fase 2: Identidad Digital</span>
                </div>
                
                <form id="form-persona-fase" style="display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">CURP Oficial (RENAPO)</label>
                        <input type="text" name="curp" placeholder="Ej. SANI990514HDFSZN01" required maxlength="18" style="width:100%; padding:6px; font-family:monospace; font-size:13px; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px;">
                    </div>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Nombre(s)</label>
                            <input type="text" name="nombres" placeholder="Nombres" required style="width:100%; padding:6px; font-size:12px; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Apellidos</label>
                            <input type="text" name="apellidos" placeholder="Apellidos" required style="width:100%; padding:6px; font-size:12px; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px;">
                        </div>
                    </div>
                    <button type="submit" id="btn-wizard-p1" style="padding:8px; background-color: #1a237e; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px; align-self: flex-end;">Validar e Indexar</button>
                    <div id="wizard-p1-error" style="font-size:11px; color: #c62828; font-weight:600; margin-top:4px;"></div>
                </form>

                <form id="form-usuario-fase" style="display: none; flex-direction: column; gap: 12px;">
                    <div style="background-color: #e8eaf6; padding: 8px; border-radius: 4px; border-left: 4px solid #3f51b5;">
                        <p style="font-size:11px; margin:0; color:#1a237e; font-weight:600;">Identidad Asignada:</p>
                        <span id="txt-persona-vinculada" style="font-size:12px; color:#212121; font-family: monospace;"></span>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Username Único</label>
                        <input type="text" id="inp-username" placeholder="Ej. jsanchez" required style="width:100%; padding:6px; font-size:12px; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Correo Electrónico Institucional</label>
                        <input type="email" id="inp-email" placeholder="usuario@tecnm.mx" required style="width:100%; padding:6px; font-size:12px; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Contraseña de Acceso (Min. 1 Mayúscula, 1 Minúscula, 1 Número)</label>
                        <input type="password" id="inp-password" placeholder="••••••••" required style="width:100%; padding:6px; font-size:12px; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Asignación Perimetral de Rol de Sistema</label>
                        <select id="inp-role-id" style="width:100%; padding:6px; font-size:12px; box-sizing:border-box; border:1px solid #bdbdbd; border-radius:4px; background: white;">
                            <option value="2">Levantador Físico / Operador de Inventario</option>
                            <option value="1">Administrador General del Sistema</option>
                            <option value="3">Registrador de Bienes Patrimoniales</option>
                            <option value="4">Revisor Central de Activos</option>
                            <option value="5">Resguardante / Jefe de Departamento</option>
                        </select>
                    </div>
                    <button type="submit" id="btn-wizard-p2" style="padding:8px; background-color: #00796b; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px; align-self: flex-end;">Aprovisionar Acceso Digital</button>
                    <div id="wizard-p2-error" style="font-size:11px; color: #c62828; font-weight:600; margin-top:4px;"></div>
                </form>
            </div>
        `;
        this.vincularEventos();
    }

    vincularEventos() {
        const formPersona = this.container.querySelector('#form-persona-fase');
        const formUsuario = this.container.querySelector('#form-usuario-fase');

        if (!formPersona || !formUsuario) return;

        this.eventoFormPersona = async (e) => {
            e.preventDefault();
            const errP1 = this.container.querySelector('#wizard-p1-error');
            const btnP1 = this.container.querySelector('#btn-wizard-p1');
            if (errP1) errP1.textContent = '';
            
            const formData = new FormData(formPersona);
            const targetCurp = formData.get('curp').toUpperCase().trim();

            const payload = {
                curp: targetCurp,
                nombres: formData.get('nombres').trim(),
                apellidos: formData.get('apellidos').trim()
            };

            try {
                if (btnP1) { btnP1.disabled = true; btnP1.textContent = 'Validando...'; }
                
                const persona = await adminService.crearPersona(payload);
                this.avanzarFaseUsuario(persona);
            } catch (error) {
                if (btnP1) { btnP1.disabled = false; btnP1.textContent = 'Validando e Indexar'; }
                
                if (error.response?.status === 409) {
                    if (confirm("La CURP ya se encuentra indexada en la base de datos demográfica. ¿Desea recuperar el registro existente para asignarle un nuevo perfil de autenticación institucional?")) {
                        try {
                            const catalogo = await adminService.listarPersonas(1, 0, true, targetCurp);
                            if (catalogo && catalogo.length > 0) {
                                this.avanzarFaseUsuario(catalogo[0]);
                            } else if (errP1) {
                                errP1.textContent = 'Conflicto: No se logró mapear los datos del registro preexistente.';
                            }
                        } catch (fetchErr) {
                            if (errP1) errP1.textContent = `Error de extracción: ${fetchErr.message}`;
                        }
                    }
                } else if (errP1) {
                    errP1.textContent = error.response?.data?.detail || 'Error de validación estructural en el esquema Pydantic del BFF.';
                }
            }
        };

        this.eventoFormUsuario = async (e) => {
            e.preventDefault();
            const errP2 = this.container.querySelector('#wizard-p2-error');
            const btnP2 = this.container.querySelector('#btn-wizard-p2');
            if (errP2) errP2.textContent = '';
            
            const payloadUser = {
                curp: this.curpPersonaCreada,
                username: this.container.querySelector('#inp-username').value.trim(),
                email: this.container.querySelector('#inp-email').value.trim(),
                password: this.container.querySelector('#inp-password').value,
                role_ids: [parseInt(this.container.querySelector('#inp-role-id').value, 10)]
            };

            try {
                if (btnP2) { btnP2.disabled = true; btnP2.textContent = 'Aprovisionando tokens...'; }
                
                await adminService.crearUsuario(payloadUser);
                alert('La cuenta digital institucional ha sido aprovisionada y vinculada criptográficamente a la CURP provista.');
                this.render();
            } catch (error) {
                if (btnP2) { btnP2.disabled = false; btnP2.textContent = 'Aprovisionar Acceso Digital'; }
                if (errP2) {
                    errP2.textContent = error.response?.data?.detail || 'Incapacidad de resolver esquema seguro en ms-auth a través del BFF.';
                }
            }
        };

        formPersona.addEventListener('submit', this.eventoFormPersona);
        formUsuario.addEventListener('submit', this.eventoFormUsuario);
    }

    avanzarFaseUsuario(persona) {
        this.curpPersonaCreada = persona.curp;
        
        const txtPersona = this.container.querySelector('#txt-persona-vinculada');
        const fPersona = this.container.querySelector('#form-persona-fase');
        const fUsuario = this.container.querySelector('#form-usuario-fase');
        const s1Label = this.container.querySelector('#step-1-label');
        const s2Label = this.container.querySelector('#step-2-label');

        if (txtPersona) txtPersona.textContent = `${persona.apellidos}, ${persona.nombres} [${persona.curp}]`;
        if (fPersona) fPersona.style.display = 'none';
        if (fUsuario) fUsuario.style.display = 'flex';
        
        if (s1Label) { s1Label.style.color = '#757575'; s1Label.style.fontWeight = 'normal'; }
        if (s2Label) { s2Label.style.color = '#00796b'; s2Label.style.fontWeight = 'bold'; }
    }

    unmount() {
        if (!this.container) return;
        const formPersona = this.container.querySelector('#form-persona-fase');
        const formUsuario = this.container.querySelector('#form-usuario-fase');

        if (formPersona && this.eventoFormPersona) {
            formPersona.removeEventListener('submit', this.eventoFormPersona);
        }
        if (formUsuario && this.eventoFormUsuario) {
            formUsuario.removeEventListener('submit', this.eventoFormUsuario);
        }
    }
}