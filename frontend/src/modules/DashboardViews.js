import authStore from '/src/core/store/authStore.js';
import { authService } from '/src/services/auth.js';
import { CrudUsuariosPersonas } from '/src/modules/usuariosPersonas/crudUsuariosPersonas.js';
import { CrudUbicaciones } from '/src/modules/ubicaciones/crudUbicaciones.js';
import { CrudBienes } from '/src/modules/bienes/crudBienes.js';
import { HistorialResguardos } from '/src/modules/resguardos/crudResguardos.js';

const ROUTE_REGISTRY = [
  {
    id: 'usuarios_personas',
    label: 'Usuarios y Personas',
    roles: ['ADMINISTRADOR'], 
    view: CrudUsuariosPersonas,
  },
  {
    id: 'ubicaciones',
    label: 'Ubicaciones',
    roles: ['ADMINISTRADOR'],
    view: CrudUbicaciones,
  },
  {
    id: 'bienes',
    label: 'Gestión de Bienes',
    roles: ['ADMINISTRADOR', 'REGISTRADOR','REVISOR'],
    view: CrudBienes,
  },
  {
    id: 'resguardos',
    label: 'Resguardos y Custodia',
    roles: ['ADMINISTRADOR', 'LEVANTADOR', 'RESGUARDANTE'],
    view: HistorialResguardos,
  }
  
];

export class DashboardView {
  constructor(containerId) {
    this.containerId = containerId;
    this.activeModule = null;
    this.activeRouteId = null;
    this.onLogoutBound = null;
    this.unsubscribeStore = null;
  }

  /**
   * @param {Object} routeConfig
   * @param {Object} snapshot 
   * @returns {boolean}
   */
  tieneAccesoPorRol(routeConfig, snapshot) {
    if (!snapshot || !snapshot.isAuthenticated || !Array.isArray(snapshot.roles)) {
        return false;
    }

    const userRolesNormalizados = snapshot.roles.map(rol => String(rol).trim().toUpperCase());
    
    return routeConfig.roles.some(rolRequerido => 
        userRolesNormalizados.includes(rolRequerido.toUpperCase())
    );
  }

  render() {
    const root = document.getElementById(this.containerId);
    if (!root) throw new Error(`DOM Inválido: Contenedor ${this.containerId} no existe.`);

    root.innerHTML = `
      <div class="dashboard-layout">
          <aside id="app-sidebar" class="dashboard-sidebar">
              <div style="padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.2); margin-bottom:20px;">
                  <h3 style="margin:0; font-size:16px;">Sistema de Bienes</h3>
                  <p style="margin:5px 0 0 0; font-size:11px; color:rgba(255,255,255,0.7);" id="user-display-profile">Cargando identidad...</p>
              </div>
              <nav style="display:flex; flex-direction:column; gap:8px; flex-grow:1;" id="sidebar-nav"></nav>
              <button id="btn-logout" style="background:transparent; border:1px solid rgba(255,255,255,0.4); color:white; padding:10px; border-radius:4px; cursor:pointer; font-weight:600; font-size:12px; margin-top:auto;">
                  Cerrar Sesión
              </button>
          </aside>
          
          <main class="dashboard-main">
              <header style="background-color:white; padding:15px 20px; border-bottom:1px solid var(--border-color, #e2e8f0); display:flex; justify-content:space-between; align-items:center;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                      <button id="btn-toggle-sidebar" class="mobile-menu-toggle" aria-label="Abrir Menú">
                          ☰
                      </button>
                      <h2 id="workspace-title" style="margin:0; font-size:18px; color:var(--primary, #1a365d);">Inicializando Workspace...</h2>
                  </div>
              </header>
              <section id="workspace-content" style="padding:15px; flex-grow:1; box-sizing:border-box; overflow-y:auto;"></section>
          </main>
      </div>
    `;

    this.vincularGlobales();

    if (typeof this.unsubscribeStore === 'function') {
      this.unsubscribeStore();
    }
    this.unsubscribeStore = authStore.subscribe((snapshot) => {
      this.procesarEstadoDeSesion(snapshot);
    });
  }

  procesarEstadoDeSesion(snapshot) {
    if (!snapshot.isAuthenticated) return;

    this.actualizarUIPerfil(snapshot);

    const rutasPermitidas = ROUTE_REGISTRY.filter((route) => 
      this.tieneAccesoPorRol(route, snapshot)
    );

    this.construirMenuLateral(rutasPermitidas);
    this.resolverRutaActiva(rutasPermitidas);
  }

