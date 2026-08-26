import { resguardosService } from '../../../services/resguardos.js';

export class CreateResguardo {
    obtenerPlantillaFormulario() {
        return `
            <div style="background:#f8f9fa; padding:15px; border:1px solid #e0e0e0; border-radius:4px; margin-bottom:20px;">
                <h4 id="form-titulo" style="margin:0 0 10px 0; font-size:13px; color:#37474f;">Nueva Asignación de Resguardo</h4>
                <form id="form-crear-resguardo">
                    <div style="display:flex; gap:15px; margin-bottom:10px;">
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">ID del Bien (UUID) *</label>
                            <input type="text" id="input-id-bien" name="id_bien" required style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px;">
                        </div>
                        <div style="flex:1;">
                            <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">CURP del Responsable *</label>
                            <input type="text" id="input-curp" name="curp" required maxlength="18" minlength="18" class="input-monospace" placeholder="18 caracteres" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; text-transform:uppercase;">
                        </div>
                    </div>
                    <div id="contenedor-selector-ubicacion-resguardo"></div>
                    
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <button type="submit" id="btn-submit-resguardo" style="background:#00796b; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            Emitir Acta de Resguardo
                        </button>
                        <button type="button" id="btn-cancelar-edicion" style="display:none; background:#757575; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600;">
                            Cancelar Edición
                        </button>
                    </div>
                    <div id="resguardo-error-feedback" style="color:#c62828; font-size:11px; margin-top:5px;"></div>
                </form>
            </div>
        `;
    }

    async crear(payload) {
        await resguardosService.crearAsignacion(payload);
        alert('Acta de resguardo generada exitosamente.');
    }
}