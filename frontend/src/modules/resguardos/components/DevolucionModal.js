export class DevolucionModal {
    constructor(onConfirmarDevolucion, onEditarResguardo) {
        this.onConfirmarDevolucion = onConfirmarDevolucion;
        this.onEditarResguardo = onEditarResguardo;
        this._itemActual = null;
        this._abortController = new AbortController();
        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        if (document.getElementById('modal-accion-devolucion')) return;

        const modalHtml = `
            <div id="modal-accion-devolucion" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999; padding:15px; box-sizing:border-box;">
                <div style="background:var(--bg-card, #fff); padding:20px; border-radius:8px; max-width:480px; width:100%; box-shadow:0 4px 15px rgba(0,0,0,0.3); box-sizing:border-box;">
                    <h4 style="margin-top:0; color:var(--success, #00796b); font-size:15px; font-weight:700; border-bottom:1px solid var(--border-color, #e0e0e0); padding-bottom:8px;">📦 Resguardo Encontrado - Recepción de Activo</h4>
                    <div id="modal-devolucion-contenido" style="margin:15px 0; font-size:12px; color:var(--text-main, #37474f); line-height:1.6;"></div>
                    <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px; border-top:1px solid var(--border-color, #e0e0e0); padding-top:12px; flex-wrap:wrap;">
                        <button type="button" id="btn-cerrar-modal-devolucion" style="background:var(--text-muted, #757575); color:white; border:none; padding:8px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            Cerrar
                        </button>
                        <button type="button" id="btn-editar-desde-devolucion" style="background:var(--primary, #1976d2); color:white; border:none; padding:8px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            ✏️ Reasignar / Editar
                        </button>
                        <button type="button" id="btn-confirmar-devolucion-rapida" style="background:var(--success, #2e7d32); color:white; border:none; padding:8px 14px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            ✓ Concluir y Devolver
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _bindEvents() {
        const signal = this._abortController.signal;

        document.getElementById('btn-cerrar-modal-devolucion')?.addEventListener('click', () => this.cerrar(), { signal });

        document.getElementById('modal-accion-devolucion')?.addEventListener('click', (e) => {
            const modal = document.getElementById('modal-accion-devolucion');
            if (e.target === modal) this.cerrar();
        }, { signal });

        document.getElementById('btn-confirmar-devolucion-rapida')?.addEventListener('click', async () => {
            if (!this._itemActual || !this._itemActual.id_asignacion) {
                console.warn("Intento de devolución sin un resguardo seleccionado en memoria.");
                this.cerrar();
                return;
            }

            const idAsignacion = String(this._itemActual.id_asignacion);
            const callback = this.onConfirmarDevolucion;
            
            this.cerrar();

            if (callback) {
                await callback(idAsignacion);
            }
        }, { signal });

        document.getElementById('btn-editar-desde-devolucion')?.addEventListener('click', () => {
            if (!this._itemActual) {
                this.cerrar();
                return;
            }

            const item = this._itemActual;
            const callback = this.onEditarResguardo;
            
            this.cerrar();

            if (callback) {
                callback(item);
            }
        }, { signal });
    }

    abrir(item) {
        if (!item) return;
        this._itemActual = item;
        const modalAccion = document.getElementById('modal-accion-devolucion');
        const contenedorContenido = document.getElementById('modal-devolucion-contenido');
        if (!modalAccion || !contenedorContenido) return;

        const numeroInv = item.bien?.numero_inventario ? `[Inv: ${item.bien.numero_inventario}]` : '';
        const bienDesc = item.bien ? `${item.bien.descripcion} ${numeroInv} [Marca: ${item.bien.marca || 'N/A'}, Modelo: ${item.bien.modelo || 'N/A'}, Serie: ${item.bien.serie || 'N/A'}]` : 'Sin datos de bien';
        const custodio = item.persona ? `${item.persona.nombres} ${item.persona.apellidos} (${item.persona.curp})` : 'Sin asignar';
        const ubicacion = item.ubicacion ? `Edificio: ${item.ubicacion.edificio}, Aula: ${item.ubicacion.aula}` : 'Sin ubicación';
        const fecha = item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString('es-MX', {timeZone: 'UTC'}) : 'N/A';

        contenedorContenido.innerHTML = `
            <div style="background:var(--bg-input, #f5f5f5); padding:12px; border-radius:4px; margin-bottom:10px; box-sizing:border-box;">
                <p style="margin:0 0 6px 0; color:var(--text-main, #333);"><strong>Activo / Bien:</strong> ${this._escapeHtml(bienDesc)}</p>
                <p style="margin:0 0 6px 0; color:var(--text-main, #333);"><strong>Custodio Actual:</strong> ${this._escapeHtml(custodio)}</p>
                <p style="margin:0 0 6px 0; color:var(--text-main, #333);"><strong>Ubicación Topológica:</strong> ${this._escapeHtml(ubicacion)}</p>
                <p style="margin:0; color:var(--text-main, #333);"><strong>Fecha Asignación:</strong> ${this._escapeHtml(fecha)} (${item.dias_vigencia || 0} días vigente)</p>
            </div>
            <p style="margin:0; font-size:11px; color:var(--success, #2e7d32); font-weight:600;">
                ¿Desea concluir formalmente este resguardo por devolución física de activo al almacén o reasignarlo?
            </p>
        `;

        modalAccion.style.display = 'flex';
    }

    cerrar() {
        const modalAccion = document.getElementById('modal-accion-devolucion');
        if (modalAccion) modalAccion.style.display = 'none';
        this._itemActual = null;
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
        this._abortController.abort();
        document.getElementById('modal-accion-devolucion')?.remove();
    }
}