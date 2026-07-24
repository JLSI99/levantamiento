import authStore from '../../store/authStore.js';
import { bienesService } from '../../services/bienes.js'; 

export class AltaBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this.eventoFormSubmit = null;
    }

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const estadoAuth = authStore.getSnapshot();
        const usuario = estadoAuth?.user;
        const capabilities = estadoAuth?.capabilities || [];
        const permisos = usuario?.permisos || [];

        const esAdmin = usuario && (usuario.rol === 1 || usuario.rol_id === 1);
        
        const puedeRegistrar = esAdmin || 
                               permisos.includes('bienes:crear') || 
                               capabilities.includes('bienes:create') || 
                               capabilities.includes('bienes:crear');

        if (!puedeRegistrar) {
            container.innerHTML = `
                <div class="forbidden-container" style="padding: 20px; background: #ffebee; border: 1px solid #c62828; border-radius: 4px; margin-top: 20px; font-family: sans-serif;">
                    <h4 style="color:#c62828; margin: 0 0 10px 0; font-weight: 700;">ACCESO DENEGADO (403 FORBIDDEN)</h4>
                    <p style="font-size: 13px; color: #37474f; margin: 0;">
                        Su token institucional no cuenta con la capacidad necesaria para indexar activos patrimoniales.
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="module-card">
                <h3 style="margin-top:0; color:var(--primary); font-size:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px; font-weight:700;">
                    Indexación de Nuevos Bienes Patrimoniales (Alta de Activos)
                </h3>
                <p style="font-size:12px; color:#546e7a; margin:8px 0 15px 0; font-weight: 500;">
                    Módulo operativo para el registro físico y catalogación estructural de activos fijos. La ubicación y resguardo se gestionan en su módulo correspondiente.
                </p>

                <form id="form-alta-bien">
                    <div class="form-group-row" style="display:flex; gap:15px; margin-bottom:10px;">
                        <div style="flex:2;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Descripción Completa del Activo *</label>
                            <input type="text" name="descripcion" placeholder="Ej. Monitor Dell UltraSharp 27" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Número de Serie</label>
                            <input type="text" name="serie" class="input-monospace" placeholder="Ej. CN-0XGV70-..." style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <div class="form-group-row" style="display:flex; gap:15px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Marca</label>
                            <input type="text" name="marca" placeholder="Dell" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Modelo</label>
                            <input type="text" name="modelo" placeholder="U2723QE" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <div class="form-group-row" style="display:flex; gap:15px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Costo (MXN) *</label>
                            <input type="number" step="0.01" name="costo" placeholder="0.00" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Fecha de Adquisición</label>
                            <input type="date" name="fecha_adquisicion" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">ID Tipo de Bien (UUID) *</label>
                            <input type="text" name="tipos_ids" placeholder="Ej. 123e4567-e89b-..." required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                    </div>

                    <button type="submit" id="btn-submit-alta" class="btn-primary" style="background:#1a237e; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer;">
                        Dar de Alta en Catálogo Patrimonial
                    </button>
                    <div id="alta-error-feedback" class="text-error" style="text-align:right; color:#c62828; margin-top:10px; font-size:12px;"></div>
                </form>
            </div>
        `;

        this.vincularEventos();
    }

    vincularEventos() {
        const form = document.getElementById('form-alta-bien');
        if (!form) return;

        this.eventoFormSubmit = async (e) => {
            e.preventDefault();
            const feedback = document.getElementById('alta-error-feedback');
            const btn = document.getElementById('btn-submit-alta');
            if (feedback) feedback.textContent = '';

            const formData = new FormData(form);
            
            // Mapeo estricto contra el schema BienCreateBFF
            const payload = {
                descripcion: formData.get('descripcion').trim(),
                serie: formData.get('serie').trim() || null,
                marca: formData.get('marca').trim() || null,
                modelo: formData.get('modelo').trim() || null,
                costo: parseFloat(formData.get('costo')),
                fecha_adquisicion: formData.get('fecha_adquisicion') || null,
                tipos_ids: [formData.get('tipos_ids').trim()] // El backend espera un array de UUIDs
            };

            try {
                if (btn) { btn.disabled = true; btn.textContent = 'Indexando Activo...'; }
                await bienesService.crearNuevoBien(payload); 
                alert('El activo ha sido indexado exitosamente en la matriz central. Ya puede ser asignado en el módulo de Resguardos.');
                form.reset();
            } catch (err) {
                if (feedback) {
                    feedback.textContent = err.response?.data?.detail || "Fallo de validación estructural en la pasarela del BFF.";
                }
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = 'Dar de Alta en Catálogo Patrimonial'; }
            }
        };

        form.addEventListener('submit', this.eventoFormSubmit);
    }

    unmount() {
        const form = document.getElementById('form-alta-bien');
        if (form && this.eventoFormSubmit) {
            form.removeEventListener('submit', this.eventoFormSubmit);
        }
    }
}