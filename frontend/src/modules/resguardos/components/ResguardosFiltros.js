export class ResguardosFiltros {
    constructor() {
        this.departamentosSeleccionados = [];
        this.edificiosSeleccionados = [];
        this.criterioOrden = null; // 'custodio' o null
        this.ordenAscendente = true;
    }

    aplicar(datosOriginales, textoBusqueda, catalogos) {
        let asignaciones = [...datosOriginales];
        const { departamentosCatalogo, edificiosCatalogo } = catalogos;

        // 1. Texto libre
        if (textoBusqueda && textoBusqueda.trim() !== '') {
            const query = textoBusqueda.toUpperCase().trim();
            asignaciones = asignaciones.filter(item => {
                const idAsignacion = String(item.id_asignacion || '').toUpperCase();
                const numInv = String(item.bien?.numero_inventario || '').toUpperCase();
                const serie = String(item.bien?.serie || '').toUpperCase();
                const desc = String(item.bien?.descripcion || '').toUpperCase();
                const curp = String(item.persona?.curp || '').toUpperCase();
                const nombre = `${item.persona?.nombres || ''} ${item.persona?.apellidos || ''}`.toUpperCase();
                
                return idAsignacion.includes(query) || numInv.includes(query) || 
                       serie.includes(query) || desc.includes(query) || 
                       curp.includes(query) || nombre.includes(query);
            });
        }

        // 2. Departamentos
        if (this.departamentosSeleccionados.length > 0) {
            const nombresDepto = this.departamentosSeleccionados.map(id => {
                const cat = departamentosCatalogo.find(d => String(d.id_departamento || d.id) === String(id));
                return cat ? String(cat.nombre).toUpperCase().trim() : '';
            }).filter(Boolean);

            asignaciones = asignaciones.filter(item => {
                const idItem = String(item.id_departamento || item.ubicacion?.id_departamento || '');
                const nombreItem = String(item.departamento || item.ubicacion?.departamento || '').toUpperCase().trim();
                return this.departamentosSeleccionados.includes(idItem) || nombresDepto.includes(nombreItem);
            });
        }

        // 3. Edificios
        if (this.edificiosSeleccionados.length > 0) {
            const nombresEdif = this.edificiosSeleccionados.map(id => {
                const cat = edificiosCatalogo.find(e => String(e.id_edificio || e.id) === String(id));
                return cat ? String(cat.nombre).toUpperCase().trim() : '';
            }).filter(Boolean);

            asignaciones = asignaciones.filter(item => {
                const idItem = String(item.id_edificio || item.ubicacion?.id_edificio || '');
                const nombreItem = String(item.edificio || item.ubicacion?.edificio || '').toUpperCase().trim();
                
                const coincidePorId = this.edificiosSeleccionados.includes(idItem);
                const coincidePorNombre = nombresEdif.includes(nombreItem);
                const coincideParcial = nombresEdif.some(n => nombreItem.includes(n) || n.includes(nombreItem));

                return coincidePorId || coincidePorNombre || (nombreItem !== '' && coincideParcial);
            });
        }

        // 4. Ordenamiento
        if (this.criterioOrden === 'custodio') {
            asignaciones.sort((a, b) => {
                const valA = `${a.persona?.apellidos || ''} ${a.persona?.nombres || ''}`.toUpperCase();
                const valB = `${b.persona?.apellidos || ''} ${b.persona?.nombres || ''}`.toUpperCase();
                if (valA < valB) return this.ordenAscendente ? -1 : 1;
                if (valA > valB) return this.ordenAscendente ? 1 : -1;
                return 0;
            });
        }

        return asignaciones;
    }
}