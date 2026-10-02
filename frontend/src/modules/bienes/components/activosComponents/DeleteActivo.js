import { bienesService } from '/src/services/bienes.js';

export class DeleteActivo {
    constructor(onSuccess) {
        this.onSuccess = onSuccess; 
    }

    async darDeBaja(idBien) {
        if (confirm('¿Dar de baja este activo del inventario patrimonial?')) {
            try {
                await bienesService.darDeBajaBien(idBien);
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error al dar de baja: ' + (err.response?.data?.detail || err.message));
            }
        }
    }
}