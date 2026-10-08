import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginWithCredentials } from './unified-login.service';
afterEach(() => vi.restoreAllMocks());
describe('browser login service boundary', () => {
  it('rejects multibyte overflow with generic credentials before fetching',()=>{const fetch=vi.spyOn(globalThis,'fetch');expect(()=>loginWithCredentials('valid@example.test','界'.repeat(25))).toThrow('Invalid credentials');expect(fetch).not.toHaveBeenCalled();});
  it.each([
    ['a'.repeat(38)+'@example.test','x'], ['bad-email','x'], ['','x'],
    ['valid@example.test','x'.repeat(51)], ['valid@example.test',''],
  ])('rejects invalid input case %# before fetching or caching credentials', (email, password) => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(() => loginWithCredentials(email,password)).toThrow('Invalid authentication input');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sends normalized email and exact 50-character password unchanged', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({authenticated:true,context:'STAFF'}));
    const email='a'.repeat(37)+'@example.test', password=' '+'X!'.repeat(24)+' ';
    await loginWithCredentials(' '+email.toUpperCase()+' ',password,'STAFF');
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({email,password,context:'STAFF'});
  });
});
