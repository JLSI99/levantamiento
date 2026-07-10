import { ubicacionesService } from '../services/ubicaciones.js';

export class SelectorUbicaciones {
    constructor(containerId) {
        this.containerId = containerId;
        this.activeFetchId = 0;
        this.estaDesmontado = false;
        this.onCrearUbicacionInlineBound = null;
        
        this.selectEdificio = document.createElement('select');
        this._aplicarEstiloBaseSelect(this.selectEdificio);

        this.selectAula = document.createElement('select');
        this._aplicarEstiloBaseSelect(this.selectAula);

        this.selectDepartamento = document.createElement('select');
        this._aplicarEstiloBaseSelect(this.selectDepartamento);
    }

    _aplicarEstiloBaseSelect(el) {
        el.style.padding = '6px';
        el.style.border = '1px solid #bdbdbd';
        el.style.borderRadius = '4px';
        el.style.background = 'white';
        el.style.fontSize = '12px';
        el.style.flex = '1';
    }

    _obtenerUsuarioAutenticado() {
        try {
            const sesionRaw = localStorage.getItem('usuario_sesion');
            if (!sesionRaw) return null;
            return JSON.parse(sesionRaw);
        } catch (e) {
            return null;
        }
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

            const divContenedorEstructural = document.createElement('div');
            divContenedorEstructural.style.display = 'flex';
            divContenedorEstructural.style.flexDirection = 'column';
            divContenedorEstructural.style.gap = '10px';
            divContenedorEstructural.style.width = '100%';

            const divFlexSelects = document.createElement('div');
            divFlexSelects.style.display = 'flex';
            divFlexSelects.style.gap = '10px';
            divFlexSelects.style.width = '100%';
            
            divFlexSelects.appendChild(this.selectEdificio);
            divFlexSelects.appendChild(this.selectAula);
            divFlexSelects.appendChild(this.selectDepartamento);
            
            divContenedorEstructural.appendChild(divFlexSelects);

            // Blindaje RBAC: Solo el Administrador ve el disparador del módulo de creación
            const usuario = this._obtenerUsuarioAutenticado();
            const esAdmin = usuario?.roles?.some(r => parseInt(r.id_rol, 10) === 1);

            if (esAdmin) {
                const linkAdminUbicaciones = document.createElement('a');
                linkAdminUbicaciones.href = '#/infraestructura/maestro';
                linkAdminUbicaciones.id = 'lnk-crear-ubicacion-inline';
                linkAdminUbicaciones.style.fontSize = '11px';
                linkAdminUbicaciones.style.color = '#3f51b5';
                linkAdminUbicaciones.style.textDecoration = 'none';
                linkAdminUbicaciones.style.fontWeight = '700';
                linkAdminUbicaciones.style.alignSelf = 'flex-start';
                linkAdminUbicaciones.textContent = '+ Dar de Alta Nuevos Catálogos Físicos (Exclusivo Administrador)';
                
                this.onCrearUbicacionInlineBound = (e) => {
                    e.preventDefault();
                    alert("Redirección controlada al módulo maestro de infraestructura central para instanciar Edificios/Aulas.");
                };
                linkAdminUbicaciones.addEventListener('click', this.onCrearUbicacionInlineBound);
                divContenedorEstructural.appendChild(linkAdminUbicaciones);
            }
            
            container.appendChild(divContenedorEstructural);

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
        const linkBtn = document.getElementById('lnk-crear-ubicacion-inline');
        if (linkBtn && this.onCrearUbicacionInlineBound) {
            linkBtn.removeEventListener('click', this.onCrearUbicacionInlineBound);
        }
    }
}