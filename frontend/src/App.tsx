// src/App.tsx
import { useAuth } from './features/auth/hooks/useAuth';
import { LoginForm } from './features/auth/components/LoginForm';

function App() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();

  // Pantalla de bloqueo nativa mientras se resuelve la rehidratación del token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-700 mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-slate-600">Verificando sesión activa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      {!isAuthenticated ? (
        // Flujo No Autenticado: Muestra el formulario estructurado
        <LoginForm />
      ) : (
        // Flujo Autenticado Temporal (Prueba de integración exitosa)
        <div className="p-8 max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 text-center animate-fade-in">
          <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-brand-700 font-bold">✓</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 mb-1">
            ¡Autenticación Exitosa!
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            El túnel BFF-Microservicio ha respondido de forma correcta.
          </p>

          {/* Inspección de datos del Payload real del Token */}
          <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 mb-6 font-mono text-xs space-y-2">
            <div><span className="font-bold text-slate-700">Usuario:</span> {user?.username}</div>
            <div><span className="font-bold text-slate-700">Email:</span> {user?.email}</div>
            <div><span className="font-bold text-slate-700">Rol Activo:</span> {user?.role}</div>
            <div>
              <span className="font-bold text-slate-700">Capabilities:</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {user?.capabilities.map((cap) => (
                  <span key={cap} className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px]">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar Sesión Segura
          </button>
        </div>
      )}
    </div>
  );
}

export default App;