  actualizarUIPerfil(snapshot) {
    const userProfile = document.getElementById('user-display-profile');
    if (userProfile) {
      const username = snapshot.user?.username || 'Usuario Desconocido';
      const rolesBadge = (snapshot.roles && snapshot.roles.length > 0) 
          ? `[${snapshot.roles.join(' | ')}]` 
          : '[Sin Rol Asignado]';
          
      userProfile.textContent = `${username} ${rolesBadge}`;
    }
  }

  construirMenuLateral(rutasPermitidas) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';

    rutasPermitidas.forEach((config) => {
      const btn = document.createElement('button');
      btn.id = `nav-link-${config.id}`;
      btn.textContent = config.label;
      btn.style.cssText = 'background:transparent; border:none; color:rgba(255,255,255,0.7); text-align:left; padding:12px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:500; width:100%; transition: all 0.2s ease;';

      btn.onmouseover = () => { if (this.activeRouteId !== config.id) btn.style.background = 'rgba(255,255,255,0.1)'; };
      btn.onmouseout = () => { if (this.activeRouteId !== config.id) btn.style.background = 'transparent'; };

      btn.onclick = () => {
        this.cargarModulo(config);
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) sidebar.classList.remove('sidebar-open');
      };

      nav.appendChild(btn);
    });
  }

  resolverRutaActiva(rutasPermitidas) {
    if (rutasPermitidas.length === 0) {
      this.desmontarModuloActivo();
      this.mostrarPantallaAccesoDenegado();
      return;
    }

    if (this.activeRouteId) {
      const rutaMantienePermiso = rutasPermitidas.find((r) => r.id === this.activeRouteId);
      
      if (!rutaMantienePermiso) {
        this.cargarModulo(rutasPermitidas[0]);
      } else {
        this.resaltarBotonActivo(this.activeRouteId);
      }
    } else {
      this.cargarModulo(rutasPermitidas[0]);
    }
  }

  cargarModulo(routeConfig) {
    if (this.activeRouteId === routeConfig.id) return;

    this.desmontarModuloActivo();

    this.activeRouteId = routeConfig.id;
    this.resaltarBotonActivo(routeConfig.id);

    const titleContainer = document.getElementById('workspace-title');
    if (titleContainer) titleContainer.textContent = routeConfig.label;

    const content = document.getElementById('workspace-content');
    if (content) {
      content.innerHTML = '';
      this.activeModule = new routeConfig.view('workspace-content');
      this.activeModule.render();
    }
  }

  resaltarBotonActivo(routeId) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    
    nav.querySelectorAll('button').forEach((b) => {
      b.style.backgroundColor = 'transparent';
      b.style.color = 'rgba(255,255,255,0.7)';
      b.style.borderLeft = 'none';
    });

    const targetButton = document.getElementById(`nav-link-${routeId}`);
    if (targetButton) {
      targetButton.style.backgroundColor = 'rgba(255,255,255,0.15)';
      targetButton.style.color = '#ffffff';
      targetButton.style.borderLeft = '3px solid #63b3ed';
    }
  }

  mostrarPantallaAccesoDenegado() {
    const titleContainer = document.getElementById('workspace-title');
    if (titleContainer) titleContainer.textContent = 'Acceso Restringido';

    const content = document.getElementById('workspace-content');
    if (content) {
      content.innerHTML = `
        <div class="forbidden-container">
            <strong>Error de Autorización:</strong> Su cuenta no tiene asignado un rol operativo válido en la matriz de acceso. Contacte al administrador del sistema.
        </div>
      `;
    }
  }

  desmontarModuloActivo() {
    if (this.activeModule && typeof this.activeModule.unmount === 'function') {
      try {
        this.activeModule.unmount();
      } catch (error) {
        console.error(`[Dashboard] Fallo al desmontar módulo ${this.activeRouteId}:`, error);
      }
    }
    this.activeModule = null;
    this.activeRouteId = null;
  }

  vincularGlobales() {
    const logoutBtn = document.getElementById('btn-logout');
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('app-sidebar');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
      });
    }

    if (!logoutBtn) return;

    this.onLogoutBound = async () => {
      try {
        logoutBtn.disabled = true;
        await authService.logout();
      } catch (error) {
        console.error('[Dashboard] Error de red durante el logout:', error);
      } finally {
        authStore.clearSession();
      }
    };

    logoutBtn.addEventListener('click', this.onLogoutBound);
  }

  unmount() {
    this.desmontarModuloActivo();
    if (this.unsubscribeStore) this.unsubscribeStore();
    
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn && this.onLogoutBound) {
      logoutBtn.removeEventListener('click', this.onLogoutBound);
    }
  }
}