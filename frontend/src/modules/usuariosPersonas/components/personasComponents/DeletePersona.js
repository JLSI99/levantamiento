import { adminService } from '/src/services/admin.js';

export class DeletePersona {
    constructor(onSuccess) {
        this.onSuccess = onSuccess;
    }

    async eliminar(idPersona, persona) {
        const nombreMostrar = persona ? persona.nombres : 'esta persona';
        const confirmacion = confirm(`¿Está seguro de eliminar el registro demográfico de ${nombreMostrar}?\n\nEsta acción fallará si el registro posee cuentas o resguardos activos vinculados.`);

        if (!confirmacion) return;

        try {
            await adminService.darBajaPersona(idPersona);
            alert('Registro demográfico eliminado correctamente.');
            if (this.onSuccess) this.onSuccess();
        } catch (error) {
            const detalle = error.response?.data?.detail || error.message;
            alert(`No se puede eliminar la persona: ${detalle}`);
        }
    }
}