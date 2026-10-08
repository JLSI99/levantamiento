import { bienesService } from '/src/services/bienes.js';

export class DeleteActivo {
    constructor(onSuccess) {
        this.onSuccess = onSuccess; 
    }

    /**
     * Solicita la baja lógica de un activo patrimonial en el inventario.
     * @param {string} idBien - UUID único del bien a dar de baja.
     */
    async darDeBaja(idBien) {
        if (!idBien) {
            console.error('DeleteActivo: Se intentó invocar la baja sin un ID de bien válido.');
            return;
        }

        const confirmacion = confirm('¿Está seguro de dar de baja este activo del inventario patrimonial?');
        if (!confirmacion) return;

        try {
            await bienesService.darDeBajaBien(idBien);
            alert('El activo ha sido dado de baja exitosamente.');
            
            if (typeof this.onSuccess === 'function') {
                this.onSuccess(idBien);
            }
        } catch (err) {
            const mensajeError = err.response?.data?.detail || err.message || 'Error desconocido al procesar la baja del activo.';
            console.error(`Error al dar de baja el bien [ID: ${idBien}]:`, err);
            alert('Error al dar de baja: ' + mensajeError);
        }
    }
}