export class DropdownSelect {
    constructor({ containerId, placeholder, onSelect, isMulti = false }) {
        this.containerId = containerId;
        this.placeholderText = placeholder;
        this.onSelect = onSelect;
        this.isMulti = isMulti;
        this.items = [];
        this.selectedValues = isMulti ? [] : null;
        
        this.isOpen = false;
        this._abortController = new AbortController();
    }

    render(container) {
        container.innerHTML = `
            <div style="position:relative; width:100%; box-sizing:border-box;" id="${this.containerId}-wrapper">
                <div id="${this.containerId}-toggle" style="width:100%; min-height:34px; padding:6px 10px; border:1px solid var(--border-color, #ccc); border-radius:4px; background:var(--bg-input, #fff); cursor:pointer; display:flex; align-items:center; justify-content:space-between; font-size:12px; box-sizing:border-box;">
                    <div id="${this.containerId}-display" style="display:flex; flex-wrap:wrap; gap:4px; align-items:center; color:var(--text-muted, #757575);">
                        ${this.placeholderText}
                    </div>
                    <span style="font-size:10px; color:var(--text-muted, #555); margin-left:6px;">▼</span>
                </div>
                <div id="${this.containerId}-panel" style="display:none; position:absolute; top:100%; left:0; width:100%; max-height:180px; overflow-y:auto; background:var(--bg-card, #fff); border:1px solid var(--border-color, #ccc); border-top:none; border-radius:0 0 4px 4px; z-index:100; box-shadow:0 4px 6px rgba(0,0,0,0.1); box-sizing:border-box;">
                    <div id="${this.containerId}-list" style="padding:4px 0;"></div>
                </div>
            </div>
        `;
        this._bindEvents();
    }

    setItems(items) {
        this.items = Array.isArray(items) ? items : [];
        this._renderOptions();
        this._updateDisplay();
    }

    setSelected(values) {
        this.selectedValues = values;
        this._renderOptions();
        this._updateDisplay();
    }

    _renderOptions() {
        const listEl = document.getElementById(`${this.containerId}-list`);
        if (!listEl) return;

        if (this.items.length === 0) {
            listEl.innerHTML = `<div style="padding:8px 12px; font-size:12px; color:var(--text-muted, #757575);">No hay opciones disponibles</div>`;
            return;
        }

        listEl.innerHTML = this.items.map(item => {
            const id = String(item.id);
            const nombre = this._escapeHtml(item.nombre);
            
            if (this.isMulti) {
                const isSelected = this.selectedValues.includes(id);
                return `
                    <div class="dropdown-option-item" data-id="${id}" style="padding:6px 12px; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; background:${isSelected ? 'var(--badge-success-bg, #e8f5e9)' : 'transparent'}; color:${isSelected ? 'var(--success, #2e7d32)' : 'var(--text-main, #212121)'}; font-weight:${isSelected ? '600' : 'normal'};">
                        <span>${nombre}</span>
                        ${isSelected ? '<span style="font-size:11px; color:var(--success, #2e7d32);">✓</span>' : ''}
                    </div>
                `;
            } else {
                const isSelected = String(this.selectedValues) === id;
                return `
                    <div class="dropdown-option-item" data-id="${id}" style="padding:8px 12px; font-size:12px; cursor:pointer; background:${isSelected ? 'var(--hover-bg, #e3f2fd)' : 'transparent'}; color:${isSelected ? 'var(--primary, #1565c0)' : 'var(--text-main, #212121)'}; font-weight:${isSelected ? '600' : 'normal'};">
                        ${nombre}
                    </div>
                `;
            }
        }).join('');
    }

    _updateDisplay() {
        const displayEl = document.getElementById(`${this.containerId}-display`);
        if (!displayEl) return;

        if (this.isMulti) {
            if (this.selectedValues.length === 0) {
                displayEl.innerHTML = `<span style="color:var(--text-muted, #757575);">${this.placeholderText}</span>`;
                return;
            }
            displayEl.innerHTML = this.selectedValues.map(id => {
                const found = this.items.find(i => String(i.id) === String(id));
                const name = found ? found.nombre : 'Item';
                return `
                    <span style="background:var(--badge-success-bg, #e8f5e9); color:var(--badge-success-text, #1b5e20); border:1px solid var(--border-color, #a5d6a7); border-radius:12px; padding:2px 8px; font-size:11px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                        ${this._escapeHtml(name)}
                        <span class="btn-remove-chip" data-id="${id}" style="cursor:pointer; color:var(--success, #2e7d32); font-weight:bold;">&times;</span>
                    </span>
                `;
            }).join('');
        } else {
            if (!this.selectedValues) {
                displayEl.textContent = this.placeholderText;
                displayEl.style.color = 'var(--text-muted, #757575)';
            } else {
                const found = this.items.find(i => String(i.id) === String(this.selectedValues));
                displayEl.textContent = found ? found.nombre : this.placeholderText;
                displayEl.style.color = found ? 'var(--text-main, #212121)' : 'var(--text-muted, #757575)';
            }
        }
    }

    _bindEvents() {
        const signal = this._abortController.signal;
        const toggleEl = document.getElementById(`${this.containerId}-toggle`);
        const panelEl = document.getElementById(`${this.containerId}-panel`);
        const listEl = document.getElementById(`${this.containerId}-list`);
        const displayEl = document.getElementById(`${this.containerId}-display`);

        if (toggleEl && panelEl) {
            toggleEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.isOpen = panelEl.style.display === 'block';
                panelEl.style.display = this.isOpen ? 'none' : 'block';
                this.isOpen = !this.isOpen;
            }, { signal });
        }

        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById(`${this.containerId}-wrapper`);
            if (wrapper && panelEl && !wrapper.contains(e.target)) {
                panelEl.style.display = 'none';
                this.isOpen = false;
            }
        }, { signal });

        if (listEl) {
            listEl.addEventListener('click', (e) => {
                const itemEl = e.target.closest('.dropdown-option-item');
                if (!itemEl) return;
                const id = itemEl.getAttribute('data-id');

                if (this.isMulti) {
                    if (this.selectedValues.includes(id)) {
                        this.selectedValues = this.selectedValues.filter(val => val !== id);
                    } else {
                        this.selectedValues.push(id);
                    }
                    this._renderOptions();
                    this._updateDisplay();
                    if (this.onSelect) this.onSelect(this.selectedValues);
                } else {
                    this.selectedValues = id;
                    this._renderOptions();
                    this._updateDisplay();
                    if (panelEl) panelEl.style.display = 'none';
                    this.isOpen = false;
                    if (this.onSelect) this.onSelect(this.selectedValues);
                }
            }, { signal });
        }

        if (this.isMulti && displayEl) {
            displayEl.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.btn-remove-chip');
                if (removeBtn) {
                    e.stopPropagation();
                    const id = removeBtn.getAttribute('data-id');
                    this.selectedValues = this.selectedValues.filter(val => val !== id);
                    this._renderOptions();
                    this._updateDisplay();
                    if (this.onSelect) this.onSelect(this.selectedValues);
                }
            }, { signal });
        }
    }

    unmount() {
        this._abortController.abort();
    }

    _escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
}