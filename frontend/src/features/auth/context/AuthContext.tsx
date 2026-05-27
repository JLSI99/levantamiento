// src/features/auth/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { UserPayload, TokenResponse } from '../types';
import type { LoginInput } from '../schemas/loginSchema';
import { authService } from '../services/authService';

interface AuthContextType {
  user: UserPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => void;
  hasCapability: (capability: string) => boolean;
  clearError: () => void;
}

const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const mapPayloadToUser = (decoded: any, fallbackUsername?: string): UserPayload | null => {
  if (!decoded) return null;
  return {
    id: decoded.sub,
    username: decoded.username || fallbackUsername || '',
    email: decoded.email || '',
    role: decoded.role || 'user',
    capabilities: decoded.capabilities || []
  };
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setError(null);
  }, []);

  const login = async (credentials: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data: TokenResponse = await authService.login(credentials);
      
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      const decoded = parseJwt(data.access_token);
      const realUser = mapPayloadToUser(decoded, credentials.identifier);
      
      if (!realUser) {
        throw new Error('El token emitido por el servidor posee un formato corrupto');
      }

      setUser(realUser);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error inesperado durante el inicio de sesión');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const hasCapability = useCallback((capability: string): boolean => {
    if (!user) return false;
    return user.capabilities.includes(capability);
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  const rehydrateAuth = useCallback(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const decoded = parseJwt(accessToken);
    const currentUser = mapPayloadToUser(decoded);

    if (currentUser) {
      setUser(currentUser);
    } else {
      
      authService.logout();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {

    rehydrateAuth();

    const handleGlobalLogout = () => logout();
    const handleTokenRefreshed = () => rehydrateAuth(); 

    window.addEventListener('auth_logout', handleGlobalLogout);
    window.addEventListener('auth_token_refreshed', handleTokenRefreshed);

    return () => {
      window.removeEventListener('auth_logout', handleGlobalLogout);
      window.removeEventListener('auth_token_refreshed', handleTokenRefreshed);
    };
  }, [logout, rehydrateAuth]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      login,
      logout,
      hasCapability,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};