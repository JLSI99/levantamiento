export class MultiSelectDropdown {
    constructor(container, idPrefix, tituloPlaceholder, onSelectionChange) {
        this.container = container;
        this.idPrefix = idPrefix;
        this.tituloPlaceholder = tituloPlaceholder;
        this.onSelectionChange = onSelectionChange;
        this.seleccionados = [];
        this.catalogo = [];
    }

    actualizarCatalogo(nuevoCatalogo) {
        this.catalogo = nuevoCatalogo;
        this.render();
    }

    render() {
        const listEl = this.container.querySelector(`#${this.idPrefix}-options-list`);
        const placeholderEl = this.container.querySelector(`#${this.idPrefix}-placeholder`);

        if (listEl) {
            if (this.catalogo.length === 0) {
                listEl.innerHTML = `<div style="padding:8px 12px; font-size:12px; color:#757575;">Sin elementos</div>`;
            } else {
                listEl.innerHTML = this.catalogo.map(item => {
                    const id = String(item.id_departamento || item.id_edificio || item.id);
                    const isSelected = this.seleccionados.includes(id);
                    return `
                        <div class="dropdown-item" data-id="${id}" style="padding:6px 12px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:${isSelected ? '#e8f5e9' : 'transparent'}; color:${isSelected ? '#2e7d32' : '#212121'}; font-weight:${isSelected ? '600' : 'normal'};">
                            <span>${item.nombre}</span>
                            ${isSelected ? '<span style="font-size:11px; color:#2e7d32;">✓</span>' : ''}
                        </div>
                    `;
                }).join('');
            }
        }

        if (placeholderEl) {
            if (this.seleccionados.length === 0) {
                placeholderEl.innerHTML = `<span style="color:#757575;">-- ${this.tituloPlaceholder} --</span>`;
            } else {
                const nombres = this.seleccionados.map(id => {
                    const obj = this.catalogo.find(c => String(c.id_departamento || c.id_edificio || c.id) === String(id));
                    return obj ? obj.nombre : 'Item';
                });
                placeholderEl.innerHTML = `
                    <span style="background:#e8f5e9; color:#1b5e20; border:1px solid #a5d6a7; border-radius:10px; padding:1px 6px; font-size:11px; font-weight:600; white-space:nowrap;">
                        (${this.seleccionados.length}): ${nombres.join(', ')}
                    </span>
                `;
            }
        }
    }

    vincularEventos() {
        const toggleBtn = this.container.querySelector(`#${this.idPrefix}-toggle-btn`);
        const panel = this.container.querySelector(`#${this.idPrefix}-panel`);
        const listEl = this.container.querySelector(`#${this.idPrefix}-options-list`);

        if (toggleBtn && panel) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
            });
        }

        if (listEl) {
            listEl.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (item) {
                    const id = item.getAttribute('data-id');
                    if (this.seleccionados.includes(id)) {
                        this.seleccionados = this.seleccionados.filter(i => i !== id);
                    } else {
                        this.seleccionados.push(id);
                    }
                    this.render();
                    if (this.onSelectionChange) this.onSelectionChange(this.seleccionados);
                }
            });
        }
    }
}