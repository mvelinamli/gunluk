import crypto from 'node:crypto';

export interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
}

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
};

export function generateSalt(): Buffer {
  return crypto.randomBytes(16);
}

export function generateDataKey(): Buffer {
  return crypto.randomBytes(32);
}

export function deriveKey(password: string, salt: Buffer): Buffer {
  if (!password) {
    throw new Error('Parola boş olamaz.');
  }
  return crypto.scryptSync(password, salt, 32, SCRYPT_PARAMS);
}

export function encryptWithKey(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };
}

export function decryptWithKey(payload: EncryptedPayload, key: Buffer): string {
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const ciphertext = Buffer.from(payload.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
