export class QrScannerModal {
    constructor(onScanSuccess) {
        this.onScanSuccess = onScanSuccess;
        this._html5QrCodeScanner = null;
        this._abortController = new AbortController();
        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        if (document.getElementById('modal-scanner-container')) return;

        const modalHtml = `
            <div id="modal-scanner-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999; padding:15px; box-sizing:border-box;">
                <div style="background:var(--bg-card, #fff); padding:20px; border-radius:8px; max-width:400px; width:100%; text-align:center; box-sizing:border-box; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                    <h4 style="margin-top:0; color:var(--primary, #0288d1); font-size:15px; font-weight:700;">Escanear Código QR</h4>
                    <div id="reader-qr-camera" style="width:100%; min-height:250px; background:#000; margin:10px 0; border-radius:4px; overflow:hidden; box-sizing:border-box;"></div>
                    <button type="button" id="btn-cerrar-scanner" style="background:var(--danger, #c62828); color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px; width:100%;">Cancelar Escaneo</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _bindEvents() {
        const signal = this._abortController.signal;
        document.getElementById('btn-cerrar-scanner')?.addEventListener('click', () => this.detener(), { signal });
        
        document.getElementById('modal-scanner-container')?.addEventListener('click', (e) => {
            const modal = document.getElementById('modal-scanner-container');
            if (e.target === modal) this.detener();
        }, { signal });
    }

    iniciar() {
        if (!window.Html5Qrcode) {
            alert('Librería de escáner no disponible.');
            return;
        }

        const container = document.getElementById('modal-scanner-container');
        if (container) container.style.display = 'flex';

        this._html5QrCodeScanner = new window.Html5Qrcode("reader-qr-camera");
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
        const container = document.getElementById('modal-scanner-container');
        if (this._html5QrCodeScanner) {
            this._html5QrCodeScanner.stop().then(() => {
                this._html5QrCodeScanner = null;
                if (container) container.style.display = 'none';
            }).catch(() => {
                this._html5QrCodeScanner = null;
                if (container) container.style.display = 'none';
            });
        } else {
            if (container) container.style.display = 'none';
        }
    }

    unmount() {
        this.detener();
        this._abortController.abort();
        document.getElementById('modal-scanner-container')?.remove();
    }
}