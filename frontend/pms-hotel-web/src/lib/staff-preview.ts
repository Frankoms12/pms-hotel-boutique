/** Explicit frontend preview; data mocks alone never enable a Staff identity. */
export function staffPreviewEnabled(): boolean {
  return process.env.NODE_ENV === 'development'
    && process.env.NEXT_PUBLIC_STAFF_PREVIEW === 'true'
    && process.env.NEXT_PUBLIC_USE_MOCK_API === 'true'
    && (typeof window === 'undefined' || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname));
}
