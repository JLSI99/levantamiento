import { bienesService } from '../../services/bienes.js';
import { SelectorUbicacion } from '../../components/SelectorUbicaciones.js';

export class AltaBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this.selectorUbicacion = null;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="wizard-container" style="padding:20px; max-width:600px;">
                <h3 style="margin-top:0; color:var(--primary); font-size:16px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">Alta e Indexación de Activos Fijos</h3>
                <form id="form-alta-bien" style="display:flex; flex-direction:column; gap:12px; margin-top:15px;">
                    <div style="display:flex; gap:10px;">
                        <input type="text" id="bien-codigo" placeholder="Código de Inventario Único" required style="flex-grow:1; padding:6px;">
                        <input type="text" id="bien-marca" placeholder="Marca" required style="padding:6px; width:150px;">
                    </div>
                    <input type="text" id="bien-descripcion" placeholder="Descripción Detallada del Activo (Características, Número de Serie)" required style="padding:6px;">
                    
                    <div style="border:1px dashed var(--border-color); padding:10px; border-radius:4px;">
                        <label style="display:block; font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px;">DESTINO TOPOLÓGICO INICIAL</label>
                        <div id="wrapper-selector-ubicacion"></div>
                    </div>

                    <button type="submit" class="btn-primary" style="padding:10px; align-self:flex-end; width:180px;">Registrar Físicamente</button>
                    <div id="alta-bien-error" class="text-error" style="font-size:12px;"></div>
                </form>
            </div>
        `;

        this.selectorUbicacion = new SelectorUbicacion('wrapper-selector-ubicacion');
        this.selectorUbicacion.inicializar();
        this.vincularEventos();
    }

    vincularEventos() {
        const form = document.getElementById('form-alta-bien');
        const errDiv = document.getElementById('alta-bien-error');

        form.onsubmit = async (e) => {
            e.preventDefault();
            errDiv.textContent = '';

            const geoData = this.selectorUbicacion.obtenerValoresEstructurales();
            const payload = {
                codigo_inventario: document.getElementById('bien-codigo').value.trim().toUpperCase(),
                descripcion: document.getElementById('bien-descripcion').value,
                marca: document.getElementById('bien-marca').value,
                id_edificio: geoData.id_edificio,
                id_aula: geoData.id_aula,
                id_departamento: geoData.id_departamento
            };

            try {
                await bienesService.crear(payload);
                alert('Activo fijo registrado e indexado estructuralmente en el inventario.');
                this.render();
            } catch (error) {
                errDiv.textContent = error.response?.data?.detail || 'Error de consistencia en el payload enviado.';
            }
        };
    }
}