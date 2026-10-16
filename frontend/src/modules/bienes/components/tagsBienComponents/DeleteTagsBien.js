import { bienesService } from '/src/services/bienes.js';

export class DeleteTagsBien {
    constructor(onSuccess) {
        this.onSuccess = onSuccess;
    }

    async darDeBaja(idTag) {
        if (confirm('¿Dar de baja esta etiqueta?')) {
            try {
                await bienesService.darDeBajaTagBien(idTag);
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error al dar de baja: ' + (err.response?.data?.detail || err.message));
            }
        }
    }
}