import { ubicacionesService } from '../services/ubicaciones.js'; 

export class SelectorUbicaciones {
    constructor(containerElement, onUbicacionSeleccionada) {
        this.container = containerElement;
        this.onSeleccion = onUbicacionSeleccionada;
        this.edificios = [];
        this.aulas = [];
        this.departamentos = [];
        
        this.estadoSeleccion = {
            id_edificio: null,
            id_aula: null,
            id_departamento: null
        };

        this.onEdificioChangeBound = null;
        this.onAulaChangeBound = null;
        this.onDeptoChangeBound = null;
    }

    async inicializar() {
        if (!this.container) return;
        this.renderBase();
        await this.cargarEdificios();
        await this.cargarDepartamentos();
        this.vincularEventos();
    }

    renderBase() {
        this.container.innerHTML = `
            <div style="display:flex; gap:10px; margin-bottom:10px; width: 100%;">
                <div style="flex:1;">
                    <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Edificio *</label>
                    <select id="sel-edificio" required style="width:100%; padding:6px; font-size:12px; border:1px solid #bdbdbd; border-radius:4px; background:white;">
                        <option value="">Seleccione Edificio...</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Aula / Espacio *</label>
                    <select id="sel-aula" required disabled style="width:100%; padding:6px; font-size:12px; border:1px solid #bdbdbd; border-radius:4px; background:white;">
                        <option value="">Seleccione Aula...</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:#424242;">Departamento Adscrito *</label>
                    <select id="sel-departamento" required style="width:100%; padding:6px; font-size:12px; border:1px solid #bdbdbd; border-radius:4px; background:white;">
                        <option value="">Seleccione Departamento...</option>
                    </select>
                </div>
            </div>
        `;
    }

    async cargarEdificios() {
        try {
            const respuesta = await ubicacionesService.obtenerEdificios();
            this.edificios = Array.isArray(respuesta) ? respuesta : (respuesta?.data || []);
            
            const sel = this.container.querySelector('#sel-edificio');
            if (!sel) return;
            
            this.edificios.forEach(e => {
                const opt = document.createElement('option');
                opt.value = e.id_edificio || e.id_entidad; 
                opt.textContent = e.nombre;
                sel.appendChild(opt);
            });
        } catch (err) {
            console.error("Error al poblar la matriz topológica de edificios:", err);
        }
    }

    async cargarDepartamentos() {
        try {
            const respuesta = await ubicacionesService.obtenerDepartamentos();
            this.departamentos = Array.isArray(respuesta) ? respuesta : (respuesta?.data || []);
            
            const sel = this.container.querySelector('#sel-departamento');
            if (!sel) return;
            
            this.departamentos.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id_departamento || d.id_entidad;
                opt.textContent = d.nombre;
                sel.appendChild(opt);
            });
        } catch (err) {
            console.error("Error al poblar departamentos institucionales:", err);
        }
    }

    async manejarCambioEdificio(idEdificio) {
        const selAula = this.container.querySelector('#sel-aula');
        if (!selAula) return;

        selAula.innerHTML = '<option value="">Seleccione Aula...</option>';
        this.estadoSeleccion.id_edificio = idEdificio || null;
        this.estadoSeleccion.id_aula = null;

        if (!idEdificio) {
            selAula.disabled = true;
            this.notificarCambio();
            return;
        }

        try {
            selAula.disabled = true;
            const respuesta = await ubicacionesService.obtenerAulasPorEdificio(idEdificio);
            this.aulas = Array.isArray(respuesta) ? respuesta : (respuesta?.data || []);
            
            this.aulas.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id_aula || a.id_entidad;
                opt.textContent = a.nombre;
                selAula.appendChild(opt);
            });
            selAula.disabled = false;
        } catch (err) {
            console.error("Fallo estructural en carga perimetral de aulas:", err);
        }
        this.notificarCambio();
    }

    vincularEventos() {
        const selEdificio = this.container.querySelector('#sel-edificio');
        const selAula = this.container.querySelector('#sel-aula');
        const selDepto = this.container.querySelector('#sel-departamento');

        this.onEdificioChangeBound = (e) => this.manejarCambioEdificio(e.target.value);
        this.onAulaChangeBound = (e) => {
            this.estadoSeleccion.id_aula = e.target.value || null;
            this.notificarCambio();
        };
        this.onDeptoChangeBound = (e) => {
            this.estadoSeleccion.id_departamento = e.target.value || null;
            this.notificarCambio();
        };

        if (selEdificio) selEdificio.addEventListener('change', this.onEdificioChangeBound);
        if (selAula) selAula.addEventListener('change', this.onAulaChangeBound);
        if (selDepto) selDepto.addEventListener('change', this.onDeptoChangeBound);
    }

    notificarCambio() {
        if (this.onSeleccion) {
            this.onSeleccion({ ...this.estadoSeleccion });
        }
    }

    unmount() {
        if (!this.container) return;
        const selEdificio = this.container.querySelector('#sel-edificio');
        const selAula = this.container.querySelector('#sel-aula');
        const selDepto = this.container.querySelector('#sel-departamento');

        if (selEdificio && this.onEdificioChangeBound) selEdificio.removeEventListener('change', this.onEdificioChangeBound);
        if (selAula && this.onAulaChangeBound) selAula.removeEventListener('change', this.onAulaChangeBound);
        if (selDepto && this.onDeptoChangeBound) selDepto.removeEventListener('change', this.onDeptoChangeBound);
    }
}