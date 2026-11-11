import { resguardosService } from '/src/services/resguardos.js';
import { SelectorUbicaciones } from '/src/modules/ubicaciones/components/SelectorUbicaciones.js';

export class SolicitarResguardoModal {
    constructor(onSuccess) {
        this.onSuccess = onSuccess;
        this.modalElement = null;
        this.selectorUbicaciones = null;
        this.geoDataSelected = null;
    }

    render() {
        this.modalElement = document.createElement('div');
        this.modalElement.id = 'modal-solicitar-resguardo';
        this.modalElement.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;
            z-index: 9999; box-sizing: border-box;
        `;

        this.modalElement.innerHTML = `
            <div style="background: var(--bg-card, #fff); width: 100%; max-width: 500px; padding: 20px; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <h3 style="margin-top:0; color: var(--primary, #1976d2); font-size: 15px; border-bottom: 1px solid var(--border-color, #eee); padding-bottom: 8px;">
                    📝 Solicitar Equipo / Bien Necesario
                </h3>
                <form id="form-solicitar-resguardo">
                    <div style="margin-bottom: 12px;">
                        <label style="display:block; font-size: 11px; font-weight: 700; margin-bottom: 4px;">Bien / Equipo Requerido *</label>
                        <input type="text" name="bien_solicitado" required placeholder="Ej. Laptop para desarrollo, Silla ejecutiva, Impresora..." style="width: 100%; padding: 7px; border: 1px solid var(--border-color, #ccc); border-radius: 4px; font-size: 12px; box-sizing: border-box;">
                    </div>

                    <div id="contenedor-ubicacion-modal-solicitud" style="margin-bottom: 12px;"></div>

                    <div style="margin-bottom: 15px;">
                        <label style="display:block; font-size: 11px; font-weight: 700; margin-bottom: 4px;">Justificación de uso / Motivo del requerimiento</label>
                        <textarea name="justificacion" rows="3" placeholder="Explique brevemente las labores o razones para solicitar este activo..." style="width: 100%; padding: 7px; border: 1px solid var(--border-color, #ccc); border-radius: 4px; font-size: 12px; box-sizing: border-box;"></textarea>
                    </div>

                    <div id="modal-solicitud-error" style="color: var(--danger, #d32f2f); font-size: 11px; margin-bottom: 10px;"></div>

                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button type="button" id="btn-cerrar-modal-solicitud" style="background: #e0e0e0; border: none; padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">Cancelar</button>
                        <button type="submit" id="btn-enviar-modal-solicitud" style="background: var(--primary, #1976d2); color: white; border: none; padding: 7px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        this._bindEvents();
    }

    async _bindEvents() {
        const subContainer = this.modalElement.querySelector('#contenedor-ubicacion-modal-solicitud');
        this.selectorUbicaciones = new SelectorUbicaciones(subContainer, (geoData) => {
            this.geoDataSelected = geoData;
        });
        await this.selectorUbicaciones.inicializar();

        const btnCerrar = this.modalElement.querySelector('#btn-cerrar-modal-solicitud');
        btnCerrar.addEventListener('click', () => this.destroy());

        const form = this.modalElement.querySelector('#form-solicitar-resguardo');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this._submitForm(form);
        });
    }

    async _submitForm(form) {
        const errDiv = this.modalElement.querySelector('#modal-solicitud-error');
        errDiv.textContent = '';

        if (!this.geoDataSelected || !this.geoDataSelected.id_edificio || !this.geoDataSelected.id_aula || !this.geoDataSelected.id_departamento) {
            errDiv.textContent = 'Debe seleccionar un Edificio, Aula y Departamento válidos.';
            return;
        }

        const formData = new FormData(form);
        const bienSolicitadoVal = formData.get('bien_solicitado')?.trim();
        
        if (!bienSolicitadoVal) {
            errDiv.textContent = 'Especifique el bien o equipo que necesita.';
            return;
        }

        const payload = {
            bien_solicitado: bienSolicitadoVal,
            id_edificio: this.geoDataSelected.id_edificio,
            id_aula: this.geoDataSelected.id_aula,
            id_departamento: this.geoDataSelected.id_departamento,
            justificacion: formData.get('justificacion')?.trim() || null
        };

        const btnSubmit = this.modalElement.querySelector('#btn-enviar-modal-solicitud');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando...';

        try {
            await resguardosService.crearSolicitud(payload);
            if (typeof this.onSuccess === 'function') await this.onSuccess();
            this.destroy();
        } catch (err) {
            errDiv.textContent = err.response?.data?.detail || 'Error al enviar la solicitud.';
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Enviar Solicitud';
        }
    }

    destroy() {
        if (this.selectorUbicaciones) this.selectorUbicaciones.unmount();
        if (this.modalElement && this.modalElement.parentNode) {
            this.modalElement.parentNode.removeChild(this.modalElement);
        }
    }
}