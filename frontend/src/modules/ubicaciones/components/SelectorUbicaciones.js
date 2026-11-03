import { ubicacionesService } from '/src/services/ubicaciones.js'; 

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

        this._abortController = new AbortController();
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
            <div style="display:flex; gap:12px; margin-bottom:10px; width:100%; flex-wrap:wrap; box-sizing:border-box;">
                <div style="flex:1; min-width:185px; box-sizing:border-box;">
                    <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:var(--text-main, #424242);">Edificio *</label>
                    <select id="sel-edificio" required style="width:100%; padding:8px; font-size:12px; border:1px solid var(--border-color, #bdbdbd); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main, #333); box-sizing:border-box;">
                        <option value="">Seleccione Edificio...</option>
                    </select>
                </div>
                <div style="flex:1; min-width:185px; box-sizing:border-box;">
                    <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:var(--text-main, #424242);">Aula / Espacio *</label>
                    <select id="sel-aula" required disabled style="width:100%; padding:8px; font-size:12px; border:1px solid var(--border-color, #bdbdbd); border-radius:4px; background:var(--bg-disabled, #f5f5f5); color:var(--text-main, #333); box-sizing:border-box;">
                        <option value="">Seleccione Aula...</option>
                    </select>
                </div>
                <div style="flex:1; min-width:185px; box-sizing:border-box;">
                    <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color:var(--text-main, #424242);">Departamento Adscrito *</label>
                    <select id="sel-departamento" required style="width:100%; padding:8px; font-size:12px; border:1px solid var(--border-color, #bdbdbd); border-radius:4px; background:var(--bg-input, #fff); color:var(--text-main, #333); box-sizing:border-box;">
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
            selAula.style.background = 'var(--bg-disabled, #f5f5f5)';
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
            selAula.style.background = 'var(--bg-input, #fff)';
        } catch (err) {
            console.error("Fallo estructural en carga perimetral de aulas:", err);
            selAula.disabled = true;
        }
        this.notificarCambio();
    }

    vincularEventos() {
        const signal = this._abortController.signal;
        const selEdificio = this.container.querySelector('#sel-edificio');
        const selAula = this.container.querySelector('#sel-aula');
        const selDepto = this.container.querySelector('#sel-departamento');

        if (selEdificio) {
            selEdificio.addEventListener('change', (e) => this.manejarCambioEdificio(e.target.value), { signal });
        }
        if (selAula) {
            selAula.addEventListener('change', (e) => {
                this.estadoSeleccion.id_aula = e.target.value || null;
                this.notificarCambio();
            }, { signal });
        }
        if (selDepto) {
            selDepto.addEventListener('change', (e) => {
                this.estadoSeleccion.id_departamento = e.target.value || null;
                this.notificarCambio();
            }, { signal });
        }
    }

    notificarCambio() {
        if (this.onSeleccion) {
            this.onSeleccion({ ...this.estadoSeleccion });
        }
    }

    unmount() {
        this._abortController.abort();
    }
}