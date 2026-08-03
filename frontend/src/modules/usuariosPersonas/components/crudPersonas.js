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

        const regexNombres = "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\\s]+$";
        const regexCurp = "^[A-Za-z]{4}\\d{6}[HMhm][A-Za-z]{2}[B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z]{3}[A-Za-z\\d]\\d$";

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                ${this.puedeCrear ? `
                <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px;">
                    <h4 style="margin-top:0; color:#424242;">Registrar Persona</h4>
                    <form id="form-persona">
                        <input type="text" name="curp" placeholder="CURP" required 
                            pattern="${regexCurp}" minlength="18" maxlength="18" 
                            title="Debe ser una CURP válida de 18 caracteres"
                            style="width:100%; margin-bottom:10px; padding:8px; text-transform: uppercase;">
                            
                        <input type="text" name="nombres" placeholder="Nombres" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <input type="text" name="apellidos" placeholder="Apellidos" required 
                            pattern="${regexNombres}" minlength="2" maxlength="100"
                            title="Solo letras, espacios y caracteres acentuados permitidos"
                            style="width:100%; margin-bottom:10px; padding:8px;">
                            
                        <button type="submit" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; cursor:pointer;">Guardar Persona</button>
                    </form>
                </div>` : '<div style="color:#757575; font-style:italic;">No tiene permisos para crear personas.</div>'}
                
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
                        curp: formData.get('curp').toUpperCase().trim(),
                        nombres: formData.get('nombres').trim(),
                        apellidos: formData.get('apellidos').trim()
                    });
                    alert('Persona registrada con éxito');
                    form.reset();
                    this.cargarDatos();
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
            const resp = await adminService.listarPersonas(50, 0, false);
            const personas = Array.isArray(resp) ? resp : (resp?.data || []);
            tbody.innerHTML = personas.map(p => `
                <tr style="border-bottom:1px solid #e0e0e0;">
                    <td style="padding:8px; font-family:monospace;">${p.curp}</td>
                    <td style="padding:8px;">${p.apellidos}, ${p.nombres}</td>
                </tr>
            `).join('');
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="2" style="color:red;">Error al cargar datos</td></tr>';
        }
    }
}