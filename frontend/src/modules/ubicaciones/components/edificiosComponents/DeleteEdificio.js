import { ubicacionesService } from '/src/services/ubicaciones.js';

export class DeleteEdificio {
    static async ejecutar(idEdificio, onSuccess) {
        if (!confirm('¿Dar de baja este edificio? Las aulas adscritas podrían quedar inaccesibles.')) return;

        try {
            await ubicacionesService.darBajaEdificio(idEdificio);
            if (onSuccess) onSuccess();
        } catch (err) {
            alert('Fallo al dar de baja: ' + err.message);
        }
    }
}