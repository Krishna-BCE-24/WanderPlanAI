
import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address')
  .max(254, 'Email is too long')
  .transform((email) => email.toLowerCase());

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must contain at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters'),

  email: emailSchema,

  password: z
    .string()
    .min(8, 'Password must contain at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const loginSchema = z.object({
  email: emailSchema,

  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password cannot exceed 128 characters'),
});
