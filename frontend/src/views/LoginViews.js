import { authService } from '../services/auth.js';
import authStore from '../store/authStore.js';

/**
 * Vista de autenticación perimetral.
 * Garantiza el flujo secuencial estricto de resolución de tokens.
 */
export class LoginView {
    constructor(containerId) {
        this.containerId = containerId;
        this.onLoginSubmitBound = null;
    }

    render() {
        const root = document.getElementById(this.containerId);
        if (!root) return;

        root.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; min-height:100vh; background-color:var(--bg-main);">
                <div class="wizard-container" style="padding:30px; width:100%; max-width:400px; box-sizing:border-box;">
                    <div style="text-align:center; margin-bottom:20px;">
                        <h2 style="color:var(--primary); margin:0; font-size:20px;">TecNM - Inventarios</h2>
                        <p style="color:var(--text-muted); font-size:12px; margin-top:5px;">Control Patrimonial de Activos Fijos</p>
                    </div>
                    <form id="form-login" style="display:flex; flex-direction:column; gap:15px;">
                        <div>
                            <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Identificador Institucional</label>
                            <input type="text" id="login-username" class="form-input-custom" required style="width:100%; padding:8px; box-sizing:border-box;" placeholder="Usuario o correo">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600;">Contraseña</label>
                            <input type="password" id="login-password" class="form-input-custom" required style="width:100%; padding:8px; box-sizing:border-box;" placeholder="••••••••">
                        </div>
                        <button type="submit" id="btn-login-submit" class="btn-primary" style="padding:10px; font-size:14px; margin-top:5px;">Acceder al Sistema</button>
                        <div id="login-error" class="text-error" style="font-size:12px; text-align:center; min-height:18px;"></div>
                    </form>
                </div>
            </div>
        `;

        this.vincularEventos();
    }

    vincularEventos() {
        const form = document.getElementById('form-login');
        if (!form) return;

        this.onLoginSubmitBound = async (e) => {
            e.preventDefault();
            
            const errDiv = document.getElementById('login-error');
            const submitBtn = document.getElementById('btn-login-submit');
            if (errDiv) errDiv.textContent = '';
            
            const userInp = document.getElementById('login-username').value;
            const passInp = document.getElementById('login-password').value;

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Autenticando en el perímetro...';
                }

                // Paso 1: Intercambio de credenciales por tokens de acceso/refresco
                const tokenData = await authService.login(userInp, passInp);
                
                // Paso 2: Inicializar sesión parcial en memoria y LocalStorage.
                // Esto garantiza que el interceptor de Axios inyecte la cabecera en el paso siguiente.
                authStore.setSession(tokenData.access_token, tokenData.refresh_token, null, []);

                // Paso 3: Consumir el contexto criptográfico /me con las cabeceras ya alineadas
                const contextMe = await authService.obtenerContextoMe();
                
                // Paso 4: Consolidar la sesión completa con los datos de usuario y capacidades evaluadas
                authStore.setSession(
                    tokenData.access_token,
                    tokenData.refresh_token,
                    contextMe.usuario, // Mapeado directo a la estructura Out del BFF
                    contextMe.capabilities
                );

            } catch (error) {
                // Si falla en cualquier punto intermedio, limpiamos rastros parciales de tokens
                authStore.clearSession();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Acceder al Sistema';
                }
                if (errDiv) {
                    errDiv.textContent = error.response?.data?.detail || 'Error de conexión perimetral o denegación de acceso.';
                }
            }
        };

        form.addEventListener('submit', this.onLoginSubmitBound);
    }

    unmount() {
        const form = document.getElementById('form-login');
        if (form && this.onLoginSubmitBound) {
            form.removeEventListener('submit', this.onLoginSubmitBound);
        }
    }
}