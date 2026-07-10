import { ubicacionesService } from '../services/ubicaciones.js';

export class SelectorUbicaciones {
    constructor(containerId) {
        this.containerId = containerId;
        this.activeFetchId = 0;
        this.estaDesmontado = false;
        
        this.selectEdificio = document.createElement('select');
        this.selectEdificio.style.padding = '6px';
        this.selectEdificio.style.border = '1px solid #bdbdbd';
        this.selectEdificio.style.borderRadius = '4px';
        this.selectEdificio.style.background = 'white';
        this.selectEdificio.style.fontSize = '12px';
        this.selectEdificio.style.flex = '1';

        this.selectAula = document.createElement('select');
        this.selectAula.style.padding = '6px';
        this.selectAula.style.border = '1px solid #bdbdbd';
        this.selectAula.style.borderRadius = '4px';
        this.selectAula.style.background = 'white';
        this.selectAula.style.fontSize = '12px';
        this.selectAula.style.flex = '1';

        this.selectDepartamento = document.createElement('select');
        this.selectDepartamento.style.padding = '6px';
        this.selectDepartamento.style.border = '1px solid #bdbdbd';
        this.selectDepartamento.style.borderRadius = '4px';
        this.selectDepartamento.style.background = 'white';
        this.selectDepartamento.style.fontSize = '12px';
        this.selectDepartamento.style.flex = '1';
    }

    async inicializar() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        this.activeFetchId++;
        const currentFetchId = this.activeFetchId;
        
        container.innerHTML = '<span style="font-size:12px; color:#757575;">Cargando catálogo topológico del BFF...</span>';
        
        try {
            const catalogos = await ubicacionesService.obtenerCatalogosUnificados();
            
            if (this.estaDesmontado || currentFetchId !== this.activeFetchId) return;
            
            container.innerHTML = '';

            this.selectEdificio.innerHTML = '<option value="">-- Seleccione Edificio --</option>';
            if (catalogos && Array.isArray(catalogos.edificios)) {
                catalogos.edificios.forEach(e => {
                    const opt = document.createElement('option');
                    opt.value = e.id_entidad;
                    opt.textContent = e.nombre;
                    this.selectEdificio.appendChild(opt);
                });
            }

            this.selectAula.innerHTML = '<option value="">-- Seleccione Aula --</option>';
            if (catalogos && Array.isArray(catalogos.aulas)) {
                catalogos.aulas.forEach(a => {
                    const opt = document.createElement('option');
                    opt.value = a.id_entidad;
                    opt.textContent = a.nombre;
                    this.selectAula.appendChild(opt);
                });
            }

            this.selectDepartamento.innerHTML = '<option value="">-- Seleccione Departamento --</option>';
            if (catalogos && Array.isArray(catalogos.departamentos)) {
                catalogos.departamentos.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id_entidad;
                    opt.textContent = d.nombre;
                    this.selectDepartamento.appendChild(opt);
                });
            }

            const divFlex = document.createElement('div');
            divFlex.style.display = 'flex';
            divFlex.style.gap = '10px';
            divFlex.style.width = '100%';
            
            divFlex.appendChild(this.selectEdificio);
            divFlex.appendChild(this.selectAula);
            divFlex.appendChild(this.selectDepartamento);
            
            container.appendChild(divFlex);

        } catch (error) {
            if (!this.estaDesmontado && currentFetchId === this.activeFetchId) {
                container.innerHTML = '<span style="color:#c62828; font-size:12px; font-weight:600;">Error crítico: No se pudo recuperar la topología de ubicaciones del BFF.</span>';
                console.error('Fallo en la resolución del catálogo unificado:', error);
            }
        }
    }

    /**
     * @returns {{id_edificio: (string|null), id_aula: (string|null), id_departamento: (string|null)}}
     */
    obtenerValoresEstructurales() {
        return {
            id_edificio: this.selectEdificio.value || null,
            id_aula: this.selectAula.value || null,
            id_departamento: this.selectDepartamento.value || null
        };
    }

    unmount() {
        this.estaDesmontado = true;
        this.activeFetchId++; 
    }
}