import { bienesService } from '../../services/bienes.js';
import { SelectorUbicacion } from '../../components/SelectorUbicaciones.js';

/**
 * Componente funcional de negocio encargado de la indexación perimetral de activos fijos.
 */
export class AltaBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this.selectorUbicacion = null;
        this.onFormSubmitBound = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="wizard-container" style="padding:20px; max-width:600px;">
                <h3 style="margin-top:0; color:var(--primary); font-size:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Alta e Indexación de Activos Fijos</h3>
                <form id="form-alta-bien" style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
                    <div style="display:flex; gap:10px;">
                        <div style="flex-grow:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600;">Código Patrimonial Único</label>
                            <input type="text" id="bien-codigo" placeholder="Ej. ITCO-1024-NX" required style="width:100%; padding:6px; box-sizing:border-box;">
                        </div>
                        <div style="width:150px;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600;">Marca</label>
                            <input type="text" id="bien-marca" placeholder="Ej. Dell, HP" required style="width:100%; padding:6px; box-sizing:border-box;">
                        </div>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600;">Descripción Detallada del Activo</label>
                        <input type="text" id="bien-descripcion" placeholder="Características técnicas, número de serie, modelo del componente" required style="width:100%; padding:6px; box-sizing:border-box;">
                    </div>
                    
                    <div style="border:1px dashed var(--border-color); padding:15px; border-radius:4px; background-color:var(--bg-main);">
                        <label style="display:block; font-size:11px; font-weight:bold; color:var(--primary); margin-bottom:10px; letter-spacing:0.5px;">DESTINO TOPOLÓGICO INICIAL</label>
                        <div id="wrapper-selector-ubicacion"></div>
                    </div>

                    <button type="submit" id="btn-alta-bien-submit" class="btn-primary" style="padding:10px; align-self:flex-end; width:180px; font-weight:600;">Registrar Físicamente</button>
                    <div id="alta-bien-error" class="text-error" style="font-size:12px; margin-top:5px; min-height:16px;"></div>
                </form>
            </div>
        `;

        // Instanciación del subcomponente jerárquico inyectado en el DOM dedicado
        this.selectorUbicacion = new SelectorUbicacion('wrapper-selector-ubicacion');
        this.selectorUbicacion.inicializar();
        
        this.vincularEventos();
    }

    vincularEventos() {
        const form = document.getElementById('form-alta-bien');
        if (!form) return;

        this.onFormSubmitBound = async (e) => {
            e.preventDefault();
            
            const errDiv = document.getElementById('alta-bien-error');
            const submitBtn = document.getElementById('btn-alta-bien-submit');
            if (errDiv) errDiv.textContent = '';

            // Extracción de la data estructural del selector jerárquico
            const geoData = this.selectorUbicacion.obtenerValoresEstructurales();
            
            // Validación estricta de asignación antes del envío
            if (!geoData.id_edificio || !geoData.id_aula || !geoData.id_departamento) {
                if (errDiv) errDiv.textContent = 'Error: Debe definir la jerarquía completa del destino topológico (Edificio -> Aula -> Departamento).';
                return;
            }

            const payload = {
                codigo_inventario: document.getElementById('bien-codigo').value.trim().toUpperCase(),
                descripcion: document.getElementById('bien-descripcion').value.trim(),
                marca: document.getElementById('bien-marca').value.trim(),
                id_edificio: geoData.id_edificio,
                id_aula: geoData.id_aula,
                id_departamento: geoData.id_departamento
            };

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Indexando en BD...';
                }

                // Comunicación perimetral con el microservicio correspondiente vía el BFF
                await bienesService.crear(payload);
                
                alert('Activo fijo registrado de manera exitosa e indexado estructuralmente en el inventario institucional.');
                
                // Limpieza e invalidación visual del formulario mediante re-renderizado
                this.render();
                
            } catch (error) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Registrar Físicamente';
                }
                if (errDiv) {
                    errDiv.textContent = error.response?.data?.detail || 'Error de consistencia o denegación de permisos en el payload enviado.';
                }
            }
        };

        form.addEventListener('submit', this.onFormSubmitBound);
    }

    unmount() {
        const form = document.getElementById('form-alta-bien');
        if (form && this.onFormSubmitBound) {
            form.removeEventListener('submit', this.onFormSubmitBound);
        }
        if (this.selectorUbicacion && typeof this.selectorUbicacion.unmount === 'function') {
            this.selectorUbicacion.unmount();
        }
    }
}