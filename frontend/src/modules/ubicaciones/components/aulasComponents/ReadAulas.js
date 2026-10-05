export class ReadAulas {
    static renderBadges(aulas, idEdificio, puedeEditar, puedeBorrar) {
        if (!aulas || aulas.length === 0) {
            return '<span style="color:#9e9e9e; font-style:italic;">Sin aulas registradas</span>';
        }

        return aulas.map(a => `
            <span style="display:inline-flex; align-items:center; gap:4px; background:#e1f5fe; color:#0277bd; padding:2px 6px; border-radius:3px; margin:2px; font-size:11px;">
                ${a.nombre}
                ${puedeEditar ? `<button class="btn-editar-aula" data-id-aula="${a.id_aula}" data-id-edificio="${idEdificio}" data-nombre="${a.nombre}" style="border:none; background:none; cursor:pointer; color:#f57c00; font-weight:bold; padding:0 2px;">✎</button>` : ''}
                ${puedeBorrar ? `<button class="btn-borrar-aula" data-id-aula="${a.id_aula}" style="border:none; background:none; cursor:pointer; color:#c62828; font-weight:bold; padding:0 2px;">×</button>` : ''}
            </span>
        `).join('');
    }
}