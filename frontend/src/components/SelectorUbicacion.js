// src/components/SelectorUbicacion.js
import { ubicacionesService } from '../services/ubicaciones.js';

export class SelectorUbicacion {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.domSelect = document.createElement('select');
        this.domSelect.className = 'form-select-custom';
        this.domSelect.name = 'id_aula_destino';
    }

    async inicializar() {
        this.container.innerHTML = '<span>Cargando infraestructura institucional...</span>';
        
        try {
            // Petición única al BFF (internamente utiliza asyncio.gather)
            const catalogos = await ubicacionesService.obtenerCatalogosUnificados();
            
            this.container.innerHTML = ''; // Limpiar indicador de carga
            this.domSelect.innerHTML = '<option value="">-- Seleccione el Aula de Destino --</option>';

            // Renderizar las aulas unificadas e hidratadas por el BFF con formato compuesto: "Aula (Edificio)"
            catalogos.aulas.forEach(aula => {
                const option = document.createElement('option');
                option.value = aula.id_entidad;
                option.textContent = aula.nombre; // Trae el formato "Laboratorio A (Edificio K)"
                this.domSelect.appendChild(option);
            });

            this.container.appendChild(this.domSelect);
        } catch (error) {
            this.container.innerHTML = '<span class="text-error">Error al cargar catálogos de infraestructura</span>';
        }
    }

    obtenerValor() {
        return this.domSelect.value;
    }
}