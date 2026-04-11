import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email format'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const onboardingSchema = z.object({
  name: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'Name is too long'),
  lastname: z
    .string()
    .max(50, 'Last name is too long')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val) return true;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(val)) return false;
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        // Must be in the past and after 1900
        const now = new Date();
        return date < now && date.getFullYear() >= 1900;
      },
      { message: 'Invalid date — use YYYY-MM-DD format' },
    ),
  gender: z
    .enum(['', 'Male', 'Female', 'Other'])
    .optional(),
  height: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseInt(val, 10);
        return !isNaN(num) && num > 50 && num < 300;
      },
      { message: 'Height must be between 50 and 300 cm' },
    ),
  weight: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val) return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 20 && num <= 300;
      },
      { message: 'Weight must be between 20 and 300 kg' },
    ),
});

/** Extract the first error message per field from a ZodError */
export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0]?.toString();
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}
