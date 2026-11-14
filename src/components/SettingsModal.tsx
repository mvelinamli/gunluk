import { useEffect, useRef, useState } from 'react';
import { Download, Fingerprint, FolderLock, KeyRound, X } from 'lucide-react';
import type { AuthStatus } from '../types/journal';

interface SettingsModalProps {
  open: boolean;
  status: AuthStatus;
  onUpdateStatus: (nextStatus: AuthStatus) => void;
  onClose: () => void;
}

export function SettingsModal({ open, status, onUpdateStatus, onClose }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setMessage(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 4) {
      setMessage({ type: 'err', text: 'Yeni parola en az 4 karakter olmalıdır.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'err', text: 'Yeni parolalar eşleşmiyor.' });
      return;
    }

    setBusy(true);
    try {
      const next = await window.journalApi.auth.changePassword(currentPassword, newPassword);
      onUpdateStatus(next);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: 'ok', text: 'Parola başarıyla güncellendi.' });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Parola değiştirilemedi.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBiometric = async () => {
    setMessage(null);
    setBusy(true);
    try {
      const next = await window.journalApi.auth.setBiometric(!status.biometricEnabled);
      onUpdateStatus(next);
      setMessage({
        type: 'ok',
        text: next.biometricEnabled
          ? 'Touch ID ile giriş etkinleştirildi.'
          : 'Touch ID ile giriş devre dışı bırakıldı.',
      });
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Touch ID ayarı güncellenemedi.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAutoLockChange = async (minutes: number) => {
    setMessage(null);
    try {
      const next = await window.journalApi.auth.setAutoLock(minutes);
      onUpdateStatus(next);
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Otomatik kilit ayarı kaydedilemedi.',
      });
    }
  };

  const handleExport = async () => {
    setMessage(null);
    try {
      const res = await window.journalApi.journal.exportTxt();
      if (!res.canceled && res.filePath) {
        setMessage({ type: 'ok', text: `Düz metin yedeği kaydedildi: ${res.filePath}` });
      }
    } catch (err) {
      setMessage({
        type: 'err',
        text: err instanceof Error ? err.message : 'Dışa aktarma başarısız.',
      });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog settings-dialog"
      aria-labelledby="settings-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="modal-card modal-card-lg">
        <div className="modal-header">
          <h2 id="settings-modal-title" className="modal-title">
            Ayarlar ve Güvenlik
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        {message && (
          <p
            className={message.type === 'ok' ? 'form-success' : 'form-error'}
            role="status"
          >
            {message.text}
          </p>
        )}

        <div className="settings-section">
          <h3>
            <FolderLock size={16} />
            <span>Yerel Veri Konumu</span>
          </h3>
          <p className="settings-hint">
            Günlükleriniz yalnızca bilgisayarınızda, şifreli olarak saklanır:
          </p>
          <code className="settings-path">{status.dataDir}</code>
        </div>

        {status.biometricAvailable && (
          <div className="settings-section">
            <h3>
              <Fingerprint size={16} />
              <span>Biyometrik Kilit (Touch ID)</span>
            </h3>
            <div className="settings-row">
              <span>Uygulamayı açarken Touch ID kullan</span>
              <button
                type="button"
                className={status.biometricEnabled ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={handleToggleBiometric}
                disabled={busy}
              >
                {status.biometricEnabled ? 'Etkin (Kapat)' : 'Etkinleştir'}
              </button>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h3>Otomatik Kilitleme</h3>
          <div className="settings-row">
            <span>Hareketsizlik sonrası kilitle</span>
            <select
              value={status.autoLockMinutes}
              onChange={(e) => handleAutoLockChange(Number(e.target.value))}
            >
              <option value={1}>1 dakika</option>
              <option value={5}>5 dakika</option>
              <option value={15}>15 dakika</option>
              <option value={30}>30 dakika</option>
              <option value={0}>Kapalı</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3>
            <KeyRound size={16} />
            <span>Parola Değiştir</span>
          </h3>
          <form className="settings-password-form" onSubmit={handlePasswordChange}>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Mevcut parola"
              disabled={busy}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Yeni parola (en az 4 karakter)"
              disabled={busy}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Yeni parola (tekrar)"
              disabled={busy}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>
              Parolayı Güncelle
            </button>
          </form>
        </div>

        <div className="settings-section">
          <h3>
            <Download size={16} />
            <span>Yerel Yedekleme</span>
          </h3>
          <div className="settings-row">
            <span>Tüm günlükleri düz metin (.txt) olarak dışa aktar</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>
              Dışa Aktar
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
