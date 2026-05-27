import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      'Falla de Arquitectura: useAuth() fue invocado fuera de un componente secundario de <AuthProvider />. ' +
      'Asegúrate de envolver el árbol de renderizado superior con el proveedor de autenticación.'
    );
  }
  
  return context;
};