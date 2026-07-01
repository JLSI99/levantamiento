import authStore from '../store/authStore.js';

/**
 * @param {string|string[]} requiredCapabilities 
 * @param {HTMLElement} element 
 * @param {boolean} matchAll 
 * @returns {HTMLElement} 
 */
export function guardElement(requiredCapabilities, element, matchAll = false) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'contents';
    
    const capabilities = Array.isArray(requiredCapabilities) ? requiredCapabilities : [requiredCapabilities];
    wrapper.setAttribute('data-capability-guard', capabilities.join(' '));

    const placeholder = document.createComment(`Hidden: Requires capabilities [${capabilities.join(', ')}]`);
    wrapper.appendChild(placeholder);

    let isFirstRun = true;

    const unsubscribe = authStore.subscribe((state) => {
        if (!isFirstRun && !wrapper.isConnected) {
            unsubscribe();
            return;
        }
        isFirstRun = false;

        if (!state.isAuthenticated) {
            if (!wrapper.contains(placeholder)) {
                wrapper.innerHTML = '';
                wrapper.appendChild(placeholder);
            }
            return;
        }

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

    wrapper.__cleanupGuard = unsubscribe;

    return wrapper;
}