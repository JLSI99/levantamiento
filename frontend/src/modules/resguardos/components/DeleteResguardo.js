import { resguardosService } from '../../../services/resguardos.js';

export class DeleteResguardo {
    async liberar(idAsignacion) {
        if (!confirm('¿Confirma la liberación legal del activo patrimonial?')) return false;
        
        try {
            await resguardosService.concluirResguardoOrdinario(idAsignacion);
            alert('El acta de resguardo ha sido dada de baja lógica de manera exitosa.');
            return true;
        } catch (err) {
            alert('Error de mutación: No se pudo completar la directiva de desvinculación patrimonial.');
            return false;
        }
    }

    async eliminar(idAsignacion) {
        if (!confirm('¿Está seguro de que desea eliminar permanentemente este registro de resguardo?')) return false;
        
        try {
            await resguardosService.eliminarBajaLogica(idAsignacion);
            alert('Registro eliminado exitosamente.');
            return true;
        } catch (err) {
            alert('Error: No se pudo eliminar el registro.');
            return false;
        }
    }
}