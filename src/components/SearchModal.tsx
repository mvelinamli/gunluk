import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { formatTurkishDateLong } from '../utils/date';
import type { JournalEntry } from '../types/journal';

interface SearchModalProps {
  open: boolean;
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onClose: () => void;
}

export function SearchModal({ open, entries, onSelectEntry, onClose }: SearchModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setQuery('');
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return entries.slice(0, 30);
    return entries.filter(
      (entry) =>
        entry.title.toLocaleLowerCase('tr-TR').includes(q) ||
        entry.body.toLocaleLowerCase('tr-TR').includes(q) ||
        entry.date.includes(q),
    );
  }, [entries, query]);

  return (
    <dialog
      ref={dialogRef}
      className="modal-dialog search-dialog"
      aria-labelledby="search-modal-title"
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
          <h2 id="search-modal-title" className="modal-title">
            Geçmiş Günlüklerde Ara
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>

        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Başlık, metin veya tarih (örn. 2026-11)..."
            autoFocus
          />
        </div>

        <div className="search-results">
          {filtered.length === 0 ? (
            <p className="search-empty">Eşleşen günlük notu bulunamadı.</p>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="search-result-item"
                onClick={() => {
                  onSelectEntry(entry);
                  onClose();
                }}
              >
                <div className="search-result-top">
                  <strong>{entry.title}</strong>
                  <span>{formatTurkishDateLong(entry.date)}</span>
                </div>
                <p>{entry.body}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
}
