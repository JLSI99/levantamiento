// src/components/CanRender.js
import authStore from '../store/authStore.js';

/**
 * Controla el renderizado de un elemento basado en las capacidades CapBAC del usuario.
 * @param {string} capability - La capacidad requerida (ej. 'bienes:editar')
 * @param {HTMLElement} element - El elemento HTML que se desea proteger
 * @returns {HTMLElement|Comment} El elemento original o un comentario vacío si no está autorizado
 */
export function guardElement(capability, element) {
    const placeholder = document.createComment(`Hidden: Requires ${capability}`);
    
    // Suscribirse de manera reactiva al almacén de autenticación
    authStore.subscribe((state) => {
        if (state.isAuthenticated && state.capabilities.includes(capability)) {
            if (placeholder.parentNode && !element.parentNode) {
                placeholder.parentNode.replaceChild(element, placeholder);
            }
        } else {
            if (element.parentNode) {
                element.parentNode.replaceChild(placeholder, element);
            }
        }
    });

    return authStore.hasCapability(capability) ? element : placeholder;
}