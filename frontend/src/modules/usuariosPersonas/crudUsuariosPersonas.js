import authStore from '/src/core/store/authStore.js';
import { CrudPersonas } from '/src/modules/usuariosPersonas/components/CrudPersonas.js';
import { CrudUsuarios } from '/src/modules/usuariosPersonas/components/CrudUsuarios.js';

export class CrudUsuariosPersonas {
    constructor(containerId) {
        this.containerId = containerId;
        this.crudPersonas = null;
        this.crudUsuarios = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const estadoAuth = authStore.getSnapshot();
        const permisos = estadoAuth?.capabilities || [];
        
        const puedeVerPersonas = permisos.includes('personas:crear');
        const puedeVerUsuarios = permisos.includes('usuarios:crear');

        if (!puedeVerPersonas && !puedeVerUsuarios) {
            this._renderAccesoDenegado(container);
            return;
        }

        this._renderLayout(container, puedeVerPersonas, puedeVerUsuarios);

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
            <div class="forbidden-container">
                <strong>Acceso Denegado:</strong> Su perfil no cuenta con capacidades para administrar identidades o credenciales.
            </div>
        `;
    }

    _renderLayout(container, verPersonas, verUsuarios) {
        container.innerHTML = `
            <div class="module-card">
                <!-- Navegación de Pestañas Adaptativa -->
                <div style="display: flex; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 20px;">
                    ${verPersonas ? `<button class="tab-btn active" data-target="container-crud-personas" style="padding: 10px 15px; border:none; background:none; border-bottom: 3px solid var(--primary); color:var(--primary); font-weight:bold; cursor:pointer;">Gestión de Personas (Demografía)</button>` : ''}
                    ${verUsuarios ? `<button class="tab-btn ${!verPersonas ? 'active' : ''}" data-target="container-crud-usuarios" style="padding: 10px 15px; border:none; background:none; border-bottom: ${!verPersonas ? '3px solid var(--primary)' : '3px solid transparent'}; color:${!verPersonas ? 'var(--primary)' : 'var(--text-muted)'}; font-weight:${!verPersonas ? 'bold' : 'normal'}; cursor:pointer;">Gestión de Usuarios (Credenciales)</button>` : ''}
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
                botones.forEach(b => {
                    b.style.borderBottom = '3px solid transparent';
                    b.style.color = 'var(--text-muted)';
                    b.style.fontWeight = 'normal';
                });
                contenidos.forEach(c => c.style.display = 'none');

                const targetId = e.target.getAttribute('data-target');
                e.target.style.borderBottom = '3px solid var(--primary)';
                e.target.style.color = 'var(--primary)';
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