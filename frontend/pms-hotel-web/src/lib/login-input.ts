/** Login input contract shared by browser validation and the cookie BFF. */
export const LOGIN_MAX_LENGTH = 50;
export const PASSWORD_MAX_UTF8_BYTES = 72;
export function passwordExceedsByteLimit(password: unknown): boolean {
  return typeof password === "string" && new TextEncoder().encode(password).byteLength > PASSWORD_MAX_UTF8_BYTES;
}
// Mirrored by PasswordLoginValidator.EMAIL_PATTERN; evaluated after normalization.
const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;
export function passwordLoginInput(email: unknown, password: unknown): { email: string; password: string } | null {
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > LOGIN_MAX_LENGTH
    || !emailPattern.test(normalizedEmail)
    || !/\S/.test(password) || password.length > LOGIN_MAX_LENGTH || passwordExceedsByteLimit(password)) return null;
  return { email: normalizedEmail, password };
}
