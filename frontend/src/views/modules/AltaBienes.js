import { bienesService } from '../../services/bienes.js';
import { SelectorUbicaciones } from '../../components/SelectorUbicaciones.js';

export class AltaBienes {
    constructor(containerId) {
        this.containerId = containerId;
        this.selectorUbicacion = null;
        this.onFormSubmitBound = null;
        this.catalogoTiposFijos = [];
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

    async render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Circuit Breaker RBAC: Solo el Administrador (1) o el Registrador (3) pueden crear bienes
        const usuario = this._obtenerUsuarioAutenticado();
        const idsRoles = usuario?.roles ? usuario.roles.map(r => parseInt(r.id_rol, 10)) : [];
        const tienePermiso = idsRoles.includes(1) || idsRoles.includes(3);

        if (!tienePermiso) {
            container.innerHTML = `
                <div style="padding:30px; background:#ffebee; border:1px solid #ffcdd2; border-radius:6px; color:#b71c1c; font-family:sans-serif;">
                    <h4 style="margin:0 0 10px 0; font-size:14px; font-weight:700; text-transform:uppercase;">Acceso Restringido (403 Forbidden)</h4>
                    <p style="margin:0; font-size:12px; line-height:1.5;">Su perfil operativo no cuenta con facultades de indexación patrimonial. El registro de bienes instrumentales queda limitado a los roles de Registrador de Bienes y Administrador General.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="module-card" style="padding:20px; max-width:700px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <h3 style="margin-top:0; color:#1a237e; font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px; font-weight: 700;">
                    Alta Central e Indexación de Activos Fijos
                </h3>
                <form id="form-alta-bien" style="display:flex; flex-direction:column; gap:14px; margin-top:15px;">
                    
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color: #424242;">Número de Serie de Fábrica</label>
                            <input type="text" id="bien-serie" placeholder="Ej. MXL102495X" style="width:100%; padding:6px; box-sizing:border-box; border: 1px solid #bdbdbd; border-radius: 4px; font-size:12px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color: #424242;">Modelo Comercial</label>
                            <input type="text" id="bien-modelo" placeholder="Ej. OptiPlex 7090" style="width:100%; padding:6px; box-sizing:border-box; border: 1px solid #bdbdbd; border-radius: 4px; font-size:12px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color: #424242;">Marca Proveedor</label>
                            <input type="text" id="bien-marca" placeholder="Ej. Dell" required style="width:100%; padding:6px; box-sizing:border-box; border: 1px solid #bdbdbd; border-radius: 4px; font-size:12px;">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color: #424242;">Costo de Adquisición (M.N. con Decimales)</label>
                            <input type="number" step="0.01" min="0.01" id="bien-costo" placeholder="0.00" required style="width:100%; padding:6px; box-sizing:border-box; border: 1px solid #bdbdbd; border-radius: 4px; font-size:12px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color: #424242;">Fecha de Facturación/Adquisición</label>
                            <input type="date" id="bien-fecha" required style="width:100%; padding:6px; box-sizing:border-box; border: 1px solid #bdbdbd; border-radius: 4px; font-size:12px;">
                        </div>
                    </div>

                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color: #424242;">Descripción Detallada y Atributos Técnicos</label>
                        <textarea id="bien-descripcion" rows="2" placeholder="Describa el bien instrumental de forma unívoca..." required style="width:100%; padding:6px; box-sizing:border-box; border: 1px solid #bdbdbd; border-radius: 4px; font-size:12px; font-family:sans-serif; resize: vertical;"></textarea>
                    </div>
                    
                    <div>
                        <label style="display:block; font-size:11px; margin-bottom:4px; font-weight:600; color: #424242;">Clasificación de Tipo de Activo Patrimonial</label>
                        <select id="bien-tipo-id" required style="width:100%; padding:6px; box-sizing:border-box; border: 1px solid #bdbdbd; border-radius: 4px; font-size:12px; background: white;">
                            <option value="">-- Consultando Categorías del BFF --</option>
                        </select>
                    </div>

                    <div style="border:1px dashed #3f51b5; padding:15px; border-radius:4px; background-color:#f8f9fa;">
                        <label style="display:block; font-size:11px; font-weight:bold; color:#1a237e; margin-bottom:8px; letter-spacing:0.5px;">DESTINO TOPOLÓGICO INICIAL DEL ACTIVO</label>
                        <div id="wrapper-selector-ubicacion-alta"></div>
                    </div>

                    <button type="submit" id="btn-alta-bien-submit" style="padding:10px 20px; align-self:flex-end; font-weight:600; background-color: #1a237e; color: white; border: none; border-radius: 4px; cursor: pointer; font-size:12px;">Registrar e Indexar Activo</button>
                    <div id="alta-bien-error" style="font-size:12px; min-height:16px; color: #c62828; font-weight: 600; text-align: right;"></div>
                </form>
            </div>
        `;

        this.selectorUbicacion = new SelectorUbicaciones('wrapper-selector-ubicacion-alta');
        this.selectorUbicacion.inicializar();
        
        await this.cargarTiposDeBienes();
        this.vincularEventos();
    }

    async cargarTiposDeBienes() {
        const selectTipo = document.getElementById('bien-tipo-id');
        if (!selectTipo) return;

        try {
            const res = await bienesService.listarTipos(100, 0);
            selectTipo.innerHTML = '<option value="">-- Seleccione una categoría de bien patrimonial --</option>';
            
            const lista = Array.isArray(res) ? res : (res?.data || []);
            lista.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id_tipo;
                opt.textContent = `${t.nombre} (Depreciación: ${t.tasa_depreciacion_anual}%)`;
                selectTipo.appendChild(opt);
            });
        } catch (err) {
            selectTipo.innerHTML = '<option value="">Error al conectar con la matriz de tipos de bienes.</option>';
        }
    }

    vincularEventos() {
        const form = document.getElementById('form-alta-bien');
        if (!form) return;

        this.onFormSubmitBound = async (e) => {
            e.preventDefault();
            
            const errDiv = document.getElementById('alta-bien-error');
            const submitBtn = document.getElementById('btn-alta-bien-submit');
            if (errDiv) errDiv.textContent = '';

            const geoData = this.selectorUbicacion.obtenerValoresEstructurales();
            const tipoIdSeleccionado = document.getElementById('bien-tipo-id').value;
            
            if (!geoData.id_edificio || !geoData.id_aula || !geoData.id_departamento) {
                if (errDiv) errDiv.textContent = 'Error: Debe especificar la jerarquía física completa de resguardo (Edificio -> Aula -> Departamento).';
                return;
            }

            if (!tipoIdSeleccionado) {
                if (errDiv) errDiv.textContent = 'Error: Debe clasificar la naturaleza del activo.';
                return;
            }

            const payload = {
                serie: document.getElementById('bien-serie').value.trim() || null,
                modelo: document.getElementById('bien-modelo').value.trim() || null,
                marca: document.getElementById('bien-marca').value.trim(),
                descripcion: document.getElementById('bien-descripcion').value.trim(),
                costo: parseFloat(document.getElementById('bien-costo').value),
                fecha_adquisicion: document.getElementById('bien-fecha').value || null,
                tipos_ids: [tipoIdSeleccionado],
                id_edificio: geoData.id_edificio,
                id_aula: geoData.id_aula,
                id_departamento: geoData.id_departamento
            };

            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Indexando en Repositorio Central...'; }

                await bienesService.crear(payload);
                alert('Activo instrumental registrado de forma exitosa en el inventario institucional del TECNM. Flujo de catalogación cerrado.');
                await this.render();
                
            } catch (error) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Registrar e Indexar Activo'; }
                if (errDiv) {
                    errDiv.textContent = error.response?.data?.detail || 'Incapacidad para indexar el activo fijo debido a violaciones de esquema en el BFF.';
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
        if (this.selectorUbicacion) {
            this.selectorUbicacion.unmount();
        }
    }
}