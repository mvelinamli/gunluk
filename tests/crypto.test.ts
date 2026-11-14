import { describe, expect, it } from 'vitest';
import {
  decryptWithKey,
  deriveKey,
  encryptWithKey,
  generateDataKey,
  generateSalt,
} from '../electron/crypto';

describe('crypto', () => {
  it('encrypts and decrypts plaintext with AES-256-GCM', () => {
    const key = generateDataKey();
    const secret = 'Bugün hava çok güzeldi ve uzun bir yürüyüş yaptım.';

    const payload = encryptWithKey(secret, key);
    expect(payload.ciphertext).not.toContain('yürüyüş');

    const decrypted = decryptWithKey(payload, key);
    expect(decrypted).toBe(secret);
  });

  it('rejects decryption with a wrong password-derived key', () => {
    const salt = generateSalt();
    const correctKey = deriveKey('dogru-parola', salt);
    const wrongKey = deriveKey('yanlis-parola', salt);

    const payload = encryptWithKey('gizli günlük notu', correctKey);
    expect(() => decryptWithKey(payload, wrongKey)).toThrow();
  });
});
