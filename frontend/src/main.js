import authStore from './store/auhtStore.js';
import { authService } from './services/auth.js';
import { bienesService } from './services/bienes.js';
import { resguardosService } from './services/resguardos.js';
import { adminService } from './services/admin.js';

import { SelectorUbicacion } from './components/SelectorUbicacion.js';
import { AsistenteAlta } from './components/AsistenteAlta.js';
import { guardElement } from './components/CanRender.js';

class AppOrchestrator {
    constructor() {
        this.appContainer = document.getElementById('app');
        this.selectorUbicacionGlobal = null;
    }

    inicializar() {
        authStore.subscribe((state) => {
            this.renderizarSegunEstado(state);
        });

        this.verificarSesionExistente();
    }

    async verificarSesionExistente() {
        try {
            const contexto = await authService.obtenerContextoMe();
            authStore.setState({
                isAuthenticated: true,
                user: contexto.usuario,
                capabilities: contexto.capacidades || []
            });
        } catch (error) {
            console.log('Sin sesión activa previa, direccionando a pasarela de acceso.');
            authStore.setState({ isAuthenticated: false, user: null, capabilities: [] });
        }
    }

    renderizarSegunEstado(state) {
        this.appContainer.innerHTML = '';

        if (!state.isAuthenticated) {
            this.montarPantallaLogin();
        } else {
            this.montarEstructuraDashboard(state);
        }
    }

