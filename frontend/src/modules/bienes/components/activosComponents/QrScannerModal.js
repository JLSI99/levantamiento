export class QrScannerModal {
    constructor(onScanSuccess) {
        this.onScanSuccess = onScanSuccess;
        this._html5QrCodeScanner = null;
        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        if (document.getElementById('modal-scanner-container')) return;

        const modalHtml = `
            <div id="modal-scanner-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999;">
                <div style="background:white; padding:20px; border-radius:8px; max-width:400px; width:90%; text-align:center;">
                    <h4 style="margin-top:0; color:#0288d1;">Escanear Código QR</h4>
                    <div id="reader-qr-camera" style="width:100%; min-height:250px; background:#000; margin:10px 0; border-radius:4px;"></div>
                    <button id="btn-cerrar-scanner" style="background:#c62828; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">Cancelar Escaneo</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _bindEvents() {
        document.getElementById('btn-cerrar-scanner')?.addEventListener('click', () => this.detener());
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
}