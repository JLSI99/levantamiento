import { adminService } from '/src/services/admin.js';

export class DeleteUsuario {
    constructor(onSuccess) {
        this.onSuccess = onSuccess;
    }

    async darDeBaja(idUsuario) {
        if (confirm('¿Revocar acceso a este operador?')) {
            try {
                await adminService.darBajaUsuario(idUsuario);
                alert('Acceso revocado exitosamente.');
                if (this.onSuccess) this.onSuccess();
            } catch (err) {
                alert('Error al suspender: ' + (err.response?.data?.detail || err.message));
            }
        }
    }
}