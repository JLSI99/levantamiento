import { ubicacionesService } from '/src/services/ubicaciones.js';

export class DeleteAula {
    static async ejecutar(idAula, puedeBorrar, onSuccess) {
        if (!puedeBorrar) return;

        if (confirm('¿Eliminar esta aula/espacio físico del inventario?')) {
            try {
                await ubicacionesService.darBajaAula(idAula);
                if (onSuccess) onSuccess();
            } catch (err) {
                alert('Error al eliminar aula: ' + err.message);
            }
        }
    }
}