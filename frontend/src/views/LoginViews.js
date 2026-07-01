import authStore from '../store/authStore.js';

export function renderLoginView() {
    const loginFrame = document.createElement('div');
    loginFrame.className = 'login-frame';
    loginFrame.innerHTML = `
        <h2>Sistema de Gestión de Activos Fijos</h2>
        <form id="form-login-ejecucion">
            <input type="text" id="login-username" placeholder="Usuario Institucional" required autocomplete="username">
            <input type="password" id="login-password" placeholder="Contraseña" required autocomplete="current-password">
            <button type="submit" id="btn-login-submit">Iniciar Sesión</button>
            <div id="login-error-output" class="text-error" style="margin-top: 15px; text-align: center;"></div>
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
            errorOutput.textContent = error.response?.data?.detail || 'Falla crítica de comunicación con el BFF.';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Iniciar Sesión';
        }
    };

    return loginFrame;
}