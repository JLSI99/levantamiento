import { bienesService } from '/src/services/bienes.js';

export class DeleteTipoBien {
    constructor(onSuccess) {
        this.onSuccess = onSuccess;
    }

    async darDeBaja(idTipo) {
        if (confirm('¿Dar de baja este tipo de bien?')) {
            try {
                await bienesService.darDeBajaTipoBien(idTipo);
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error al dar de baja: ' + (err.response?.data?.detail || err.message));
            }
        }
    }
}