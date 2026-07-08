import authStore from '../store/authStore.js';

export function guardElement(requiredCapabilities, element, matchAll = false) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'contents';
    
    const capabilities = Array.isArray(requiredCapabilities) ? requiredCapabilities : [requiredCapabilities];
    wrapper.setAttribute('data-capability-guard', capabilities.join(' '));

    const placeholder = document.createComment(`Hidden: Requires [${capabilities.join(', ')}]`);
    wrapper.appendChild(placeholder);

    let isFirstRun = true;

    const unsubscribe = authStore.subscribe((state) => {
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

    wrapper.__cleanupGuard = cleanup;
    return wrapper;
}