import bffClient from '../api/client.js';

export class AsistenteAlta {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.idPersonaCreada = null;
        this.curpPersonaCreada = null;
    }

    render() {
        this.container.innerHTML = `
            <div class="wizard-container">
                <div class="steps-indicator">
                    <span id="step-1-label" class="step-active">Paso 1: Identidad Humana (Persona)</span>
                    <span id="step-2-label" class="step-inactive">Paso 2: Cuenta de Acceso Digital</span>
                </div>
                
                <form id="form-persona-fase">
                    <h3>Registro de Datos Personales (ms-personas)</h3>
                    <input type="text" name="curp" placeholder="CURP (18 caracteres)" required maxlength="18">
                    <input type="text" name="nombres" placeholder="Nombres" required>
                    <input type="text" name="apellidos" placeholder="Apellidos" required>
                    <button type="submit">Validar y Registrar Persona</button>
                </form>

                <form id="form-usuario-fase" style="display: none;">
                    <h3>Creación de Credenciales de Acceso (ms-auth)</h3>
                    <p>Asignando cuenta de acceso para: <strong id="txt-persona-vinculada"></strong></p>
                    <input type="text" id="inp-username" placeholder="Nombre de Usuario Institucional" required>
                    <input type="email" id="inp-email" placeholder="Correo Electrónico" required>
                    <input type="password" id="inp-password" placeholder="Contraseña Temporal" required>
                    <button type="submit">Asignar Cuenta y Roles</button>
                </form>
            </div>
        `;

        this.vincularEventos();
    }

    vincularEventos() {
        const formPersona = this.container.querySelector('#form-persona-fase');
        const formUsuario = this.container.querySelector('#form-usuario-fase');

        formPersona.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(formPersona);
            const payload = {
                curp: formData.get('curp').toUpperCase(),
                nombres: formData.get('nombres'),
                apellidos: formData.get('apellidos')
            };

            try {
                const response = await bffClient.post('/admin/personas', payload);
                const persona = response.data;

                this.idPersonaCreada = persona.id_persona;
                this.curpPersonaCreada = persona.curp;

                this.container.querySelector('#txt-persona-vinculada').textContent = `${persona.nombres} ${persona.apellidos}`;
                formPersona.style.display = 'none';
                formUsuario.style.display = 'block';
                
                this.container.querySelector('#step-1-label').className = 'step-done';
                this.container.querySelector('#step-2-label').className = 'step-active';
            } catch (error) {
                alert(`Error al registrar la identidad física: ${error.response?.data?.detail || error.message}`);
            }
        };

        formUsuario.onsubmit = async (e) => {
            e.preventDefault();
            const payloadUser = {
                username: this.container.querySelector('#inp-username').value,
                email: this.container.querySelector('#inp-email').value,
                password: this.container.querySelector('#inp-password').value,
                curp: this.curpPersonaCreada
            };

            try {
                await bffClient.post('/admin/usuarios', payloadUser);
                alert('Flujo completo finalizado con éxito. Identidad y cuenta digital vinculadas.');
                this.render();
            } catch (error) {
                alert(`Error al generar la credencial digital: ${error.response?.data?.detail || error.message}`);
            }
        };
    }
}