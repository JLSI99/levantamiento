import { adminService } from '../services/admin.js';

export class AsistenteAlta {
    constructor(containerElement) {
        this.container = containerElement;
        this.curpPersonaCreada = null;
        this.eventoFormPersona = null;
        this.eventoFormUsuario = null;
    }

    render() {
        this.container.innerHTML = `
            <div class="wizard-container" style="padding:15px; margin-top:10px;">
                <div style="display:flex; gap:15px; margin-bottom:15px; font-size:12px;">
                    <span id="step-1-label" class="step-active" style="font-weight:bold;">1. Datos Personales</span>
                    <span id="step-2-label" style="color:var(--text-muted);">2. Cuenta Digital</span>
                </div>
                
                <form id="form-persona-fase" style="display: flex; flex-direction: column; gap: 10px;">
                    <input type="text" name="curp" placeholder="CURP" required maxlength="18" style="padding:6px; font-family:monospace;">
                    <input type="text" name="nombres" placeholder="Nombres" required style="padding:6px;">
                    <input type="text" name="apellidos" placeholder="Apellidos" required style="padding:6px;">
                    <button type="submit" class="btn-primary" style="padding:8px;">Validar e Indexar Identity</button>
                    <div id="wizard-p1-error" class="text-error" style="font-size:11px;"></div>
                </form>

                <form id="form-usuario-fase" style="display: none; flex-direction: column; gap: 10px;">
                    <p style="font-size:12px; margin:0; color:var(--text-muted);">Vinculando a: <strong id="txt-persona-vinculada" style="color:var(--text-main);"></strong></p>
                    <input type="text" id="inp-username" placeholder="Usuario Institucional" required style="padding:6px;">
                    <input type="email" id="inp-email" placeholder="Correo Institucional" required style="padding:6px;">
                    <input type="password" id="inp-password" placeholder="Contraseña Temporal" required style="padding:6px;">
                    
                    <select id="inp-role-id" style="padding:6px;">
                        <option value="1">Administrador (Rol 1)</option>
                        <option value="2">Levantador Físico (Rol 2)</option>
                        <option value="3">Registrador de Bienes (Rol 3)</option>
                        <option value="4">Revisor de Inventario (Rol 4)</option>
                        <option value="5">Resguardante Patrimonial (Rol 5)</option>
                    </select>

                    <button type="submit" class="btn-primary" style="padding:8px;">Crear Acceso</button>
                    <div id="wizard-p2-error" class="text-error" style="font-size:11px;"></div>
                </form>
            </div>
        `;
        this.vincularEventos();
    }

    vincularEventos() {
        const formPersona = this.container.querySelector('#form-persona-fase');
        const formUsuario = this.container.querySelector('#form-usuario-fase');

        this.eventoFormPersona = async (e) => {
            e.preventDefault();
            const errP1 = this.container.querySelector('#wizard-p1-error');
            if (errP1) errP1.textContent = '';
            
            const formData = new FormData(formPersona);
            const targetCurp = formData.get('curp').toUpperCase().trim();

            const payload = {
                curp: targetCurp,
                nombres: formData.get('nombres'),
                apellidos: formData.get('apellidos')
            };

            try {
                const persona = await adminService.crearPersona(payload);
                this.avanzarFaseUsuario(persona);
            } catch (error) {
                if (error.response?.status === 409) {
                    if (confirm("Identidad existente. ¿Recuperar registro demográfico para asignarle una cuenta digital?")) {
                        try {
                            const catalogo = await adminService.listarPersonas(1, 0, true, targetCurp);
                            if (catalogo && catalogo.length > 0) {
                                this.avanzarFaseUsuario(catalogo[0]);
                            } else if (errP1) {
                                errP1.textContent = 'Conflicto: No se pudo mapear la persona existente.';
                            }
                        } catch (fetchErr) {
                            if (errP1) errP1.textContent = `Error en consulta: ${fetchErr.message}`;
                        }
                    }
                } else if (errP1) {
                    errP1.textContent = error.response?.data?.detail || error.message;
                }
            }
        };

        this.eventoFormUsuario = async (e) => {
            e.preventDefault();
            const errP2 = this.container.querySelector('#wizard-p2-error');
            if (errP2) errP2.textContent = '';
            
            const payloadUser = {
                curp: this.curpPersonaCreada,
                username: this.container.querySelector('#inp-username').value.trim(),
                email: this.container.querySelector('#inp-email').value.trim(),
                password: this.container.querySelector('#inp-password').value,
                role_ids: [parseInt(this.container.querySelector('#inp-role-id').value, 10)]
            };

            try {
                await adminService.crearUsuario(payloadUser);
                alert('Aprovisionamiento completado exitosamente.');
                this.render();
            } catch (error) {
                if (errP2) errP2.textContent = error.response?.data?.detail || error.message;
            }
        };

        if (formPersona) formPersona.addEventListener('submit', this.eventoFormPersona);
        if (formUsuario) formUsuario.addEventListener('submit', this.eventoFormUsuario);
    }

    avanzarFaseUsuario(persona) {
        this.curpPersonaCreada = persona.curp;
        
        const txtPersona = this.container.querySelector('#txt-persona-vinculada');
        const fPersona = this.container.querySelector('#form-persona-fase');
        const fUsuario = this.container.querySelector('#form-usuario-fase');
        const s1Label = this.container.querySelector('#step-1-label');
        const s2Label = this.container.querySelector('#step-2-label');

        if (txtPersona) txtPersona.textContent = `${persona.nombres} [${persona.curp}]`;
        if (fPersona) fPersona.style.display = 'none';
        if (fUsuario) fUsuario.style.display = 'flex';
        
        if (s1Label) {
            s1Label.style.color = 'var(--text-muted)';
            s1Label.style.fontWeight = 'normal';
        }
        if (s2Label) {
            s2Label.style.color = 'var(--text-main)';
            s2Label.style.fontWeight = 'bold';
        }
    }

    unmount() {
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