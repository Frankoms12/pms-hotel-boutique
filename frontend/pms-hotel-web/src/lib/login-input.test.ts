import { describe, expect, it } from 'vitest';
import { passwordLoginInput, passwordExceedsByteLimit } from './login-input';
const email50 = 'a'.repeat(37) + '@example.test';
describe('traditional login input contract', () => {
  it('accepts exactly 50 after email trim/lowercase and preserves the password', () => {
    expect(email50.length).toBe(50);
    const password = ' ' + 'Z!'.repeat(24) + ' ';
    expect(password.length).toBe(50);
    expect(passwordLoginInput('  ' + email50.toUpperCase() + '  ', password)).toEqual({ email: email50, password });
  });
  it.each([1, 50])('accepts password length %i without complexity rules', length => {
    expect(passwordLoginInput('valid@example.test', 'x'.repeat(length))).toEqual({ email: 'valid@example.test', password: 'x'.repeat(length) });
  });
  it.each(['a'.repeat(38)+'@example.test', '', '   ', 'bad-email', 'two@@example.test', 'a..b@example.test', 'a@-example.test', 'a@example..test', 'a@exa_mple.test'])('rejects invalid email case %#', email => {
    expect(passwordLoginInput(email, 'x')).toBeNull();
  });
  it.each(['x'.repeat(51), '', '   '])('rejects invalid password case %#', password => {
    expect(passwordLoginInput('valid@example.test', password)).toBeNull();
  });
  it('uses actual UTF-8 bytes independently of the unchanged character limit',()=>{
    expect(passwordLoginInput('valid@example.test','界'.repeat(24))).not.toBeNull();
    expect(passwordExceedsByteLimit('界'.repeat(24))).toBe(false);
    expect(passwordLoginInput('valid@example.test','界'.repeat(25))).toBeNull();
    expect(passwordLoginInput('valid@example.test','é'.repeat(36))).not.toBeNull();
    expect(passwordLoginInput('valid@example.test','é'.repeat(37))).toBeNull();
    expect(passwordLoginInput('valid@example.test','😀'.repeat(18))).not.toBeNull();
    expect(passwordLoginInput('valid@example.test','😀'.repeat(19))).toBeNull();
    expect(passwordLoginInput('valid@example.test','e\u0301'.repeat(24))?.password).toBe('e\u0301'.repeat(24));
  });

});
