import { ubicacionesService } from '../services/ubicaciones.js';

export class SelectorUbicacion {
    /**
     * @param {string} containerId 
     */
    constructor(containerId) {
        this.containerId = containerId;
        this.domSelect = document.createElement('select');
        this.domSelect.className = 'form-select-custom';
        this.domSelect.name = 'id_aula_destino';
    }

    async inicializar() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.innerHTML = '<span>Cargando infraestructura institucional...</span>';
        
        try {
            const catalogos = await ubicacionesService.obtenerCatalogosUnificados();
            
            container.innerHTML = '';
            this.domSelect.innerHTML = '<option value="">-- Seleccione el Aula de Destino --</option>';

            catalogos.aulas.forEach(aula => {
                const option = document.createElement('option');
                option.value = aula.id_entidad;
                option.textContent = aula.nombre;
                this.domSelect.appendChild(option);
            });

            container.appendChild(this.domSelect);
        } catch (error) {
            container.innerHTML = '<span class="text-error">Error al cargar catálogos de infraestructura</span>';
        }
    }

    obtenerValor() {
        return this.domSelect.value;
    }
}