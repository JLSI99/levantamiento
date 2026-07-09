import { AsistenteAlta } from '../../components/AsistenteAlta.js';
import { adminService } from '../../services/admin.js';

export class AsistenteAdmin {
    constructor(containerId) {
        this.containerId = containerId;
        this.altaComponent = null;
        this.onTablaClickBound = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                <div>
                    <h3 style="margin-top:0; font-size:15px; color:var(--primary);">Nuevo Operador Institucional</h3>
                    <div id="sub-container-wizard"></div>
                </div>
                
                <div class="wizard-container" style="padding:15px; background:white;">
                    <h3 style="margin-top:0; font-size:15px; color:var(--primary);">Cuentas Activas ($\le 50$ Concurrencia)</h3>
                    <div style="max-height:400px; overflow-y:auto; margin-top:10px;">
                        <table style="width:100%; border-collapse:collapse; font-size:12px;" id="tabla-usuarios">
                            <thead>
                                <tr style="background-color:var(--bg-main); text-align:left;">
                                    <th style="padding:6px; border:1px solid var(--border-color);">Usuario</th>
                                    <th style="padding:6px; border:1px solid var(--border-color);">Email</th>
                                    <th style="padding:6px; border:1px solid var(--border-color);">Acción</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const subWizard = document.getElementById('sub-container-wizard');
        this.altaComponent = new AsistenteAlta(subWizard);
        this.altaComponent.render();
        this.cargarListaUsuarios();
    }

    async cargarListaUsuarios() {
        const tabla = document.getElementById('tabla-usuarios');
        if (!tabla) return;
        const tbody = tabla.querySelector('tbody');
        if (!tbody) return;

        try {
            const usuarios = await adminService.listarUsuarios(50, 0, false);
            tbody.innerHTML = '';
            
            usuarios.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding:6px; border:1px solid var(--border-color); font-weight:600;">${this._escapeHtml(user.username)}</td>
                    <td style="padding:6px; border:1px solid var(--border-color); color:var(--text-muted);">${this._escapeHtml(user.email)}</td>
                    <td style="padding:6px; border:1px solid var(--border-color);">
                        <button class="btn-baja" data-id="${user.id_usuario}" style="background-color:var(--text-error); color:white; border:none; padding:3px 6px; border-radius:3px; cursor:pointer; font-size:11px;">Suspender</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            this.vincularTabla();
        } catch (error) {
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-error); padding:10px;">Fallo al conectar con ms-auth</td></tr>';
            }
        }
    }

    vincularTabla() {
        const tabla = document.getElementById('tabla-usuarios');
        if (!tabla) return;

        if (this.onTablaClickBound) {
            tabla.removeEventListener('click', this.onTablaClickBound);
        }

        this.onTablaClickBound = async (e) => {
            if (e.target.classList.contains('btn-baja')) {
                const id = e.target.getAttribute('data-id');
                if (confirm('¿Aplicar revocación criptográfica y baja lógica a esta cuenta digital?')) {
                    try {
                        await adminService.darBajaUsuario(id);
                        this.cargarListaUsuarios();
                    } catch (err) {
                        alert('Incapacidad de aplicar directiva de exclusión.');
                    }
                }
            }
        };

        tabla.addEventListener('click', this.onTablaClickBound);
    }

    _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    unmount() {
        const tabla = document.getElementById('tabla-usuarios');
        if (tabla && this.onTablaClickBound) {
            tabla.removeEventListener('click', this.onTablaClickBound);
        }
        if (this.altaComponent) {
            this.altaComponent.unmount();
        }
    }
}