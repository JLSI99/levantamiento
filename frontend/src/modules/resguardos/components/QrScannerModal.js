export class QrScannerModal {
    constructor(containerIdElemento, containerModalId, onScanSuccess) {
        this.containerModalId = containerModalId || 'modal-scanner-resguardo';
        this.containerIdElemento = containerIdElemento || 'reader-qr-resguardo';
        this.onScanSuccess = onScanSuccess;
        this._html5QrCodeScanner = null;
        this._abortController = new AbortController();
        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        if (document.getElementById(this.containerModalId)) return;

        const modalHtml = `
            <div id="${this.containerModalId}" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999; padding:15px; box-sizing:border-box;">
                <div style="background:var(--bg-card, #fff); padding:20px; border-radius:8px; max-width:420px; width:100%; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.3); box-sizing:border-box;">
                    <h4 style="margin-top:0; color:var(--primary, #0288d1); font-size:14px; font-weight:700;">Escanear Código QR del Bien</h4>
                    <p style="font-size:11px; color:var(--text-muted, #555); margin-bottom:10px;">Coloque el código QR del activo frente a la cámara.</p>
                    <div id="${this.containerIdElemento}" style="width:100%; min-height:250px; background:#000; margin:10px 0; border-radius:4px; overflow:hidden; box-sizing:border-box;"></div>
                    <button type="button" id="btn-cerrar-scanner-${this.containerModalId}" style="background:var(--danger, #c62828); color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px; width:100%;">
                        Cancelar Escaneo
                    </button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _bindEvents() {
        const signal = this._abortController.signal;
        const btnCerrar = document.getElementById(`btn-cerrar-scanner-${this.containerModalId}`);
        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => this.detener(), { signal });
        }

        document.getElementById(this.containerModalId)?.addEventListener('click', (e) => {
            const modal = document.getElementById(this.containerModalId);
            if (e.target === modal) this.detener();
        }, { signal });
    }

    iniciar() {
        if (!window.Html5Qrcode) {
            alert('Librería de escáner QR no disponible.');
            return;
        }

        const modal = document.getElementById(this.containerModalId);
        if (modal) modal.style.display = 'flex';

        this._html5QrCodeScanner = new window.Html5Qrcode(this.containerIdElemento);
        this._html5QrCodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                this.detener();
                if (this.onScanSuccess) this.onScanSuccess(decodedText);
            },
            () => {}
        ).catch(err => {
            alert('No se pudo acceder a la cámara: ' + err);
            this.detener();
        });
    }

    detener() {
        const modal = document.getElementById(this.containerModalId);
        if (this._html5QrCodeScanner) {
            this._html5QrCodeScanner.stop().then(() => {
                this._html5QrCodeScanner = null;
                if (modal) modal.style.display = 'none';
            }).catch(() => {
                this._html5QrCodeScanner = null;
                if (modal) modal.style.display = 'none';
            });
        } else if (modal) {
            modal.style.display = 'none';
        }
    }

    unmount() {
        this.detener();
        this._abortController.abort();
        document.getElementById(this.containerModalId)?.remove();
    }
}