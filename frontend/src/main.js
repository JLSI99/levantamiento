import authStore from './store/authStore.js';
import { SelectorUbicacion } from './components/SelectorUbicacion.js';
import { AsistenteAlta } from './components/AsistenteAlta.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando Kernel del Frontend...');
    
    // Escuchar eventos globales de expiración definitiva relanzados por el cliente HTTP
    window.addEventListener('auth-expired', () => {
        mostrarPantallaLogin();
    });

    // Validar el contexto criptográfico de la sesión al arranque de la SPA
    const sesionValida = await authStore.checkSessionContext();

    if (sesionValida) {
        inicializarDashboardSistema();
    } else {
        mostrarPantallaLogin();
    }
});

function mostrarPantallaLogin() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    appContainer.innerHTML = `
        <div class="login-frame">
            <h2>Sistema de Levantamiento de Bienes - Acceso Perimetral</h2>
            <input type="text" id="login-username" placeholder="Usuario" autocomplete="username">
            <input type="password" id="login-pass" placeholder="Contraseña" autocomplete="current-password">
            <button id="btn-ingresar">Iniciar Sesión</button>
        </div>
    `;

    // Microtarea diferida para asegurar la existencia del elemento en el DOM antes de asignar el evento
    setTimeout(() => {
        const btnIngresar = document.getElementById('btn-ingresar');
        if (!btnIngresar) return;

        btnIngresar.onclick = async () => {
            const u = document.getElementById('login-username').value;
            const p = document.getElementById('login-pass').value;
            
            if (!u || !p) {
                alert('Por favor complete todos los campos de acceso.');
                return;
            }

            try {
                const exito = await authStore.login(u, p);
                if (exito) {
                    inicializarDashboardSistema();
                } else {
                    alert('La pasarela de autenticación denegó el acceso.');
                }
            } catch (err) {
                alert('Credenciales incorrectas o falla en la comunicación con el BFF.');
            }
        };
    }, 0);
}

function inicializarDashboardSistema() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;
    
    // Estructura base del Dashboard operativo institucional
    appContainer.innerHTML = `
        <header class="main-header">
            <h1>Panel de Control de Inventario Central</h1>
            <button id="btn-cerrar-sesion">Cerrar Sesión Perimetral</button>
        </header>
        <main class="dashboard-grid">
            <section class="widget-box">
                <h3>Asignación Rápida de Ubicación</h3>
                <div id="wrapper-selector-infraestructura"></div>
            </section>
            
            <section class="widget-box">
                <h3>Módulo de Gestión Humana Directa</h3>
                <div id="wrapper-asistente-alta"></div>
            </section>
        </main>
    `;

    document.getElementById('btn-cerrar-sesion').onclick = () => authStore.logout();

    // Inicializar e hidratar de forma asíncrona los componentes del panel
    const selectorUbicacion = new SelectorUbicacion('wrapper-selector-infraestructura');
    selectorUbicacion.inicializar();

    const asistente = new AsistenteAlta('wrapper-asistente-alta');
    asistente.render();
}