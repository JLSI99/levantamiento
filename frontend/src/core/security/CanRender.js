import authStore from '/src/core/store/authStore.js';

/**
 * @param {Object} state
 * @returns {boolean}
 */
export function isAdmin(state) {
  if (!state || !state.isAuthenticated) return false;

  if (Array.isArray(state.roles)) {
    const normalizedRoles = state.roles.map((r) => String(r).toUpperCase());
    if (
      normalizedRoles.includes('ADMINISTRADOR') ||
      normalizedRoles.includes('ADMIN') ||
      normalizedRoles.includes('SUPERADMIN')
    ) {
      return true;
    }
  }

  if (
    state.user &&
    (state.user.rol === 1 || state.user.rol_id === 1 || state.user.rol === 'ADMINISTRADOR')
  ) {
    return true;
  }

  if (
    Array.isArray(state.capabilities) &&
    (state.capabilities.includes('*') || state.capabilities.includes('admin:all'))
  ) {
    return true;
  }

  return false;
}

/**
 * @param {string|string[]|Function} requiredCapabilities
 * @param {Object} state
 * @param {boolean} matchAll
 * @returns {boolean}
 */
export function checkAccess(requiredCapabilities, state, matchAll = false) {
  if (!state || !state.isAuthenticated) return false;

  if (isAdmin(state)) return true;

  if (typeof requiredCapabilities === 'function') {
    return Boolean(requiredCapabilities(state));
  }

  const capabilities = Array.isArray(requiredCapabilities)
    ? requiredCapabilities
    : [requiredCapabilities];
  if (!Array.isArray(state.capabilities)) return false;

  return matchAll
    ? capabilities.every((cap) => state.capabilities.includes(cap))
    : capabilities.some((cap) => state.capabilities.includes(cap));
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

  const label =
    typeof requiredCapabilities === 'function' ? 'ContextualRule' : requiredCapabilities;
  wrapper.setAttribute('data-capability-guard', Array.isArray(label) ? label.join(' ') : String(label));

  const placeholder = document.createComment(`CapBAC Protection Node: Requires [${label}]`);
  wrapper.appendChild(placeholder);

  let isCleanedUp = false;
  let observer = null;

  function cleanup() {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (typeof unsubscribe === 'function') unsubscribe();
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  const unsubscribe = authStore.subscribe((state) => {
    if (isCleanedUp) return;

    if (!wrapper.isConnected && wrapper.parentElement === null) {
      cleanup();
      return;
    }

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

  observer = new MutationObserver(() => {
    if (!wrapper.isConnected && wrapper.parentElement === null) {
      cleanup();
    }
  });

  Promise.resolve().then(() => {
    if (isCleanedUp) return;
    const targetParent = wrapper.parentElement || document.body;
    observer.observe(targetParent, { childList: true });
  });

  wrapper.__cleanupGuard = cleanup;
  return wrapper;
}