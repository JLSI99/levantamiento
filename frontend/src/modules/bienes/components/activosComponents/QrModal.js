export class QrModal {
    constructor() {
        this._abortController = new AbortController();
        this._createDOM();
        this._injectPrintStyles();
        this._bindEvents();
    }

    _createDOM() {
        if (document.getElementById('modal-qr-container')) return;

        const modalHtml = `
            <div id="modal-qr-container" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); justify-content:center; align-items:center; z-index:9999; padding:15px; box-sizing:border-box;">
                <div style="background:var(--bg-card, #fff); padding:20px; border-radius:8px; max-width:420px; width:100%; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.3); box-sizing:border-box;">
                    <h4 style="margin-top:0; color:var(--primary, #1a237e); font-size:15px; font-weight:700;">Etiqueta Patrimonial del Bien</h4>
                    
                    <div id="print-sticker-area" style="border:2px dashed #000; padding:15px; border-radius:6px; margin:15px 0; background:#fff; text-align:center; box-sizing:border-box;">
                        <div style="font-size:10px; font-weight:bold; text-transform:uppercase; color:#333; margin-bottom:4px;">TecNM - Patrimonio Institucional</div>
                        <div id="qr-code-box" style="display:flex; justify-content:center; margin:10px 0;"></div>
                        <div id="qr-info-desc" style="font-weight:bold; font-size:12px; margin-bottom:2px; color:#212121;"></div>
                        <div id="qr-info-details" style="font-size:10px; color:#555;"></div>
                        <div id="qr-info-inventario" style="font-family:monospace; font-size:11px; margin-top:6px; font-weight:700; color:#000;"></div>
                    </div>

                    <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                        <button type="button" id="btn-imprimir-qr" style="background:var(--success, #2e7d32); color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px; flex:1; min-width:140px;">🖨️ Imprimir Etiqueta</button>
                        <button type="button" id="btn-cerrar-modal-qr" style="background:var(--text-muted, #757575); color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:600; flex:1; min-width:100px;">Cerrar</button>
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
        const signal = this._abortController.signal;
        document.getElementById('btn-imprimir-qr')?.addEventListener('click', () => window.print(), { signal });
        document.getElementById('btn-cerrar-modal-qr')?.addEventListener('click', () => this.cerrar(), { signal });

        document.getElementById('modal-qr-container')?.addEventListener('click', (e) => {
            const modal = document.getElementById('modal-qr-container');
            if (e.target === modal) this.cerrar();
        }, { signal });
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

    unmount() {
        this._abortController.abort();
        document.getElementById('modal-qr-container')?.remove();
        document.getElementById('style-print-qr')?.remove();
    }
}