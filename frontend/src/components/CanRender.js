import authStore from '../store/auhtStore.js';

export function guardElement(capability, element) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'contents';
    wrapper.setAttribute('data-capability-guard', capability);

    const placeholder = document.createComment(`Hidden: Requires capability [${capability}]`);

    authStore.subscribe((state) => {
        const tienePermiso = state.isAuthenticated && state.capabilities.includes(capability);

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

    return wrapper;
}