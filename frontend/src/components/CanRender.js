import authStore from '../store/authStore.js';

/**
 * Guarda defensivo perimetral a nivel de interfaz (UI Element Guard).
 * Modifica dinámicamente el árbol de renderizado según los privilegios criptográficos del token.
 * * @param {string|string[]} requiredCapabilities - Capacidad o lista de capacidades a evaluar.
 * @param {HTMLElement} element - Nodo real del DOM a proteger.
 * @param {boolean} matchAll - Si es verdadero, exige el cumplimiento total de todas las capacidades.
 * @returns {HTMLDivElement} - Nodo envoltura reactivo.
 */
export function guardElement(requiredCapabilities, element, matchAll = false) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'contents'; // Evita romper las flexbox o grids de los contenedores padres
    
    const capabilities = Array.isArray(requiredCapabilities) ? requiredCapabilities : [requiredCapabilities];
    wrapper.setAttribute('data-capability-guard', capabilities.join(' '));

    // Elemento alternativo para ocultación en caliente sin romper la estructura sintáctica
    const placeholder = document.createComment(`CapBAC Protection Node: Requires [${capabilities.join(', ')}]`);
    wrapper.appendChild(placeholder);

    let isFirstRun = true;

    // Suscripción atómica al store de autenticación
    const unsubscribe = authStore.subscribe((state) => {
        // Prevención de fugas de memoria: Si el nodo se desconectó del DOM de la SPA, destruir suscripción
        if (!isFirstRun && !wrapper.isConnected) {
            cleanup();
            return;
        }
        isFirstRun = false;

        if (!state.isAuthenticated || !state.capabilities) {
            if (!wrapper.contains(placeholder)) {
                wrapper.innerHTML = '';
                wrapper.appendChild(placeholder);
            }
            return;
        }

        // Evaluación lógica binaria de capacidades CapBAC
        const tienePermiso = matchAll 
            ? capabilities.every(cap => state.capabilities.includes(cap))
            : capabilities.some(cap => state.capabilities.includes(cap));

        if (tienePermiso) {
            if (!wrapper.contains(element)) {
                wrapper.innerHTML = '';
                wrapper.appendChild(element);
            }
        } else {
            if (!wrapper.contains(placeholder)) {
                wrapper.innerHTML = '';
                wrapper.appendChild(placeholder);
            }
        }
    });

    function cleanup() {
        unsubscribe();
        observer.disconnect();
    }

    // Monitoreo del ciclo de vida del componente mediante mutaciones del árbol nativo
    const observer = new MutationObserver(() => {
        if (!wrapper.isConnected) cleanup();
    });

    Promise.resolve().then(() => {
        if (wrapper.isConnected) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else if (wrapper.parentElement) {
            observer.observe(wrapper.parentElement, { childList: true, subtree: true });
        } else {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

    // Inyección de un guard de recolección de basura explícito para el Kernel de la SPA
    wrapper.__cleanupGuard = cleanup;
    return wrapper;
}