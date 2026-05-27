
import { z } from 'zod';

const USERNAME_REGEX = /^[a-zA-Z0-9]([._-]?[a-zA-Z0-9])+$/;

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'El identificador de acceso debe contener al menos 3 caracteres')
    .max(50, 'El identificador de acceso no puede exceder los 50 caracteres')
    .trim()
    .refine(
      (val) => z.string().email().safeParse(val).success || USERNAME_REGEX.test(val),
      {
        message: 'Debe ingresar un nombre de usuario válido o un correo electrónico institucional',
      }
    ),
  password: z
    .string()
    .min(6, 'La contraseña debe contener al menos 6 caracteres')
    .max(128, 'La contraseña excede el límite seguro de caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;