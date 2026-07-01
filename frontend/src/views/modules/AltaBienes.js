import { bienesService } from '../../services/bienes.js';
import { SelectorUbicacion } from '../../components/SelectorUbicaciones.js';
import { guardElement } from '../../components/CanRender.js';

export function crearModuloAltaBienes(state) {
    const widget = document.createElement('section');
    widget.className = 'widget-box';
    
    const puedeEscribir = state.capabilities.includes('bienes:crear');

    if (puedeEscribir) {
        widget.innerHTML = `
            <h3>Levantamiento Físico de Bienes</h3>
            <form id="form-alta-bien">
                <input type="text" name="numero_serie" placeholder="Número de Serie / Identificador Único" required>
                <input type="text" name="descripcion" placeholder="Descripción Detallada del Activo" required>
                <input type="text" name="marca" placeholder="Marca" required>
                <input type="text" name="modelo" placeholder="Modelo" required>
                
                <label style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 10px;">Estado Físico Operacional:</label>
                <select name="estado_fisico" required style="width: 100%; padding: 8px; margin-bottom: 10px;">
                    <option value="EXCELENTE">Excelente</option>
                    <option value="REGULAR">Regular</option>
                    <option value="MALO">Malo</option>
                    <option value="CHATARRA">Chatarra</option>
                </select>

                <div id="contenedor-selector-ubicacion" style="margin-bottom: 15px;"></div>
                <button type="submit" style="width: 100%;">Persistir Activo en ms-bienes</button>
                <div id="bien-feedback" style="margin-top:10px; font-size: 12px;"></div>
            </form>
        `;

        const contenedorUbicacion = widget.querySelector('#contenedor-selector-ubicacion');
        const idUnicoSelector = `select-aula-${Math.random().toString(36).substring(2, 9)}`;
        contenedorUbicacion.id = idUnicoSelector;
        
        const selectorUbicacionLocal = new SelectorUbicacion(idUnicoSelector);
        selectorUbicacionLocal.inicializar();

        widget.querySelector('#form-alta-bien').onsubmit = async (e) => {
            e.preventDefault();
            const form = e.target;
            const feedback = widget.querySelector('#bien-feedback');
            const idAula = selectorUbicacionLocal.obtenerValor();

            if (!idAula) {
                feedback.className = 'text-error';
                feedback.textContent = 'Error: Debe especificar un aula de destino institucional.';
                return;
            }

            const formData = new FormData(form);
            const payload = {
                numero_serie: formData.get('numero_serie'),
                descripcion: formData.get('descripcion'),
                marca: formData.get('marca'),
                modelo: formData.get('modelo'),
                estado_fisico: formData.get('estado_fisico'),
                id_aula: idAula
            };

            try {
                feedback.className = 'text-success';
                feedback.textContent = 'Enviando payload al BFF...';
                await bienesService.crear(payload);
                feedback.textContent = 'Activo registrado exitosamente en el inventario.';
                form.reset();
                selectorUbicacionLocal.inicializar();
            } catch (error) {
                feedback.className = 'text-error';
                feedback.textContent = `Fallo de persistencia: ${error.response?.data?.detail || error.message}`;
            }
        };
    } else {
        widget.innerHTML = `
            <h3>Módulo de Bienes Patrimoniales</h3>
            <p style="font-size: 13px; color: var(--text-muted);">
                Tu perfil posee autorizaciones de consulta. Usa los reportes globales para verificar auditorías físicas.
            </p>
            <div style="background: var(--bg-main); padding: 15px; border-radius: 4px; font-family: monospace; font-size: 11px;">
                Estatus del Operador: Solo Lectura (ms-bienes Conectado)
            </div>
        `;
    }

    return guardElement(['bienes:crear', 'bienes:leer'], widget, false);
}