    montarPantallaLogin() {
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

                const datosSesion = await authService.login(username, password);
                
                authStore.setState({
                    isAuthenticated: true,
                    user: datosSesion.user,
                    capabilities: datosSesion.capabilities
                });
            } catch (error) {
                errorOutput.textContent = error.response?.data?.detail || 'Falla crítica de comunicación con el BFF.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Iniciar Sesión';
            }
        };

        this.appContainer.appendChild(loginFrame);
    }

    montarEstructuraDashboard(state) {
        const header = document.createElement('header');
        header.className = 'main-header';
        header.innerHTML = `
            <h1>Ecosistema de Control de Activos - TecNM</h1>
            <div style="display: flex; align-items: center; gap: 20px;">
                <span>Usuario: <strong>${state.user?.username || 'Operador'}</strong></span>
                <button id="btn-cerrar-sesion">Cerrar Sesión</button>
            </div>
        `;

        header.querySelector('#btn-cerrar-sesion').onclick = async () => {
            await authService.logout();
            authStore.setState({ isAuthenticated: false, user: null, capabilities: [] });
        };

        this.appContainer.appendChild(header);

        const grid = document.createElement('main');
        grid.className = 'dashboard-grid';

        grid.appendChild(this.crearModuloAltaBienes());
        grid.appendChild(this.crearModuloAsistenteAdministrativo());
        grid.appendChild(this.crearModuloHistorialResguardos());

        this.appContainer.appendChild(grid);
    }

    crearModuloAltaBienes() {
        const widget = document.createElement('section');
        widget.className = 'widget-box';
        widget.innerHTML = `
            <h3>Levantamiento Físico de Bienes</h3>
            <form id="form-alta-bien">
                <input type="text" name="numero_serie" placeholder="Número de Serie / Identificador Único" required>
                <input type="text" name="descripcion" placeholder="Descripción Detallada del Activo" required>
                <input type="text" name="marca" placeholder="Marca" required>
                <input type="text" name="modelo" placeholder="Modelo" required>
                
                <label style="font-size: 12px; color: var(--text-muted);">Estado Físico Operacional:</label>
                <select name="estado_fisico" required>
                    <option value="EXCELENTE">Excelente</option>
                    <option value="REGULAR">Regular</option>
                    <option value="MALO">Malo</option>
                    <option value="CHATARRA">Chatarra</option>
                </select>

                <div id="contenedor-selector-ubicacion"></div>
                <button type="submit">Persistir Activo en ms-bienes</button>
                <div id="bien-feedback" style="margin-top:10px;"></div>
            </form>
        `;

        const contenedorUbicacion = widget.querySelector('#contenedor-selector-ubicacion');
        const idUnicoSelector = `select-aula-${Math.random().toString(36).substring(2, 9)}`;
        contenedorUbicacion.id = idUnicoSelector;
        
        this.selectorUbicacionGlobal = new SelectorUbicacion(idUnicoSelector);
        this.selectorUbicacionGlobal.inicializar();

        widget.querySelector('#form-alta-bien').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const feedback = widget.querySelector('#bien-feedback');
            const idAula = this.selectorUbicacionGlobal.obtenerValor();

            if (!idAula) {
                feedback.className = 'text-error';
                feedback.textContent = 'Error: Debe especificar un aula de destino institucional.';
                return;
            }

            const formData = new FormData(form);
            const payload = {
                numero_serie: formData.get('numero_serie'),
                descripcion: formData.get('descripcion'),
                marca: formData.get('marca'),
                modelo: formData.get('modelo'),
                estado_fisico: formData.get('estado_fisico'),
                id_aula: idAula
            };

            try {
                feedback.className = 'text-success';
                feedback.textContent = 'Enviando payload al BFF...';
                await bienesService.crear(payload);
                feedback.textContent = 'Activo registrado exitosamente en el inventario.';
                form.reset();
            } catch (error) {
                feedback.className = 'text-error';
                feedback.textContent = `Fallo de persistencia: ${error.response?.data?.detail || error.message}`;
            }
        };

        return guardElement('OP_REGISTRAR_BIENES', widget);
    }

    crearModuloAsistenteAdministrativo() {
        const widget = document.createElement('section');
        widget.className = 'widget-box';
        const innerContainer = document.createElement('div');
        const containerId = `wizard-${Math.random().toString(36).substring(2, 9)}`;
        innerContainer.id = containerId;
        widget.appendChild(innerContainer);

        setTimeout(() => {
            const asistente = new AsistenteAlta(containerId);
            asistente.render();
        }, 0);

        return guardElement('OP_ADMIN_USUARIOS', widget);
    }

    crearModuloHistorialResguardos() {
        const widget = document.createElement('section');
        widget.className = 'widget-box';
        widget.innerHTML = `
            <h3>Matriz Global de Resguardos Institucionales</h3>
            <div id="tabla-resguardos-loader" style="font-size: 13px; color: var(--text-muted);">Consultando ms-resguardos...</div>
            <div class="table-responsive" style="max-height: 300px; overflow-y: auto; display:none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border); background-color: var(--bg-main);">
                            <th style="padding: 8px;">Activo ID</th>
                            <th style="padding: 8px;">CURP Resguardatario</th>
                            <th style="padding: 8px;">Estatus</th>
                        </tr>
                    </thead>
                    <tbody id="resguardos-rows-target"></tbody>
                </table>
            </div>
        `;

        const loader = widget.querySelector('#tabla-resguardos-loader');
        const tableContainer = widget.querySelector('.table-responsive');
        const rowsTarget = widget.querySelector('#resguardos-rows-target');

        (async () => {
            try {
                const resguardosData = await resguardosService.listarTodosLosResguardosInstitucionales({
                    limit: 20,
                    offset: 0,
                    soloVigentes: false
                });

                loader.style.display = 'none';
                tableContainer.style.display = 'block';
                rowsTarget.innerHTML = '';

                if (!resguardosData || resguardosData.length === 0) {
                    rowsTarget.innerHTML = `<tr><td colspan="3" style="padding: 10px; text-align: center; color: var(--text-muted);">No existen contratos de resguardo activos.</td></tr>`;
                    return;
                }

                resguardosData.forEach(resguardo => {
                    const row = document.createElement('tr');
                    row.style.borderBottom = '1px solid var(--border)';
                    row.innerHTML = `
                        <td style="padding: 8px; font-family: monospace;">${resguardo.id_bien || 'N/A'}</td>
                        <td style="padding: 8px;">${resguardo.curp_resguardatario || resguardo.curp || 'N/A'}</td>
                        <td style="padding: 8px;">
                            <span class="${resguardo.esta_activo ? 'text-success' : 'text-error'}">
                                ${resguardo.esta_activo ? 'Vigente' : 'Concluido'}
                            </span>
                        </td>
                    `;
                    rowsTarget.appendChild(row);
                });
            } catch (error) {
                loader.className = 'text-error';
                loader.textContent = 'Error al consultar la matriz de resguardos distributed.';
            }
        })();

        return guardElement('OP_LEER_RESGUARDOS', widget);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new AppOrchestrator();
    app.inicializar();
});