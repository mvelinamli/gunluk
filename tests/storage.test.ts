import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JournalStorage } from '../electron/storage';

describe('JournalStorage', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gunluk-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('initializes encrypted vault, locks, and unlocks with password', () => {
    const storage = new JournalStorage(tempDir);
    expect(storage.isInitialized()).toBe(false);

    storage.setup('gizli1234', false);
    expect(storage.isInitialized()).toBe(true);
    expect(storage.isUnlocked()).toBe(true);

    storage.lock();
    expect(storage.isUnlocked()).toBe(false);
    expect(() => storage.listEntries()).toThrow();

    expect(storage.unlockWithPassword('yanlis')).toBe(false);
    expect(storage.unlockWithPassword('gizli1234')).toBe(true);
    expect(storage.isUnlocked()).toBe(true);
  });

  it('creates, auto-records date, updates, and deletes plain-text entries', () => {
    const storage = new JournalStorage(tempDir);
    storage.setup('parola1234', false);

    const created = storage.createEntry({
      title: 'İlk Günlük',
      body: 'Bugün düşüncelerimi ilk kez buraya yazıyorum.',
    });

    expect(created.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(created.createdAt).toBeTruthy();
    expect(created.title).toBe('İlk Günlük');

    // Reject URLs in entry body
    expect(() =>
      storage.createEntry({
        title: 'Link denemesi',
        body: 'https://example.com',
      }),
    ).toThrow();

    const updated = storage.updateEntry({
      id: created.id,
      title: 'İlk Günlük (Güncel)',
      body: 'Düzenlenmiş içerik.',
    });
    expect(updated.title).toBe('İlk Günlük (Güncel)');
    expect(storage.listEntries()).toHaveLength(1);

    storage.deleteEntry(created.id);
    expect(storage.listEntries()).toHaveLength(0);
  });

  it('supports biometric bridge unlock and password change', () => {
    const mockBridge = {
      isAvailable: () => true,
      protectSecret: (hex: string) => Buffer.from(hex, 'utf8').toString('base64'),
      unprotectSecret: (b64: string) => Buffer.from(b64, 'base64').toString('utf8'),
    };

    const storage = new JournalStorage(tempDir, mockBridge);
    storage.setup('eski-parola', true);
    storage.createEntry({ title: 'Not', body: 'Biyometrik test' });
    storage.lock();

    expect(storage.unlockWithBiometric()).toBe(true);
    expect(storage.listEntries()).toHaveLength(1);

    storage.changePassword('eski-parola', 'yeni-parola');
    storage.lock();

    expect(storage.unlockWithPassword('eski-parola')).toBe(false);
    expect(storage.unlockWithPassword('yeni-parola')).toBe(true);
  });
});
