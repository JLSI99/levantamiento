import { bienesService } from '/src/services/bienes.js';

export class CreateActivo {
    constructor(containerId, permisos, onSuccess) {
        this.containerId = containerId;
        this.permisos = permisos;
        this.onSuccess = onSuccess;
        this._abortController = new AbortController();
        this.tipos = [];
        this.tipoSeleccionado = null; // Almacena el ID del tipo seleccionado único

        this.handleOutsideClick = this._handleOutsideClick.bind(this);
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff; position: relative;">
                <h3 style="margin-top:0; color:#1a237e; font-size:16px; border-bottom:1px solid #e0e0e0; padding-bottom:8px;">
                    Indexación de Activo Físico
                </h3>
                ${this.permisos.crear ? `
                <form id="form-create-activo">
                    <div style="margin-bottom:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Número de Inventario *</label>
                        <input type="text" name="numero_inventario" placeholder="Ej. INV-TIC-2026-001" required 
                            style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Descripción Completa *</label>
                        <input type="text" name="descripcion" placeholder="Ej. Monitor Dell UltraSharp 27" required 
                            style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                    </div>
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Serie</label>
                            <input type="text" name="serie" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Marca</label>
                            <input type="text" name="marca" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Modelo</label>
                            <input type="text" name="modelo" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-bottom:15px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Costo (MXN) *</label>
                            <input type="number" step="0.01" name="costo" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Adquisición</label>
                            <input type="date" name="fecha_adquisicion" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; box-sizing:border-box;">
                        </div>
                    </div>

                    <!-- Menú Desplegable Personalizado para Tipo de Bien (Selección Única) -->
                    <div style="margin-bottom:15px; position:relative;" id="dropdown-tipos-container">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Tipo de Bien *</label>
                        <div id="dropdown-toggle-btn" style="width:100%; min-height:34px; padding:6px 10px; border:1px solid #ccc; border-radius:4px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12px; box-sizing:border-box;">
                            <span id="dropdown-placeholder" style="color:#757575;">Seleccione un tipo de bien...</span>
                            <span style="font-size:10px; color:#555;">▼</span>
                        </div>
                        
                        <!-- Panel Desplegable Flotante -->
                        <div id="dropdown-panel" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:180px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-top:none; border-radius:0 0 4px 4px; z-index:100; box-shadow:0 4px 6px rgba(0,0,0,0.1); box-sizing:border-box;">
                            <div id="dropdown-options-list" style="padding:4px 0;">
                                <!-- Opciones inyectadas dinámicamente -->
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:15px; border-top:1px solid #e0e0e0; padding-top:10px;">
                        <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Imágenes Iniciales del Bien (Opcional, Máximo 3)</label>
                        <input type="file" id="input-archivo-imagen-create" accept="image/jpeg,image/png,image/webp" multiple style="font-size:12px; width:100%;">
                    </div>

                    <button type="submit" style="width:100%; padding:8px; background:#1a237e; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
                        Dar de Alta Activo
                    </button>
                </form>
                ` : '<div style="color:#757575; font-style:italic;">Sin permisos para crear Bienes.</div>'}
            </div>
        `;

        this.bindEvents();
        this.renderSelectTipos();
    }

    actualizarSelectTipos(tipos) {
        this.tipos = tipos;
        this.renderSelectTipos();
    }

    renderSelectTipos() {
        const optionsList = document.getElementById('dropdown-options-list');
        if (!optionsList) return;

        if (this.tipos.length === 0) {
            optionsList.innerHTML = `<div style="padding:8px 12px; font-size:12px; color:#757575;">No hay tipos disponibles</div>`;
            return;
        }

        optionsList.innerHTML = this.tipos.map(t => {
            const isSelected = this.tipoSeleccionado === String(t.id_tipo);
            return `
                <div class="dropdown-option-item" data-id="${t.id_tipo}" style="padding:8px 12px; font-size:12px; cursor:pointer; background:${isSelected ? '#e3f2fd' : 'transparent'}; color:${isSelected ? '#1565c0' : '#212121'}; font-weight:${isSelected ? '600' : 'normal'};" onmouseover="if('${t.id_tipo}' !== '${this.tipoSeleccionado}') this.style.background='#f5f5f5'" onmouseout="if('${t.id_tipo}' !== '${this.tipoSeleccionado}') this.style.background='transparent'">
                    ${this._escapeHtml(t.nombre)}
                </div>
            `;
        }).join('');

        this._actualizarTextoBotonDropdown();
    }

    _actualizarTextoBotonDropdown() {
        const placeholder = document.getElementById('dropdown-placeholder');
        if (!placeholder) return;

        if (!this.tipoSeleccionado) {
            placeholder.textContent = 'Seleccione un tipo de bien...';
            placeholder.style.color = '#757575';
        } else {
            const encontrado = this.tipos.find(t => String(t.id_tipo) === String(this.tipoSeleccionado));
            if (encontrado) {
                placeholder.textContent = encontrado.nombre;
                placeholder.style.color = '#212121';
            } else {
                placeholder.textContent = 'Seleccione un tipo de bien...';
                placeholder.style.color = '#757575';
            }
        }
    }

    _handleOutsideClick(e) {
        const container = document.getElementById('dropdown-tipos-container');
        const panel = document.getElementById('dropdown-panel');
        if (container && panel && !container.contains(e.target)) {
            panel.style.display = 'none';
        }
    }

    bindEvents() {
        const toggleBtn = document.getElementById('dropdown-toggle-btn');
        const panel = document.getElementById('dropdown-panel');
        
        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
            });
        }

        document.addEventListener('click', this.handleOutsideClick);

        // Seleccionar una opción al hacer clic
        const optionsList = document.getElementById('dropdown-options-list');
        if (optionsList) {
            optionsList.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-option-item');
                if (item) {
                    this.tipoSeleccionado = item.getAttribute('data-id');
                    this.renderSelectTipos();
                    if (panel) panel.style.display = 'none';
                }
            });
        }

        const form = document.getElementById('form-create-activo');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);

                if (!this.tipoSeleccionado) {
                    alert('Debe seleccionar un Tipo de Bien.');
                    return;
                }

                // El backend espera un arreglo (tipos_ids), por lo que lo enviamos como arreglo de un solo elemento
                const payload = {
                    numero_inventario: formData.get('numero_inventario').trim(),
                    descripcion: formData.get('descripcion').trim(),
                    serie: formData.get('serie').trim() || null,
                    marca: formData.get('marca').trim() || null,
                    modelo: formData.get('modelo').trim() || null,
                    costo: parseFloat(formData.get('costo')),
                    fecha_adquisicion: formData.get('fecha_adquisicion') || null,
                    tipos_ids: [this.tipoSeleccionado]
                };

                try {
                    const nuevoBien = await bienesService.crearNuevoBien(payload);
                    
                    const fileInput = document.getElementById('input-archivo-imagen-create');
                    if (fileInput && fileInput.files && fileInput.files.length > 0 && nuevoBien?.id_bien) {
                        try {
                            const archivos = Array.from(fileInput.files);
                            await bienesService.subirImagenBien(nuevoBien.id_bien, archivos);
                        } catch (imgErr) {
                            console.error('El bien se creó pero falló la carga de la imagen:', imgErr);
                            alert('Activo indexado, pero ocurrió un error al subir las imágenes.');
                        }
                    }

                    alert('Activo indexado exitosamente.');
                    form.reset();
                    this.tipoSeleccionado = null;
                    this.renderSelectTipos();
                    if (this.onSuccess) this.onSuccess();
                } catch (err) {
                    alert('Error: ' + (err.response?.data?.detail || err.message));
                }
            }, { signal: this._abortController.signal });
        }
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    unmount() {
        document.removeEventListener('click', this.handleOutsideClick);
        this._abortController.abort();
    }
}