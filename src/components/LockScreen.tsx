import { useEffect, useRef, useState } from 'react';
import { BookLock, Eye, EyeOff, Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import type { AuthStatus } from '../types/journal';

interface LockScreenProps {
  status: AuthStatus;
  onAuthenticated: (nextStatus: AuthStatus) => void;
}

export function LockScreen({ status, onAuthenticated }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(status.biometricAvailable);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoPromptedRef = useRef(false);

  const handleBiometricUnlock = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await window.journalApi.auth.unlockBiometric();
      if (result.ok) {
        onAuthenticated(result.status);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Biyometrik doğrulama başarısız.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (
      status.initialized &&
      !status.unlocked &&
      status.biometricEnabled &&
      !autoPromptedRef.current
    ) {
      autoPromptedRef.current = true;
      void handleBiometricUnlock();
    }
  }, [status.initialized, status.unlocked, status.biometricEnabled]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 4) {
      setError('Parola en az 4 karakter olmalıdır.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Parolalar eşleşmiyor.');
      return;
    }

    setBusy(true);
    try {
      const nextStatus = await window.journalApi.auth.setup(password, enableBiometric);
      setPassword('');
      setConfirmPassword('');
      onAuthenticated(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kasa oluşturulamadı.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Lütfen parolanızı girin.');
      return;
    }

    setBusy(true);
    try {
      const result = await window.journalApi.auth.unlockPassword(password);
      if (result.ok) {
        setPassword('');
        onAuthenticated(result.status);
      } else {
        setError('Parola hatalı. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kilit açılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-card">
        <div className="lock-badge">
          <BookLock size={28} strokeWidth={1.75} />
        </div>

        <h1 className="lock-title">
          {status.initialized ? 'Günlük Kilitli' : 'Günlüğünüzü Oluşturun'}
        </h1>
        <p className="lock-subtitle">
          {status.initialized
            ? 'Notlarınıza erişmek için parolanızı girin veya Touch ID kullanın.'
            : 'Tüm günlükleriniz yalnızca bu cihazda, AES-256 ile şifrelenerek saklanır.'}
        </p>

        {status.initialized ? (
          <form className="lock-form" onSubmit={handleUnlockSubmit}>
            <div className="input-group">
              <label htmlFor="unlock-password">Parola</label>
              <div className="password-field">
                <input
                  id="unlock-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Parolanızı girin"
                  autoFocus
                  disabled={busy}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              <KeyRound size={18} />
              <span>{busy ? 'Açılıyor...' : 'Kilidi Aç'}</span>
            </button>

            {status.biometricEnabled && (
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={handleBiometricUnlock}
                disabled={busy}
              >
                <Fingerprint size={18} />
                <span>Touch ID ile Aç</span>
              </button>
            )}
          </form>
        ) : (
          <form className="lock-form" onSubmit={handleSetupSubmit}>
            <div className="input-group">
              <label htmlFor="setup-password">Ana Parola</label>
              <div className="password-field">
                <input
                  id="setup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 4 karakter"
                  autoFocus
                  disabled={busy}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="setup-confirm">Parola (Tekrar)</label>
              <input
                id="setup-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Parolayı tekrar girin"
                disabled={busy}
              />
            </div>

            {status.biometricAvailable && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={enableBiometric}
                  onChange={(e) => setEnableBiometric(e.target.checked)}
                  disabled={busy}
                />
                <span>Touch ID ile hızlı girişi etkinleştir</span>
              </label>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              <ShieldCheck size={18} />
              <span>{busy ? 'Oluşturuluyor...' : 'Şifreli Kasayı Oluştur'}</span>
            </button>
          </form>
        )}

        <div className="lock-footer">
          <span>Çevrimdışı • Yalnızca Düz Metin • Yerel Şifreleme</span>
        </div>
      </div>
    </div>
  );
}
