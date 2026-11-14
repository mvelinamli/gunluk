import path from 'node:path';
import fs from 'node:fs';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  powerMonitor,
  safeStorage,
  systemPreferences,
} from 'electron';
import { BiometricBridge, JournalStorage } from './storage';

let mainWindow: BrowserWindow | null = null;
let storage: JournalStorage;

function canUseBiometrics(): boolean {
  if (process.platform === 'darwin') {
    try {
      return systemPreferences.canPromptTouchID() && safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }
  return false;
}

const biometricBridge: BiometricBridge = {
  isAvailable: () => canUseBiometrics(),
  protectSecret: (secretHex: string) => {
    const encrypted = safeStorage.encryptString(secretHex);
    return encrypted.toString('base64');
  },
  unprotectSecret: (protectedBase64: string) => {
    const buffer = Buffer.from(protectedBase64, 'base64');
    return safeStorage.decryptString(buffer);
  },
};

function getAuthStatus() {
  const meta = storage.getMeta();
  return {
    initialized: storage.isInitialized(),
    unlocked: storage.isUnlocked(),
    biometricAvailable: canUseBiometrics(),
    biometricEnabled: Boolean(meta?.biometricEnabled && canUseBiometrics()),
    autoLockMinutes: meta?.autoLockMinutes ?? 5,
    dataDir: path.join(app.getPath('userData'), 'journal-data'),
    platform: process.platform,
  };
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 880,
    minHeight: 620,
    title: 'Günlük',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 18, y: 18 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Block any external navigation or popup windows
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl && url.startsWith(devUrl)) {
      return;
    }
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle('auth:status', () => getAuthStatus());

  ipcMain.handle('auth:setup', (_event, payload: { password: string; enableBiometric: boolean }) => {
    storage.setup(payload.password, payload.enableBiometric);
    return getAuthStatus();
  });

  ipcMain.handle('auth:unlockPassword', (_event, password: string) => {
    const ok = storage.unlockWithPassword(password);
    return { ok, status: getAuthStatus() };
  });

  ipcMain.handle('auth:unlockBiometric', async () => {
    if (!canUseBiometrics()) {
      return { ok: false, error: 'Bu cihazda Touch ID kullanılamıyor.', status: getAuthStatus() };
    }
    try {
      await systemPreferences.promptTouchID('Günlüğünüzün kilidini açmak için doğrulayın');
      const ok = storage.unlockWithBiometric();
      return {
        ok,
        error: ok ? undefined : 'Biyometrik kasa anahtarı çözülemedi. Parolanızı girin.',
        status: getAuthStatus(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Touch ID doğrulaması iptal edildi.';
      return { ok: false, error: message, status: getAuthStatus() };
    }
  });

  ipcMain.handle('auth:lock', () => {
    storage.lock();
    return getAuthStatus();
  });

  ipcMain.handle(
    'auth:changePassword',
    (_event, payload: { currentPassword: string; newPassword: string }) => {
      storage.changePassword(payload.currentPassword, payload.newPassword);
      return getAuthStatus();
    },
  );

  ipcMain.handle('auth:setBiometric', async (_event, enabled: boolean) => {
    if (enabled && canUseBiometrics()) {
      await systemPreferences.promptTouchID('Touch ID ile günlük kilidini etkinleştirin');
    }
    storage.setBiometricEnabled(enabled);
    return getAuthStatus();
  });

  ipcMain.handle('auth:setAutoLock', (_event, minutes: number) => {
    storage.setAutoLockMinutes(minutes);
    return getAuthStatus();
  });

  ipcMain.handle('journal:list', () => storage.listEntries());

  ipcMain.handle(
    'journal:create',
    (_event, payload: { date?: string; title: string; body: string }) => {
      return storage.createEntry(payload);
    },
  );

  ipcMain.handle(
    'journal:update',
    (_event, payload: { id: string; title: string; body: string }) => {
      return storage.updateEntry(payload);
    },
  );

  ipcMain.handle('journal:delete', (_event, id: string) => {
    storage.deleteEntry(id);
    return { ok: true };
  });

  ipcMain.handle('journal:exportTxt', async () => {
    const content = storage.exportPlainText();
    const result = await dialog.showSaveDialog(mainWindow ?? undefined!, {
      title: 'Günlüğü Düz Metin Olarak Dışa Aktar',
      defaultPath: `gunluk-yedek-${new Date().toISOString().slice(0, 10)}.txt`,
      filters: [{ name: 'Düz Metin', extensions: ['txt'] }],
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }
    fs.writeFileSync(result.filePath, content, { encoding: 'utf8', mode: 0o600 });
    return { canceled: false, filePath: result.filePath };
  });
}

app.whenReady().then(() => {
  const dataDir = path.join(app.getPath('userData'), 'journal-data');
  storage = new JournalStorage(dataDir, biometricBridge);

  registerIpcHandlers();
  createWindow();

  const lockAndNotify = () => {
    if (storage.isUnlocked()) {
      storage.lock();
      mainWindow?.webContents.send('auth:locked');
    }
  };

  powerMonitor.on('suspend', lockAndNotify);
  powerMonitor.on('lock-screen', lockAndNotify);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  storage?.lock();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
