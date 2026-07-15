import authStore from '../../store/authStore.js';
import { bienesService } from '../../services/bienes.js'; 
import { SelectorUbicaciones } from '../../components/SelectorUbicaciones.js';

export class AltaBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this.selectorUbicaciones = null;
        this.ubicacionActual = null;
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
                        Su token institucional no cuenta con la capacidad ['bienes:crear'] necesaria para indexar activos patrimoniales.
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
                    Módulo operativo para el registro físico y catalogación estructural de activos fijos del Instituto Tecnológico de México.
                </p>

                <form id="form-alta-bien">
                    <div class="form-group-row">
                        <div style="flex:2;">
                            <label>Descripción Completa del Activo</label>
                            <input type="text" name="descripcion" placeholder="Ej. Monitor Dell UltraSharp 27" required>
                        </div>
                        <div>
                            <label>Número de Serie de Fábrica</label>
                            <input type="text" name="numero_serie" class="input-monospace" placeholder="Ej. CN-0XGV70-..." required>
                        </div>
                    </div>

                    <div class="form-group-row">
                        <div>
                            <label>Marca</label>
                            <input type="text" name="marca" placeholder="Dell">
                        </div>
                        <div>
                            <label>Modelo</label>
                            <input type="text" name="modelo" placeholder="U2723QE">
                        </div>
                        <div>
                            <label>Estado Físico Inicial</label>
                            <select name="estado">
                                <option value="Excelente">Excelente / Nuevo</option>
                                <option value="Bueno" selected>Bueno / Funcional</option>
                                <option value="Regular">Regular / Desgaste</option>
                                <option value="Malo">Malo / Requiere Mantenimiento</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-divider-section">
                        <span>Destino Topológico e Institucional</span>
                        <div id="contenedor-selector-ubicacion-alta"></div>
                    </div>

                    <button type="submit" id="btn-submit-alta" class="btn-primary" style="margin-top:10px;">
                        Dar de Alta en Catálogo Patrimonial
                    </button>
                    <div id="alta-error-feedback" class="text-error" style="text-align:right;"></div>
                </form>
            </div>
        `;

        const subContainer = container.querySelector('#contenedor-selector-ubicacion-alta');
        this.selectorUbicaciones = new SelectorUbicaciones(subContainer, (geoData) => {
            this.ubicacionActual = geoData;
        });
        await this.selectorUbicaciones.inicializar();
        
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

            if (!this.ubicacionActual || !this.ubicacionActual.id_edificio || !this.ubicacionActual.id_aula || !this.ubicacionActual.id_departamento) {
                if (feedback) feedback.textContent = "Error: Es mandatorio mapear el destino topológico completo (Edificio, Aula y Departamento).";
                return;
            }

            const formData = new FormData(form);
            const payload = {
                descripcion: formData.get('descripcion').trim(),
                numero_serie: formData.get('numero_serie').trim(),
                marca: formData.get('marca').trim() || null,
                modelo: formData.get('modelo').trim() || null,
                estado: formData.get('estado'),
                id_edificio: this.ubicacionActual.id_edificio,
                id_aula: this.ubicacionActual.id_aula,
                id_departamento: this.ubicacionActual.id_departamento
            };

            try {
                if (btn) { btn.disabled = true; btn.textContent = 'Indexando Activo...'; }
                await bienesService.crearNuevoBien(payload); 
                alert('El activo ha sido indexado exitosamente en la matriz de control patrimonial.');
                form.reset();
                if (this.selectorUbicaciones) {
                    await this.selectorUbicaciones.inicializar();
                }
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
        if (this.selectorUbicaciones) {
            this.selectorUbicaciones.unmount();
        }
    }
}