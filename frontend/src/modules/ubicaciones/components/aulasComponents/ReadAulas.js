export class ReadAulas {
    static renderBadges(aulas, idEdificio, puedeEditar, puedeBorrar) {
        const aulasActivas = (aulas || []).filter(a => a.is_active !== false);

        if (aulasActivas.length === 0) {
            return '<span style="color:var(--text-muted, #9e9e9e); font-style:italic;">Sin aulas registradas</span>';
        }

        return aulasActivas.map(a => `
            <span style="display:inline-flex; align-items:center; gap:4px; background:var(--badge-bg, #e1f5fe); color:var(--badge-text, #0277bd); padding:3px 8px; border-radius:4px; margin:2px; font-size:11px; font-weight:500;">
                ${a.nombre}
                ${puedeEditar ? `<button class="btn-editar-aula" data-id-aula="${a.id_aula}" data-id-edificio="${idEdificio}" data-nombre="${a.nombre}" style="border:none; background:none; cursor:pointer; color:var(--warning, #f57c00); font-weight:bold; padding:0 2px;" title="Editar Aula">✎</button>` : ''}
                ${puedeBorrar ? `<button class="btn-borrar-aula" data-id-aula="${a.id_aula}" style="border:none; background:none; cursor:pointer; color:var(--danger, #c62828); font-weight:bold; padding:0 2px;" title="Dar de baja Aula">×</button>` : ''}
            </span>
        `).join('');
    }
}