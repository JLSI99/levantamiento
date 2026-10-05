import { ubicacionesService } from '/src/services/ubicaciones.js';

export class DeleteDepartamento {
    static async ejecutar(idDepto, onSuccess) {
        if (!confirm('¿Dar de baja esta estructura departamental?')) return;

        try {
            await ubicacionesService.darBajaDepartamento(idDepto);
            if (onSuccess) onSuccess();
        } catch (err) {
            alert('Error al dar de baja departamento: ' + err.message);
        }
    }
}