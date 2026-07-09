import { ubicacionesService } from '../services/ubicaciones.js';

export class SelectorUbicacion {
    constructor(containerId) {
        this.containerId = containerId;
        this.activeFetchId = 0;
        this.estaDesmontado = false;
        
        this.selectEdificio = document.createElement('select');
        this.selectEdificio.className = 'form-select-custom';
        this.selectEdificio.style.padding = '6px';

        this.selectAula = document.createElement('select');
        this.selectAula.className = 'form-select-custom';
        this.selectAula.style.padding = '6px';

        this.selectDepartamento = document.createElement('select');
        this.selectDepartamento.className = 'form-select-custom';
        this.selectDepartamento.style.padding = '6px';
    }

    async inicializar() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        this.activeFetchId++;
        const currentFetchId = this.activeFetchId;
        
        container.innerHTML = '<span style="font-size:12px; color:var(--text-muted);">Cargando topología estructural...</span>';
        
        try {
            const catalogos = await ubicacionesService.obtenerCatalogosUnificados();
            
            if (this.estaDesmontado || currentFetchId !== this.activeFetchId) return;
            
            container.innerHTML = '';

            this.selectEdificio.innerHTML = '<option value="">-- Edificio --</option>';
            catalogos.edificios.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id_entidad;
                opt.textContent = e.nombre;
                this.selectEdificio.appendChild(opt);
            });

            this.selectAula.innerHTML = '<option value="">-- Aula / Laboratorio --</option>';
            catalogos.aulas.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id_entidad;
                opt.textContent = a.nombre;
                this.selectAula.appendChild(opt);
            });

            this.selectDepartamento.innerHTML = '<option value="">-- Departamento --</option>';
            catalogos.departamentos.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id_entidad;
                opt.textContent = d.nombre;
                this.selectDepartamento.appendChild(opt);
            });

            const divFlex = document.createElement('div');
            divFlex.style.display = 'flex';
            divFlex.style.gap = '10px';
            divFlex.appendChild(this.selectEdificio);
            divFlex.appendChild(this.selectAula);
            divFlex.appendChild(this.selectDepartamento);
            
            container.appendChild(divFlex);
        } catch (error) {
            if (!this.estaDesmontado && currentFetchId === this.activeFetchId) {
                container.innerHTML = '<span class="text-error">Error de carga topográfica</span>';
            }
        }
    }

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