import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../schemas/loginSchema';
import type { LoginInput } from '../schemas/loginSchema';
import { useAuth } from '../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const { login, error, isLoading, clearError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data);
    } catch {
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Control de Bienes
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Inicia sesión con tus credenciales institucionales
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Alerta de Error del Servidor / BFF */}
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between animate-fade-in">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-red-500 hover:text-red-700 font-bold px-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Campo: Identificador Polimórfico */}
        <div>
          <label 
            htmlFor="identifier" 
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Usuario o Correo Institucional
          </label>
          <input
            id="identifier"
            type="text"
            disabled={isLoading}
            {...register('identifier')}
            className={`w-full px-3.5 py-2 border rounded-lg shadow-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
              errors.identifier
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                : 'border-slate-300 focus:ring-brand-500/20 focus:border-brand-500'
            }`}
            placeholder="ej: jorge.sanchez o usuario@universidad.edu.mx"
          />
          {errors.identifier && (
            <p className="mt-1.5 text-xs text-red-600">{errors.identifier.message}</p>
          )}
        </div>

        {/* Campo: Contraseña */}
        <div>
          <label 
            htmlFor="password" 
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            disabled={isLoading}
            {...register('password')}
            className={`w-full px-3.5 py-2 border rounded-lg shadow-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
              errors.password
                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                : 'border-slate-300 focus:ring-brand-500/20 focus:border-brand-500'
            }`}
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Botón de Envío Asíncrono */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-brand-700 hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Autenticando...
            </span>
          ) : (
            'Acceder al Sistema'
          )}
        </button>
      </form>
    </div>
  );
};