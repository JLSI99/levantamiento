import authStore from '../store/authStore.js';

/**
 * @returns {HTMLDivElement}
 */
export function renderLoginView() {
    const loginFrame = document.createElement('div');
    loginFrame.className = 'login-frame';
    loginFrame.innerHTML = `
        <h2>Sistema de Gestión de Activos Fijos</h2>
        <form id="form-login-ejecucion">
            <input type="text" id="login-username" placeholder="Usuario Institucional o Email" required autocomplete="username">
            <input type="password" id="login-password" placeholder="Contraseña" required autocomplete="current-password">
            <button type="submit" id="btn-login-submit">Iniciar Sesión</button>
            <div id="login-error-output" class="text-error" style="margin-top: 15px; text-align: center; color: #ff3b30; font-family: monospace; font-size: 13px;"></div>
        </form>
    `;

    loginFrame.querySelector('#form-login-ejecucion').onsubmit = async (e) => {
        e.preventDefault();
        const username = loginFrame.querySelector('#login-username').value;
        const password = loginFrame.querySelector('#login-password').value;
        const errorOutput = loginFrame.querySelector('#login-error-output');
        const submitBtn = loginFrame.querySelector('#btn-login-submit');

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Autenticando en Perímetro...';
            errorOutput.textContent = '';

            await authStore.login(username, password);
        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                if (status === 422) {
                    console.error('Detalle de validación Pydantic (422):', data.detail);
                    errorOutput.textContent = 'Error 422: Contrato de datos inválido ante el BFF.';
                } else if (data && data.detail) {
                    errorOutput.textContent = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
                } else {
                    errorOutput.textContent = `Error del servidor (${status}): Operación rechazada.`;
                }
            } else {
                errorOutput.textContent = 'Falla crítica de red o caída perimetral del BFF.';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    };

    return loginFrame;
}