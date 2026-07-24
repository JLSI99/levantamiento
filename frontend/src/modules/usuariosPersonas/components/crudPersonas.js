import { adminService } from '../services/admin.js';

export class CrudPersonas {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || [];
        this.puedeCrear = this.permisos.includes('personas:crear');
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                <!-- Formulario de Alta -->
                ${this.puedeCrear ? `
                <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <h4 style="margin-top:0; color:#424242;">Registrar Persona</h4>
                    <form id="form-persona">
                        <input type="text" name="curp" placeholder="CURP" required style="width:100%; margin-bottom:10px; padding:8px;">
                        <input type="text" name="nombres" placeholder="Nombres" required style="width:100%; margin-bottom:10px; padding:8px;">
                        <input type="text" name="apellidos" placeholder="Apellidos" required style="width:100%; margin-bottom:10px; padding:8px;">
                        <button type="submit" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; cursor:pointer;">Guardar Persona</button>
                    </form>
                </div>` : '<div style="color:#757575; font-style:italic;">No tiene permisos para crear personas.</div>'}
                
                <!-- Tabla de Listado -->
                <div>
                    <h4 style="margin-top:0; color:#424242;">Catálogo Demográfico</h4>
                    <table style="width:100%; border-collapse:collapse; font-size:12px;">
                        <thead>
                            <tr style="background:#f5f5f5; text-align:left;">
                                <th style="padding:8px;">CURP</th>
                                <th style="padding:8px;">Nombre Completo</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-personas">
                            <tr><td colspan="2">Cargando...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        if (!this.puedeCrear) return;
        const form = document.getElementById('form-persona');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                try {
                    await adminService.crearPersona({
                        curp: formData.get('curp').toUpperCase(),
                        nombres: formData.get('nombres'),
                        apellidos: formData.get('apellidos')
                    });
                    alert('Persona registrada con éxito');
                    form.reset();
                    this.cargarDatos(); // Recargar tabla
                } catch (error) {
                    alert('Error al registrar persona: ' + (error.response?.data?.detail || error.message));
                }
            });
        }
    }

    async cargarDatos() {
        const tbody = document.getElementById('tbody-personas');
        if (!tbody) return;
        try {
            const personas = await adminService.listarPersonas(50, 0, false);
            tbody.innerHTML = personas.map(p => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px;">${p.curp}</td>
                    <td style="padding:8px;">${p.apellidos}, ${p.nombres}</td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="2" style="color:red;">Error al cargar datos</td></tr>';
        }
    }

    unmount() {
        // Limpieza de listeners si fuera necesario
    }
}