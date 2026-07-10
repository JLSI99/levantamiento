import authStore from '../store/authStore.js';

/**
 * @param {Object} state
 * @returns {boolean}
 */
export function isAdmin(state) {
    return state.user && (state.user.rol === 1 || state.user.rol_id === 1);
}

/**
 * @param {string|string[]|Function} requiredCapabilities
 * @param {Object} state
 * @param {boolean} matchAll
 * @returns {boolean}
 */
export function checkAccess(requiredCapabilities, state, matchAll = false) {
    if (!state.isAuthenticated) return false;

    if (isAdmin(state)) return true;

    if (typeof requiredCapabilities === 'function') {
        return requiredCapabilities(state);
    }

    const capabilities = Array.isArray(requiredCapabilities) ? requiredCapabilities : [requiredCapabilities];
    if (!state.capabilities) return false;

    return matchAll 
        ? capabilities.every(cap => state.capabilities.includes(cap))
        : capabilities.some(cap => state.capabilities.includes(cap));
}

/**
 * @param {string|string[]|Function} requiredCapabilities 
 * @param {HTMLElement} element 
 * @param {boolean} matchAll 
 * @returns {HTMLDivElement} 
 */
export function guardElement(requiredCapabilities, element, matchAll = false) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'contents';
    
    const label = typeof requiredCapabilities === 'function' ? 'ContextualRule' : requiredCapabilities;
    wrapper.setAttribute('data-capability-guard', Array.isArray(label) ? label.join(' ') : label);

    const placeholder = document.createComment(`CapBAC Protection Node: Requires [${label}]`);
    wrapper.appendChild(placeholder);

    let isFirstRun = true;

    const unsubscribe = authStore.subscribe((state) => {
        
        if (!isFirstRun && !wrapper.isConnected) {
            cleanup();
            return;
        }
        isFirstRun = false;

        const tienePermiso = checkAccess(requiredCapabilities, state, matchAll);

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

    const observer = new MutationObserver(() => {
        if (!wrapper.isConnected) {
            cleanup();
        }
    });

    Promise.resolve().then(() => {
        if (wrapper.isConnected) {
            observer.observe(wrapper.parentElement, { childList: true });
        } else if (wrapper.parentElement) {
            observer.observe(wrapper.parentElement, { childList: true });
        } else {
            observer.observe(document.body, { childList: true });
        }
    });

    wrapper.__cleanupGuard = cleanup;
    return wrapper;
}