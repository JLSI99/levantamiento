export class GaleriaModal {
    constructor() {
        this._galeriaActual = [];
        this._indexGaleriaActual = 0;
        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        if (document.getElementById('modal-img-preview')) return;

        const modalHtml = `
            <div id="modal-img-preview" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); justify-content:center; align-items:center; z-index:9999;">
                <div style="position:relative; background:white; padding:15px; border-radius:8px; max-width:85vw; max-height:85vh; display:flex; flex-direction:column; align-items:center; min-width:320px;">
                    <button id="btn-cerrar-img-modal" style="position:absolute; top:-12px; right:-12px; background:#c62828; color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.3);">&times;</button>
                    
                    <div style="position:relative; display:flex; align-items:center; justify-content:center; width:100%; height:60vh; background:#111; border-radius:6px; overflow:hidden;">
                        <button id="btn-galeria-prev" style="position:absolute; left:10px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; font-weight:bold; font-size:16px; z-index:10;">◀</button>
                        <img id="img-modal-target" src="" alt="Vista previa del bien" style="max-width:100%; max-height:100%; object-fit:contain; display:block;">
                        <button id="btn-galeria-next" style="position:absolute; right:10px; background:rgba(255,255,255,0.8); border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; font-weight:bold; font-size:16px; z-index:10;">▶</button>
                    </div>

                    <div id="galeria-contador" style="margin-top:8px; font-size:12px; font-weight:600; color:#424242;"></div>
                    <div id="galeria-thumbs-modal" style="display:flex; gap:8px; margin-top:8px; overflow-x:auto; max-width:100%; padding:4px;"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _bindEvents() {
        document.getElementById('btn-galeria-prev')?.addEventListener('click', () => this.cambiarImagen(-1));
        document.getElementById('btn-galeria-next')?.addEventListener('click', () => this.cambiarImagen(1));
        document.getElementById('btn-cerrar-img-modal')?.addEventListener('click', () => this.cerrar());

        document.getElementById('galeria-thumbs-modal')?.addEventListener('click', (e) => {
            const thumb = e.target.closest('.modal-thumb-item');
            if (thumb) {
                const idx = parseInt(thumb.getAttribute('data-index'), 10);
                if (!isNaN(idx)) this.mostrarImagen(idx);
            }
        });
    }

    abrir(imagenes) {
        if (!imagenes || imagenes.length === 0) return;
        this._galeriaActual = imagenes.map(img => img.url || (img.path_archivo ? `/media/${img.path_archivo}` : ''));
        this._indexGaleriaActual = 0;

        const modal = document.getElementById('modal-img-preview');
        if (modal) {
            modal.style.display = 'flex';
            this.mostrarImagen(0);
        }
    }

    mostrarImagen(index) {
        if (index < 0 || index >= this._galeriaActual.length) return;
        this._indexGaleriaActual = index;

        const targetImg = document.getElementById('img-modal-target');
        const contador = document.getElementById('galeria-contador');
        const thumbsContainer = document.getElementById('galeria-thumbs-modal');
        const btnPrev = document.getElementById('btn-galeria-prev');
        const btnNext = document.getElementById('btn-galeria-next');

        if (targetImg) targetImg.src = this._galeriaActual[index];
        if (contador) contador.textContent = `Imagen ${index + 1} de ${this._galeriaActual.length}`;

        if (btnPrev) btnPrev.style.display = this._galeriaActual.length > 1 ? 'block' : 'none';
        if (btnNext) btnNext.style.display = this._galeriaActual.length > 1 ? 'block' : 'none';

        if (thumbsContainer) {
            thumbsContainer.innerHTML = this._galeriaActual.map((url, i) => `
                <img src="${url}" class="modal-thumb-item" data-index="${i}" 
                    style="width:45px; height:45px; object-fit:cover; border-radius:4px; cursor:pointer; border: 2px solid ${i === index ? '#0288d1' : '#ccc'}; opacity: ${i === index ? '1' : '0.6'};">
            `).join('');
        }
    }

    cambiarImagen(delta) {
        const nuevoIndex = this._indexGaleriaActual + delta;
        if (nuevoIndex >= 0 && nuevoIndex < this._galeriaActual.length) {
            this.mostrarImagen(nuevoIndex);
        } else if (nuevoIndex < 0) {
            this.mostrarImagen(this._galeriaActual.length - 1);
        } else {
            this.mostrarImagen(0);
        }
    }

    cerrar() {
        const modal = document.getElementById('modal-img-preview');
        if (modal) modal.style.display = 'none';
    }
}