export type AuthContext = 'STAFF' | 'GUEST';
export type LoginResult = { kind: 'authenticated'; context: AuthContext } | { kind: 'selection'; contexts: AuthContext[] };
