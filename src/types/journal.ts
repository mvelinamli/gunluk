export interface AuthStatus {
  initialized: boolean;
  unlocked: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  autoLockMinutes: number;
  dataDir: string;
  platform: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface JournalApi {
  auth: {
    status: () => Promise<AuthStatus>;
    setup: (password: string, enableBiometric: boolean) => Promise<AuthStatus>;
    unlockPassword: (password: string) => Promise<{ ok: boolean; status: AuthStatus }>;
    unlockBiometric: () => Promise<{ ok: boolean; error?: string; status: AuthStatus }>;
    lock: () => Promise<AuthStatus>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<AuthStatus>;
    setBiometric: (enabled: boolean) => Promise<AuthStatus>;
    setAutoLock: (minutes: number) => Promise<AuthStatus>;
    onLocked: (callback: () => void) => () => void;
  };
  journal: {
    list: () => Promise<JournalEntry[]>;
    create: (payload: { date?: string; title: string; body: string }) => Promise<JournalEntry>;
    update: (payload: { id: string; title: string; body: string }) => Promise<JournalEntry>;
    delete: (id: string) => Promise<{ ok: boolean }>;
    exportTxt: () => Promise<{ canceled: boolean; filePath?: string }>;
  };
}

declare global {
  interface Window {
    journalApi: JournalApi;
  }
}
