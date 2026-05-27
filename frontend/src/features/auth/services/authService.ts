import { apiClient } from '../../../core/api/client';
import type { TokenResponse } from '../types';
import type { LoginInput } from '../schemas/loginSchema';
import axios from 'axios';

export const authService = {
  /**
   * Transmite las credenciales validadas hacia la API Gateway / BFF.
   * Método puro sin efectos secundarios en almacenamiento.
   * * @param credentials - Identificador y contraseña sanitizados por Zod.
   * @returns Promesa con los tokens emitidos por el servidor de identidad.
   */
  async login(credentials: LoginInput): Promise<TokenResponse> {
    try {
      const response = await apiClient.post<TokenResponse>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorMessage = error.response.data?.detail || 'Error de autenticación inesperado';
        throw new Error(errorMessage);
      }
      throw new Error('No se pudo establecer conexión con el servidor de autenticación');
    }
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });
      } catch (error) {
        console.warn('No se pudo revocar la sesión en el servidor remoto:', error);
      }
    }
  }
};