import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Edit3, Trash2 } from 'lucide-react';
import { formatTurkishDateLong, formatTurkishTime } from '../utils/date';
import { EntryEditor } from './EntryEditor';
import { ConfirmDialog } from './ConfirmDialog';
import type { JournalEntry } from '../types/journal';

interface FullScreenEntryViewProps {
  dateKey: string;
  entry: JournalEntry | null;
  initialMode: 'read' | 'edit' | 'create';
  isMac: boolean;
  onSave: (payload: { id?: string; date: string; title: string; body: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}

export function FullScreenEntryView({
  dateKey,
  entry,
  initialMode,
  isMac,
  onSave,
  onDelete,
  onBack,
}: FullScreenEntryViewProps) {
  const [mode, setMode] = useState<'read' | 'edit' | 'create'>(entry ? initialMode : 'create');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setMode(entry ? initialMode : 'create');
  }, [entry, initialMode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDeleteOpen) {
        onBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmDeleteOpen, onBack]);

  const handleSave = async (payload: {
    id?: string;
    date: string;
    title: string;
    body: string;
  }) => {
    await onSave(payload);
    onBack();
  };

  return (
    <div className="fullscreen-entry-shell">
      <header className={`fullscreen-entry-topbar ${isMac ? 'is-mac' : ''}`}>
        <div className="fullscreen-topbar-left">
          <button
            type="button"
            className="glass-back-btn"
            onClick={onBack}
            aria-label="Önceki sayfaya geri dön"
          >
            <ArrowLeft size={16} />
            <span>Geri</span>
          </button>
        </div>

        <div className="fullscreen-topbar-center">
          <Calendar size={14} />
          <span>{formatTurkishDateLong(entry?.date ?? dateKey)}</span>
        </div>

        <div className="fullscreen-topbar-right">
          {mode === 'read' && entry && (
            <>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMode('edit')}
              >
                <Edit3 size={14} />
                <span>Düzenle</span>
              </button>
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 size={14} />
                <span>Sil</span>
              </button>
            </>
          )}
        </div>
      </header>

      <main className="fullscreen-entry-main">
        <div className="fullscreen-entry-card">
          {mode === 'read' && entry ? (
            <article className="fullscreen-reader">
              <h1 className="fullscreen-reader-title">{entry.title}</h1>
              <div className="reader-meta">
                <span>Yazılma: {formatTurkishTime(entry.createdAt)}</span>
                {entry.updatedAt !== entry.createdAt && (
                  <span>• Son düzenleme: {formatTurkishTime(entry.updatedAt)}</span>
                )}
              </div>
              <div className="fullscreen-reader-body">{entry.body}</div>
            </article>
          ) : (
            <EntryEditor
              key={`${mode}-${entry?.id ?? dateKey}`}
              dateKey={entry?.date ?? dateKey}
              initialEntry={mode === 'edit' ? entry : null}
              onSave={handleSave}
              onCancel={() => {
                if (mode === 'edit' && entry) {
                  setMode('read');
                } else {
                  onBack();
                }
              }}
            />
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Günlük notu silinsin mi?"
        message="Bu işlem geri alınamaz. Seçili günlük notu kalıcı olarak silinecektir."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        danger
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          if (entry) {
            setConfirmDeleteOpen(false);
            await onDelete(entry.id);
            onBack();
          }
        }}
      />
    </div>
  );
}
