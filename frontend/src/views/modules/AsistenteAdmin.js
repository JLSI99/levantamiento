import { AsistenteAlta } from '../../components/AsistenteAlta.js';
import { adminService } from '../../services/admin.js';

export class AsistenteAdmin {
    constructor(containerId) {
        this.containerId = containerId;
        this.altaComponent = null;
        this.onTablaClickBound = null;
    }

    _obtenerUsuarioAutenticado() {
        try {
            const sesionRaw = localStorage.getItem('usuario_sesion');
            if (!sesionRaw) return null;
            return JSON.parse(sesionRaw);
        } catch (e) {
            return null;
        }
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const usuario = this._obtenerUsuarioAutenticado();
        const esAdmin = usuario?.roles?.some(r => parseInt(r.id_rol, 10) === 1);

        if (!esAdmin) {
            container.innerHTML = `
                <div style="padding:30px; background:#fff3e0; border:1px solid #ffe0b2; border-radius:6px; color:#e65100; font-family:sans-serif;">
                    <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:700; text-transform:uppercase;">Infracción de Capas Directivas (403 Forbidden)</h4>
                    <p style="margin:0; font-size:12px; line-height:1.5;">Su cuenta operativa actual no posee el rol jerárquico de Administrador General. El aprovisionamiento de personal e identidades digitales queda estrictamente denegado.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: 1.2fr 1.8fr; gap:20px; align-items: start;">
                <div style="background: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin-top:0; font-size:15px; color:#1a237e; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; font-weight:700;">
                        Aprovisionamiento de Personal
                    </h3>
                    <div id="sub-container-wizard-alta"></div>
                </div>
                
                <div style="padding:20px; background:white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <h3 style="margin-top:0; font-size:15px; color:#1a237e; border-bottom: 1px solid #e0e0e0; padding-bottom: 8px; font-weight:700;">
                        Cuentas y Credenciales de Operadores Activos
                    </h3>
                    <div style="max-height:450px; overflow-y:auto; margin-top:12px; border: 1px solid #e0e0e0; border-radius:4px;">
                        <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;" id="tabla-usuarios-sistema">
                            <thead>
                                <tr style="background-color:#f5f5f5; border-bottom: 1px solid #e0e0e0;">
                                    <th style="padding:10px; color: #424242; font-weight:700;">Username</th>
                                    <th style="padding:10px; color: #424242; font-weight:700;">Correo Electrónico</th>
                                    <th style="padding:10px; color: #424242; font-weight:700;">Roles Asignados</th>
                                    <th style="padding:10px; color: #424242; font-weight:700; text-align:center;">Estado Operativo</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="4" style="text-align:center; padding:15px; color:#757575;">Consultando identidades concurrentes ante el BFF...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const subWizard = document.getElementById('sub-container-wizard-alta');
        this.altaComponent = new AsistenteAlta(subWizard);
        this.altaComponent.render();
        
        this.cargarListaUsuarios();
    }

    async cargarListaUsuarios() {
        const tabla = document.getElementById('tabla-usuarios-sistema');
        if (!tabla) return;
        const tbody = tabla.querySelector('tbody');
        if (!tbody) return;

        try {
            const respuestaBFF = await adminService.listarUsuarios(50, 0, false);
            tbody.innerHTML = '';
            
            const usuarios = Array.isArray(respuestaBFF) ? respuestaBFF : (respuestaBFF?.data || []);

            if (usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#757575;">No existen cuentas de acceso dadas de alta.</td></tr>';
                return;
            }

            usuarios.forEach(user => {
                const nombresRoles = user.roles && Array.isArray(user.roles) 
                    ? user.roles.map(r => r.nombre_rol).join(', ') 
                    : 'Sin rol asignado';

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #e0e0e0';
                tr.innerHTML = `
                    <td style="padding:10px; font-weight:600; color: #212121; font-family:monospace;">${this._escapeHtml(user.username)}</td>
                    <td style="padding:10px; color:#616161;">${this._escapeHtml(user.email)}</td>
                    <td style="padding:10px; color:#455a64; font-size:11px;">${this._escapeHtml(nombresRoles)}</td>
                    <td style="padding:10px; text-align:center;">
                        ${user.is_active 
                            ? `<button class="btn-revocacion" data-id="${user.id_usuario}" style="background-color:#c62828; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px; font-weight: 600;">Suspender</button>`
                            : `<span style="color:#757575; background-color:#e0e0e0; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600;">Inactivo</span>`
                        }
                    </td>
                `;
                tbody.appendChild(tr);
            });

            this.vincularTabla();
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#c62828; padding:15px; font-weight:600;">Error de interconexión con el módulo de administración del BFF.</td></tr>';
            console.error('Fallo en la resolución del censo de usuarios:', error);
        }
    }

    vincularTabla() {
        const tabla = document.getElementById('tabla-usuarios-sistema');
        if (!tabla) return;

        if (this.onTablaClickBound) {
            tabla.removeEventListener('click', this.onTablaClickBound);
        }

        this.onTablaClickBound = async (e) => {
            if (e.target.classList.contains('btn-revocacion')) {
                const idUsuario = e.target.getAttribute('data-id');
                if (confirm('¿Desea revocar el token de acceso y aplicar una baja lógica a esta cuenta? El operador perderá privilegios de manera inmediata.')) {
                    try {
                        await adminService.darBajaUsuario(idUsuario);
                        alert('La cuenta ha sido suspendida en la base de datos central de identidades.');
                        this.cargarListaUsuarios();
                    } catch (err) {
                        alert('Error operativo: No se logró completar la directiva de exclusión lógica.');
                    }
                }
            }
        };

        tabla.addEventListener('click', this.onTablaClickBound);
    }

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    unmount() {
        const tabla = document.getElementById('tabla-usuarios-sistema');
        if (tabla && this.onTablaClickBound) {
            tabla.removeEventListener('click', this.onTablaClickBound);
        }
        if (this.altaComponent) {
            this.altaComponent.unmount();
        }
    }
}