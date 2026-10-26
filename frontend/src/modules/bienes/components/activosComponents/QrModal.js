export class QrModal {
    constructor() {
        this._createDOM();
        this._injectPrintStyles();
        this._bindEvents();
    }

    _createDOM() {
        if (document.getElementById('modal-qr-container')) return;

        const modalHtml = `
            <div id="modal-qr-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999;">
                <div style="background:white; padding:20px; border-radius:8px; max-width:420px; width:90%; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
                    <h4 style="margin-top:0; color:#1a237e;">Etiqueta Patrimonial del Bien</h4>
                    
                    <div id="print-sticker-area" style="border:2px dashed #000; padding:15px; border-radius:6px; margin:15px 0; background:#fff; text-align:center;">
                        <div style="font-size:10px; font-weight:bold; text-transform:uppercase; color:#333; margin-bottom:4px;">TecNM - Patrimonio Institucional</div>
                        <div id="qr-code-box" style="display:flex; justify-content:center; margin:10px 0;"></div>
                        <div id="qr-info-desc" style="font-weight:bold; font-size:12px; margin-bottom:2px;"></div>
                        <div id="qr-info-details" style="font-size:10px; color:#555;"></div>
                        <div id="qr-info-inventario" style="font-family:monospace; font-size:11px; margin-top:6px; font-weight:700;"></div>
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button id="btn-imprimir-qr" style="background:#2e7d32; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600;">🖨️ Imprimir Etiqueta</button>
                        <button id="btn-cerrar-modal-qr" style="background:#757575; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    _injectPrintStyles() {
        if (!document.getElementById('style-print-qr')) {
            const style = document.createElement('style');
            style.id = 'style-print-qr';
            style.innerHTML = `
                @media print {
                    body * { visibility: hidden !important; }
                    #print-sticker-area, #print-sticker-area * { visibility: visible !important; }
                    #print-sticker-area { 
                        position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; border: 2px solid #000 !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    _bindEvents() {
        document.getElementById('btn-imprimir-qr')?.addEventListener('click', () => window.print());
        document.getElementById('btn-cerrar-modal-qr')?.addEventListener('click', () => this.cerrar());
    }

    abrir(item) {
        if (!item) return;

        const qrBox = document.getElementById('qr-code-box');
        qrBox.innerHTML = '';

        if (window.QRCode) {
            new window.QRCode(qrBox, {
                text: item.numero_inventario || item.id_bien,
                width: 130, height: 130,
                colorDark: "#000000", colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.H
            });
        }

        document.getElementById('qr-info-desc').textContent = item.descripcion || '';
        document.getElementById('qr-info-details').textContent = [item.marca, item.modelo, item.serie ? `S/N: ${item.serie}` : null].filter(Boolean).join(' | ');
        document.getElementById('qr-info-inventario').textContent = `No. Inv: ${item.numero_inventario || 'N/D'}`;
        
        document.getElementById('modal-qr-container').style.display = 'flex';
    }

    cerrar() {
        const modal = document.getElementById('modal-qr-container');
        if (modal) modal.style.display = 'none';
    }
}