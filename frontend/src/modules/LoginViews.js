import { authService } from '/src/services/auth.js';
import authStore from '/src/core/store/authStore.js';

export class LoginView {
    constructor(containerId) {
        this.containerId = containerId;
        this.onLoginSubmitBound = null;
        this.onInputChangeBound = null;
    }

    render() {
        const root = document.getElementById(this.containerId);
        if (!root) return;

        root.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; min-height:100vh; background-color:var(--bg-main, #f4f6f9);">
                <div class="wizard-container" style="padding:30px; width:100%; max-width:400px; box-sizing:border-box; background:#ffffff; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                    <div style="text-align:center; margin-bottom:20px;">
                        <h2 style="color:var(--primary, #1a237e); margin:0; font-size:20px; font-weight:700;">TecNM - Inventarios</h2>
                        <p style="color:var(--text-muted, #546e7a); font-size:12px; margin-top:5px; font-weight:500;">Control Patrimonial de Activos Fijos</p>
                    </div>
                    
                    <form id="form-login" style="display:flex; flex-direction:column; gap:15px;">
                        <div id="login-error-container" style="display:none; padding:10px 12px; background-color:#ffebee; border:1px solid #ef9a9a; border-radius:4px; color:#c62828; font-size:12px; font-weight:500; text-align:left; transition: all 0.2s ease;"></div>

                        <div>
                            <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600; color:#37474f;">Identificador Institucional</label>
                            <input type="text" id="login-username" class="form-input-custom" required style="width:100%; padding:9px 10px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; font-size:13px; outline:none; transition:border-color 0.2s;" placeholder="Usuario o correo">
                        </div>
                        <div>
                            <label style="display:block; font-size:12px; margin-bottom:5px; font-weight:600; color:#37474f;">Contraseña</label>
                            <input type="password" id="login-password" class="form-input-custom" required style="width:100%; padding:9px 10px; box-sizing:border-box; border:1px solid #ccc; border-radius:4px; font-size:13px; outline:none; transition:border-color 0.2s;" placeholder="••••••••">
                        </div>
                        <button type="submit" id="btn-login-submit" class="btn-primary" style="padding:10px; font-size:14px; margin-top:5px; background:#1a237e; color:#ffffff; border:none; border-radius:4px; font-weight:600; cursor:pointer; transition:all 0.2s;">Acceder al Sistema</button>
                    </form>
                </div>
            </div>
        `;

        this.vincularEventos();
    }

    vincularEventos() {
        const form = document.getElementById('form-login');
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');
        if (!form) return;

        this.onInputChangeBound = () => this._limpiarEstadoError();
        if (userInput) userInput.addEventListener('input', this.onInputChangeBound);
        if (passInput) passInput.addEventListener('input', this.onInputChangeBound);

        this.onLoginSubmitBound = async (e) => {
            e.preventDefault();
            
            this._limpiarEstadoError();
            
            const submitBtn = document.getElementById('btn-login-submit');
            const userInpVal = userInput ? userInput.value.trim() : '';
            const passInpVal = passInput ? passInput.value : '';

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Autenticando en el perímetro...';
                    submitBtn.style.opacity = '0.7';
                    submitBtn.style.cursor = 'not-allowed';
                }

                const tokenData = await authService.login(userInpVal, passInpVal);
                
                authStore.setSession(
                    tokenData.access_token, 
                    tokenData.refresh_token, 
                    null, 
                    [], 
                    []
                );

                const contextMe = await authService.obtenerContextoMe();
                
                authStore.setSession(
                    tokenData.access_token,
                    tokenData.refresh_token,
                    contextMe.usuario || contextMe.user || null,
                    contextMe.capabilities || contextMe.caps || [],
                    contextMe.roles || (contextMe.usuario?.roles) || []
                );

            } catch (error) {
                authStore.clearSession();
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Acceder al Sistema';
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                }

                this._mostrarError(error);
            }
        };

        form.addEventListener('submit', this.onLoginSubmitBound);
    }

    _mostrarError(error) {
        const errContainer = document.getElementById('login-error-container');
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');

        let mensajeError = 'Error de conexión perimetral o denegación de acceso.';

        if (error.response) {
            const status = error.response.status;
            const detail = error.response.data?.detail || error.response.data?.mensaje;

            if (status === 401) {
                mensajeError = typeof detail === 'string' ? detail : 'Credenciales inválidas. Verifique su usuario y contraseña.';
            } else if (status === 403) {
                mensajeError = typeof detail === 'string' ? detail : 'Usuario inactivo o sin autorización para acceder al sistema.';
            } else if (status === 429) {
                mensajeError = 'Cuota de intentos rebasada. Por favor, espere un momento antes de reintentar.';
            } else if (status === 502 || status === 503 || status === 504) {
                mensajeError = 'Servicio de autenticación no disponible temporalmente. Intente más tarde.';
            } else if (typeof detail === 'string') {
                mensajeError = detail;
            }
        } else if (error.message) {
            mensajeError = 'No se pudo establecer comunicación con la pasarela de autenticación.';
        }

        if (errContainer) {
            errContainer.innerHTML = `<strong>⚠️ Error de Autenticación:</strong><br>${mensajeError}`;
            errContainer.style.display = 'block';
        }

        if (userInput) userInput.style.borderColor = '#d32f2f';
        if (passInput) passInput.style.borderColor = '#d32f2f';
    }

    _limpiarEstadoError() {
        const errContainer = document.getElementById('login-error-container');
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');

        if (errContainer) {
            errContainer.innerHTML = '';
            errContainer.style.display = 'none';
        }

        if (userInput) userInput.style.borderColor = '#ccc';
        if (passInput) passInput.style.borderColor = '#ccc';
    }

    unmount() {
        const form = document.getElementById('form-login');
        const userInput = document.getElementById('login-username');
        const passInput = document.getElementById('login-password');

        if (form && this.onLoginSubmitBound) {
            form.removeEventListener('submit', this.onLoginSubmitBound);
        }
        if (userInput && this.onInputChangeBound) {
            userInput.removeEventListener('input', this.onInputChangeBound);
        }
        if (passInput && this.onInputChangeBound) {
            passInput.removeEventListener('input', this.onInputChangeBound);
        }
    }
}