import { passwordLoginInput } from '@/lib/login-input';
export type LoginCredentials = { email: string; password: string; context?: 'STAFF' | 'GUEST' };
export function loginCredentials(value: unknown): LoginCredentials | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const credentials = passwordLoginInput(input.email, input.password);
  if (!credentials || (input.context !== undefined && input.context !== 'STAFF' && input.context !== 'GUEST')) return null;
  return { ...credentials, ...(input.context ? { context: input.context as 'STAFF' | 'GUEST' } : {}) };
}
