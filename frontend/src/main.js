// src/main.js
import authStore from './store/authStore.js';
import { SelectorUbicacion } from './components/SelectorUbicacion.js';
import { AsistenteAlta } from './components/AsistenteAlta.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando Kernel del Frontend...');
    
    // Escuchar eventos globales de expiración lanzados por el cliente HTTP
    window.addEventListener('auth-expired', () => {
        mostrarPantallaLogin();
    });

    // Validar de manera síncrona/asíncrona el contexto criptográfico de la sesión
    const sesionValida = await authStore.checkSessionContext();

    if (sesionValida) {
        inicializarDashboardSistema();
    } else {
        mostrarPantallaLogin();
    }
});

function mostrarPantallaLogin() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = `
        <div class="login-frame">
            <h2>Sistema de Levantamiento de Bienes - Acceso Perimetral</h2>
            <input type="text" id="login-username" placeholder="Usuario">
            <input type="password" id="login-pass" placeholder="Contraseña">
            <button id="btn-ingresar">Iniciar Sesión</button>
        </div>
    `;

    document.getElementById('btn-ingresar').onclick = async () => {
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-pass').value;
        try {
            const exito = await authStore.login(u, p);
            if (exito) inicializarDashboardSistema();
        } catch (err) {
            alert('Credenciales incorrectas rechazadas por la pasarela de autenticación.');
        }
    };
}

function inicializarDashboardSistema() {
    const appContainer = document.getElementById('app');
    
    // Estructura base limpia del Dashboard operativo
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

    // Inicializar el Selector Unificado de Ubicaciones Hidratado
    const selectorUbicacion = new SelectorUbicacion('wrapper-selector-infraestructura');
    selectorUbicacion.inicializar();

    // Inicializar el Flujo Bifásico Administrador (Persona -> Usuario)
    const asistente = new AsistenteAlta('wrapper-asistente-alta');
    asistente.render();
}