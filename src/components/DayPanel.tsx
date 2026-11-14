import { useState } from 'react';
import { BookOpen, Edit3, Plus, Trash2 } from 'lucide-react';
import { formatTurkishDateLong, formatTurkishTime } from '../utils/date';
import { EntryEditor } from './EntryEditor';
import { ConfirmDialog } from './ConfirmDialog';
import type { JournalEntry } from '../types/journal';

interface DayPanelProps {
  selectedDate: string;
  entries: JournalEntry[];
  onCreate: (payload: { date: string; title: string; body: string }) => Promise<void>;
  onUpdate: (payload: { id: string; title: string; body: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DayPanel({
  selectedDate,
  entries,
  onCreate,
  onUpdate,
  onDelete,
}: DayPanelProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'read'>('list');
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const activeEntry = entries.find((item) => item.id === activeEntryId) ?? null;

  // Reset to list view if selected date changes and activeEntry isn't on this date
  const effectiveMode =
    (mode === 'edit' || mode === 'read') && !activeEntry ? 'list' : mode;

  const handleSave = async (payload: {
    id?: string;
    date: string;
    title: string;
    body: string;
  }) => {
    if (payload.id) {
      await onUpdate({ id: payload.id, title: payload.title, body: payload.body });
      setActiveEntryId(payload.id);
      setMode('read');
    } else {
      await onCreate({ date: payload.date, title: payload.title, body: payload.body });
      setMode('list');
    }
  };

  return (
    <section className="day-panel" aria-label="Seçili Gün Notları">
      <div className="day-panel-header">
        <div>
          <h2 className="day-panel-title">{formatTurkishDateLong(selectedDate)}</h2>
          <p className="day-panel-subtitle">
            {entries.length === 0
              ? 'Bu güne ait henüz bir günlük notu yok'
              : `${entries.length} günlük notu`}
          </p>
        </div>

        {effectiveMode === 'list' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setActiveEntryId(null);
              setMode('create');
            }}
          >
            <Plus size={16} />
            <span>Yeni Not</span>
          </button>
        )}
      </div>

      {effectiveMode === 'create' && (
        <EntryEditor
          key={`create-${selectedDate}`}
          dateKey={selectedDate}
          onSave={handleSave}
          onCancel={() => setMode('list')}
        />
      )}

      {effectiveMode === 'edit' && activeEntry && (
        <EntryEditor
          key={`edit-${activeEntry.id}`}
          dateKey={selectedDate}
          initialEntry={activeEntry}
          onSave={handleSave}
          onCancel={() => setMode('read')}
        />
      )}

      {effectiveMode === 'read' && activeEntry && (
        <article className="entry-reader">
          <div className="reader-toolbar">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setMode('list')}
            >
              Günün Notlarına Dön
            </button>
            <div className="reader-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMode('edit')}
              >
                <Edit3 size={15} />
                <span>Düzenle</span>
              </button>
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                onClick={() => setPendingDeleteId(activeEntry.id)}
              >
                <Trash2 size={15} />
                <span>Sil</span>
              </button>
            </div>
          </div>

          <h3 className="reader-title">{activeEntry.title}</h3>
          <div className="reader-meta">
            <span>Yazılma: {formatTurkishTime(activeEntry.createdAt)}</span>
            {activeEntry.updatedAt !== activeEntry.createdAt && (
              <span>• Son düzenleme: {formatTurkishTime(activeEntry.updatedAt)}</span>
            )}
          </div>
          <div className="reader-body">{activeEntry.body}</div>
        </article>
      )}

      {effectiveMode === 'list' && (
        <div className="entry-list">
          {entries.length === 0 ? (
            <div className="empty-state">
              <BookOpen size={32} strokeWidth={1.5} />
              <p>Düşüncelerini kaydetmek için “Yeni Not” düğmesine tıkla.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="entry-card">
                <button
                  type="button"
                  className="entry-card-main"
                  onClick={() => {
                    setActiveEntryId(entry.id);
                    setMode('read');
                  }}
                >
                  <div className="entry-card-top">
                    <h3 className="entry-card-title">{entry.title}</h3>
                    <span className="entry-card-time">
                      {formatTurkishTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="entry-card-preview">{entry.body}</p>
                </button>
                <div className="entry-card-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Düzenle"
                    onClick={() => {
                      setActiveEntryId(entry.id);
                      setMode('edit');
                    }}
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    aria-label="Sil"
                    onClick={() => setPendingDeleteId(entry.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Günlük notu silinsin mi?"
        message="Bu işlem geri alınamaz. Seçili günlük notu kalıcı olarak silinecektir."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        danger
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={async () => {
          if (pendingDeleteId) {
            const id = pendingDeleteId;
            setPendingDeleteId(null);
            await onDelete(id);
            if (activeEntryId === id) {
              setActiveEntryId(null);
              setMode('list');
            }
          }
        }}
      />
    </section>
  );
}
