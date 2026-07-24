import authStore from '../store/authStore.js';
import { CrudPersonas } from '../../components/CrudPersonas.js';
import { CrudUsuarios } from '../../components/CrudUsuarios.js';

export class AdministracionOrquestador {
    constructor(containerId) {
        this.containerId = containerId;
        this.crudPersonas = null;
        this.crudUsuarios = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // 1. Validar Capacidades (Seguridad centralizada)
        const estadoAuth = authStore.getSnapshot();
        const permisos = estadoAuth?.capabilities || [];
        
        // Verifica si puede ver al menos uno de los módulos
        const puedeVerPersonas = permisos.includes('personas:leer');
        const puedeVerUsuarios = permisos.includes('usuarios:leer');

        if (!puedeVerPersonas && !puedeVerUsuarios) {
            this._renderAccesoDenegado(container);
            return;
        }

        // 2. Renderizar el Layout (Contenedores y Pestañas)
        this._renderLayout(container, puedeVerPersonas, puedeVerUsuarios);

        // 3. Instanciar e inicializar los CRUDs hijos en sus contenedores
        if (puedeVerPersonas) {
            this.crudPersonas = new CrudPersonas('container-crud-personas', permisos);
            this.crudPersonas.render();
        }

        if (puedeVerUsuarios) {
            this.crudUsuarios = new CrudUsuarios('container-crud-usuarios', permisos);
            this.crudUsuarios.render();
        }

        this._configurarTabs();
    }

    _renderAccesoDenegado(container) {
        container.innerHTML = `
            <div style="padding:20px; background:#ffebee; border:1px solid #ef9a9a; color:#c62828; border-radius:4px;">
                <strong>Acceso Denegado:</strong> Su perfil no cuenta con capacidades para administrar identidades o credenciales.
            </div>
        `;
    }

    _renderLayout(container, verPersonas, verUsuarios) {
        container.innerHTML = `
            <div style="background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px;">
                <!-- Navegación de Pestañas -->
                <div style="display: flex; gap: 10px; border-bottom: 1px solid #e0e0e0; margin-bottom: 20px;">
                    ${verPersonas ? `<button class="tab-btn active" data-target="container-crud-personas" style="padding: 10px 15px; border:none; background:none; border-bottom: 3px solid #1a237e; color:#1a237e; font-weight:bold; cursor:pointer;">Gestión de Personas (Demografía)</button>` : ''}
                    ${verUsuarios ? `<button class="tab-btn ${!verPersonas ? 'active' : ''}" data-target="container-crud-usuarios" style="padding: 10px 15px; border:none; background:none; border-bottom: ${!verPersonas ? '3px solid #1a237e' : '3px solid transparent'}; color:${!verPersonas ? '#1a237e' : '#757575'}; font-weight:${!verPersonas ? 'bold' : 'normal'}; cursor:pointer;">Gestión de Usuarios (Credenciales)</button>` : ''}
                </div>

                <!-- Contenedores de los CRUDs -->
                ${verPersonas ? `<div id="container-crud-personas" class="tab-content" style="display: block;"></div>` : ''}
                ${verUsuarios ? `<div id="container-crud-usuarios" class="tab-content" style="display: ${!verPersonas ? 'block' : 'none'};"></div>` : ''}
            </div>
        `;
    }

    _configurarTabs() {
        const botones = document.querySelectorAll('.tab-btn');
        const contenidos = document.querySelectorAll('.tab-content');

        botones.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Quitar active de todos
                botones.forEach(b => {
                    b.style.borderBottom = '3px solid transparent';
                    b.style.color = '#757575';
                    b.style.fontWeight = 'normal';
                });
                contenidos.forEach(c => c.style.display = 'none');

                // Activar el clickeado
                const targetId = e.target.getAttribute('data-target');
                e.target.style.borderBottom = '3px solid #1a237e';
                e.target.style.color = '#1a237e';
                e.target.style.fontWeight = 'bold';
                document.getElementById(targetId).style.display = 'block';
            });
        });
    }

    unmount() {
        if (this.crudPersonas) this.crudPersonas.unmount();
        if (this.crudUsuarios) this.crudUsuarios.unmount();
    }
}