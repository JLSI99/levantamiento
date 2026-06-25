import { AsistenteAlta } from '../../components/AsistenteAlta.js';
import { guardElement } from '../../components/CanRender.js';

export function crearModuloAsistenteAdministrativo() {
    const widget = document.createElement('section');
    widget.className = 'widget-box';
    
    const innerContainer = document.createElement('div');
    const containerId = `wizard-${Math.random().toString(36).substring(2, 9)}`;
    innerContainer.id = containerId;
    widget.appendChild(innerContainer);

    setTimeout(() => {
        const asistente = new AsistenteAlta(containerId);
        asistente.render();
    }, 0);

    return guardElement('OP_ADMIN_USUARIOS', widget);
}