import { AsistenteAlta } from '../../components/AsistenteAlta.js';
import { guardElement } from '../../components/CanRender.js';

export function crearModuloAsistenteAdministrativo(state) {
    const widget = document.createElement('section');
    widget.className = 'widget-box';
    
    const innerContainer = document.createElement('div');
    const containerId = `wizard-${Math.random().toString(36).substring(2, 9)}`;
    innerContainer.id = containerId;
    widget.appendChild(innerContainer);

    const asistente = new AsistenteAlta(innerContainer);
    asistente.render();

    return guardElement(['usuarios:crear', 'personas:crear'], widget, true);
}