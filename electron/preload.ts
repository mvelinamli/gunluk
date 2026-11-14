import { contextBridge, ipcRenderer } from 'electron';

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
  date: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

contextBridge.exposeInMainWorld('journalApi', {
  auth: {
    status: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:status'),
    setup: (password: string, enableBiometric: boolean): Promise<AuthStatus> =>
      ipcRenderer.invoke('auth:setup', { password, enableBiometric }),
    unlockPassword: (
      password: string,
    ): Promise<{ ok: boolean; status: AuthStatus }> =>
      ipcRenderer.invoke('auth:unlockPassword', password),
    unlockBiometric: (): Promise<{
      ok: boolean;
      error?: string;
      status: AuthStatus;
    }> => ipcRenderer.invoke('auth:unlockBiometric'),
    lock: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:lock'),
    changePassword: (
      currentPassword: string,
      newPassword: string,
    ): Promise<AuthStatus> =>
      ipcRenderer.invoke('auth:changePassword', { currentPassword, newPassword }),
    setBiometric: (enabled: boolean): Promise<AuthStatus> =>
      ipcRenderer.invoke('auth:setBiometric', enabled),
    setAutoLock: (minutes: number): Promise<AuthStatus> =>
      ipcRenderer.invoke('auth:setAutoLock', minutes),
    onLocked: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('auth:locked', listener);
      return () => ipcRenderer.removeListener('auth:locked', listener);
    },
  },
  journal: {
    list: (): Promise<JournalEntry[]> => ipcRenderer.invoke('journal:list'),
    create: (payload: {
      date?: string;
      title: string;
      body: string;
    }): Promise<JournalEntry> => ipcRenderer.invoke('journal:create', payload),
    update: (payload: {
      id: string;
      title: string;
      body: string;
    }): Promise<JournalEntry> => ipcRenderer.invoke('journal:update', payload),
    delete: (id: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('journal:delete', id),
    exportTxt: (): Promise<{ canceled: boolean; filePath?: string }> =>
      ipcRenderer.invoke('journal:exportTxt'),
  },
});
