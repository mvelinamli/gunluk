import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  EncryptedPayload,
  decryptWithKey,
  deriveKey,
  encryptWithKey,
  generateDataKey,
  generateSalt,
} from './crypto';
import { sanitizePlainText, validatePlainText } from './textGuard';

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD (local date)
  title: string;
  body: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface VaultMeta {
  version: number;
  salt: string;
  wrappedKey: EncryptedPayload;
  biometricEnabled: boolean;
  biometricKeyProtected?: string; // base64 of safeStorage.encryptString
  autoLockMinutes: number;
}

export interface BiometricBridge {
  isAvailable: () => boolean;
  protectSecret: (secretHex: string) => string;
  unprotectSecret: (protectedBase64: string) => string;
}

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function getLocalDateKey(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function writeFileAtomic(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, content, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

export class JournalStorage {
  private readonly dataDir: string;
  private readonly metaPath: string;
  private readonly vaultPath: string;
  private readonly biometricBridge?: BiometricBridge;
  private activeKey: Buffer | null = null;

  constructor(dataDir: string, biometricBridge?: BiometricBridge) {
    this.dataDir = dataDir;
    this.metaPath = path.join(dataDir, 'meta.json');
    this.vaultPath = path.join(dataDir, 'vault.enc');
    this.biometricBridge = biometricBridge;
  }

  isInitialized(): boolean {
    return fs.existsSync(this.metaPath) && fs.existsSync(this.vaultPath);
  }

  isUnlocked(): boolean {
    return this.activeKey !== null;
  }

  lock(): void {
    if (this.activeKey) {
      this.activeKey.fill(0);
      this.activeKey = null;
    }
  }

  getMeta(): VaultMeta | null {
    if (!fs.existsSync(this.metaPath)) {
      return null;
    }
    const raw = fs.readFileSync(this.metaPath, 'utf8');
    return JSON.parse(raw) as VaultMeta;
  }

  private saveMeta(meta: VaultMeta): void {
    writeFileAtomic(this.metaPath, JSON.stringify(meta, null, 2));
  }

  private writeEntries(entries: JournalEntry[], key: Buffer): void {
    const payload = encryptWithKey(JSON.stringify({ entries }), key);
    writeFileAtomic(this.vaultPath, JSON.stringify(payload));
  }

  private readEntries(key: Buffer): JournalEntry[] {
    if (!fs.existsSync(this.vaultPath)) {
      return [];
    }
    const raw = fs.readFileSync(this.vaultPath, 'utf8');
    const payload = JSON.parse(raw) as EncryptedPayload;
    const decrypted = decryptWithKey(payload, key);
    const parsed = JSON.parse(decrypted) as { entries?: JournalEntry[] };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  }

  setup(password: string, enableBiometric = false): void {
    if (this.isInitialized()) {
      throw new Error('Günlük kasası zaten oluşturulmuş.');
    }
    if (password.length < 4) {
      throw new Error('Parola en az 4 karakter olmalıdır.');
    }

    const salt = generateSalt();
    const kek = deriveKey(password, salt);
    const dataKey = generateDataKey();
    const wrappedKey = encryptWithKey(dataKey.toString('hex'), kek);

    let biometricEnabled = false;
    let biometricKeyProtected: string | undefined;

    if (enableBiometric && this.biometricBridge?.isAvailable()) {
      biometricKeyProtected = this.biometricBridge.protectSecret(dataKey.toString('hex'));
      biometricEnabled = true;
    }

    const meta: VaultMeta = {
      version: 1,
      salt: salt.toString('hex'),
      wrappedKey,
      biometricEnabled,
      biometricKeyProtected,
      autoLockMinutes: 5,
    };

    fs.mkdirSync(this.dataDir, { recursive: true });
    this.writeEntries([], dataKey);
    this.saveMeta(meta);
    this.activeKey = dataKey;
  }

  unlockWithPassword(password: string): boolean {
    const meta = this.getMeta();
    if (!meta) {
      throw new Error('Günlük kasası henüz oluşturulmamış.');
    }

    try {
      const salt = Buffer.from(meta.salt, 'hex');
      const kek = deriveKey(password, salt);
      const dataKeyHex = decryptWithKey(meta.wrappedKey, kek);
      const dataKey = Buffer.from(dataKeyHex, 'hex');
      // Verify vault readability
      this.readEntries(dataKey);
      this.activeKey = dataKey;
      return true;
    } catch {
      return false;
    }
  }

  unlockWithBiometric(): boolean {
    const meta = this.getMeta();
    if (!meta || !meta.biometricEnabled || !meta.biometricKeyProtected) {
      return false;
    }
    if (!this.biometricBridge?.isAvailable()) {
      return false;
    }

    try {
      const dataKeyHex = this.biometricBridge.unprotectSecret(meta.biometricKeyProtected);
      const dataKey = Buffer.from(dataKeyHex, 'hex');
      this.readEntries(dataKey);
      this.activeKey = dataKey;
      return true;
    } catch {
      return false;
    }
  }

  changePassword(currentPassword: string, newPassword: string): void {
    if (newPassword.length < 4) {
      throw new Error('Yeni parola en az 4 karakter olmalıdır.');
    }
    const meta = this.getMeta();
    if (!meta) {
      throw new Error('Günlük kasası bulunamadı.');
    }

    const salt = Buffer.from(meta.salt, 'hex');
    let dataKeyHex: string;
    try {
      const currentKek = deriveKey(currentPassword, salt);
      dataKeyHex = decryptWithKey(meta.wrappedKey, currentKek);
    } catch {
      throw new Error('Mevcut parola hatalı.');
    }

    const newSalt = generateSalt();
    const newKek = deriveKey(newPassword, newSalt);
    const newWrappedKey = encryptWithKey(dataKeyHex, newKek);

    this.saveMeta({
      ...meta,
      salt: newSalt.toString('hex'),
      wrappedKey: newWrappedKey,
    });
  }

  setBiometricEnabled(enabled: boolean): boolean {
    const meta = this.getMeta();
    const key = this.requireUnlocked();
    if (!meta) {
      throw new Error('Günlük kasası bulunamadı.');
    }

    if (enabled) {
      if (!this.biometricBridge?.isAvailable()) {
        throw new Error('Bu cihazda biyometrik kilit desteklenmiyor.');
      }
      const protectedKey = this.biometricBridge.protectSecret(key.toString('hex'));
      this.saveMeta({
        ...meta,
        biometricEnabled: true,
        biometricKeyProtected: protectedKey,
      });
      return true;
    }

    const { biometricKeyProtected: _, ...rest } = meta;
    this.saveMeta({
      ...rest,
      biometricEnabled: false,
    });
    return false;
  }

  setAutoLockMinutes(minutes: number): number {
    const meta = this.getMeta();
    this.requireUnlocked();
    if (!meta) {
      throw new Error('Günlük kasası bulunamadı.');
    }
    const clamped = Math.max(0, Math.min(120, Math.round(minutes)));
    this.saveMeta({
      ...meta,
      autoLockMinutes: clamped,
    });
    return clamped;
  }

  private requireUnlocked(): Buffer {
    if (!this.activeKey) {
      throw new Error('Kasa kilitli. Devam etmek için kilidi açın.');
    }
    return this.activeKey;
  }

  listEntries(): JournalEntry[] {
    const key = this.requireUnlocked();
    const entries = this.readEntries(key);
    return entries.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  createEntry(input: { date?: string; title: string; body: string }): JournalEntry {
    const key = this.requireUnlocked();
    const title = sanitizePlainText(input.title).trim();
    const body = sanitizePlainText(input.body).trim();

    if (!title) {
      throw new Error('Başlık boş bırakılamaz.');
    }
    if (!body) {
      throw new Error('Günlük gövdesi boş bırakılamaz.');
    }

    const titleCheck = validatePlainText(title);
    if (!titleCheck.valid) {
      throw new Error(titleCheck.reason);
    }
    const bodyCheck = validatePlainText(body);
    if (!bodyCheck.valid) {
      throw new Error(bodyCheck.reason);
    }

    const now = new Date();
    const entryDate = input.date && DATE_KEY_REGEX.test(input.date) ? input.date : getLocalDateKey(now);
    const timestamp = now.toISOString();

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      date: entryDate,
      title,
      body,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const entries = this.readEntries(key);
    entries.push(entry);
    this.writeEntries(entries, key);
    return entry;
  }

  updateEntry(input: { id: string; title: string; body: string }): JournalEntry {
    const key = this.requireUnlocked();
    const title = sanitizePlainText(input.title).trim();
    const body = sanitizePlainText(input.body).trim();

    if (!title) {
      throw new Error('Başlık boş bırakılamaz.');
    }
    if (!body) {
      throw new Error('Günlük gövdesi boş bırakılamaz.');
    }

    const titleCheck = validatePlainText(title);
    if (!titleCheck.valid) {
      throw new Error(titleCheck.reason);
    }
    const bodyCheck = validatePlainText(body);
    if (!bodyCheck.valid) {
      throw new Error(bodyCheck.reason);
    }

    const entries = this.readEntries(key);
    const index = entries.findIndex((item) => item.id === input.id);
    if (index === -1) {
      throw new Error('Günlük kaydı bulunamadı.');
    }

    const updated: JournalEntry = {
      ...entries[index],
      title,
      body,
      updatedAt: new Date().toISOString(),
    };
    entries[index] = updated;
    this.writeEntries(entries, key);
    return updated;
  }

  deleteEntry(id: string): void {
    const key = this.requireUnlocked();
    const entries = this.readEntries(key);
    const filtered = entries.filter((item) => item.id !== id);
    if (filtered.length === entries.length) {
      throw new Error('Silinecek günlük kaydı bulunamadı.');
    }
    this.writeEntries(filtered, key);
  }

  exportPlainText(): string {
    const entries = this.listEntries();
    if (entries.length === 0) {
      return 'Günlük henüz boş.';
    }
    return entries
      .map((entry) => {
        const created = new Date(entry.createdAt).toLocaleString('tr-TR');
        return [
          `========================================`,
          `Tarih: ${entry.date} (Yazılma: ${created})`,
          `Başlık: ${entry.title}`,
          `----------------------------------------`,
          entry.body,
          ``,
        ].join('\n');
      })
      .join('\n');
  }
}
