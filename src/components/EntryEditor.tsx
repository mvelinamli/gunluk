import { useState } from 'react';
import { AlertCircle, Calendar, Check, FileText, X } from 'lucide-react';
import { formatTurkishDateLong, formatTurkishTime } from '../utils/date';
import { validatePlainTextInput } from '../utils/textOnly';
import type { JournalEntry } from '../types/journal';

interface EntryEditorProps {
  dateKey: string;
  initialEntry?: JournalEntry | null;
  onSave: (payload: { id?: string; date: string; title: string; body: string }) => Promise<void>;
  onCancel: () => void;
}

export function EntryEditor({ dateKey, initialEntry, onSave, onCancel }: EntryEditorProps) {
  const [title, setTitle] = useState(initialEntry?.title ?? '');
  const [body, setBody] = useState(initialEntry?.body ?? '');
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: 'title' | 'body',
  ) => {
    const { clipboardData } = e;
    if (clipboardData.files && clipboardData.files.length > 0) {
      e.preventDefault();
      setNotice('Yalnızca düz metin girişine izin verilir; fotoğraf veya dosya yapıştırılamaz.');
      return;
    }

    const plainText = clipboardData.getData('text/plain');
    if (!plainText) {
      e.preventDefault();
      setNotice('Panoda yapıştırılabilir düz metin bulunamadı.');
      return;
    }

    const check = validatePlainTextInput(plainText);
    if (!check.valid) {
      e.preventDefault();
      setNotice(check.reason ?? 'Bağlantı veya medya yapıştırılamaz.');
      return;
    }

    // Force plain-text paste for title (single line) and body
    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const cleanText = field === 'title' ? plainText.replace(/[\r\n]+/g, ' ') : plainText;
    const nextValue = target.value.slice(0, start) + cleanText + target.value.slice(end);

    setNotice(null);
    if (field === 'title') {
      setTitle(nextValue);
    } else {
      setBody(nextValue);
    }

    requestAnimationFrame(() => {
      const cursor = start + cleanText.length;
      target.setSelectionRange(cursor, cursor);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setNotice('Yalnızca düz metin girişine izin verilir; sürükle-bırak ile dosya veya bağlantı eklenemez.');
  };

  const handleTextChange = (value: string, field: 'title' | 'body') => {
    const check = validatePlainTextInput(value);
    if (!check.valid) {
      setNotice(check.reason ?? 'Yalnızca düz metin girişine izin verilir.');
    } else {
      setNotice(null);
    }

    if (field === 'title') {
      setTitle(value);
    } else {
      setBody(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle) {
      setNotice('Lütfen bir başlık yazın.');
      return;
    }
    if (!trimmedBody) {
      setNotice('Lütfen günlük metninizi yazın.');
      return;
    }

    const titleCheck = validatePlainTextInput(trimmedTitle);
    if (!titleCheck.valid) {
      setNotice(titleCheck.reason ?? 'Başlıkta yalnızca düz metin kullanılabilir.');
      return;
    }
    const bodyCheck = validatePlainTextInput(trimmedBody);
    if (!bodyCheck.valid) {
      setNotice(bodyCheck.reason ?? 'Gövdede yalnızca düz metin kullanılabilir.');
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await onSave({
        id: initialEntry?.id,
        date: initialEntry?.date ?? dateKey,
        title: trimmedTitle,
        body: trimmedBody,
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Günlük kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <form className="entry-editor" onSubmit={handleSubmit}>
      <div className="editor-meta">
        <div className="editor-meta-item">
          <Calendar size={15} />
          <span>{formatTurkishDateLong(initialEntry?.date ?? dateKey)}</span>
        </div>
        <div className="editor-meta-badge">
          <FileText size={14} />
          <span>
            {initialEntry
              ? `Yazıldı: ${formatTurkishTime(initialEntry.createdAt)}`
              : 'Tarih otomatik kaydedilir'}
          </span>
        </div>
      </div>

      {notice && (
        <div className="editor-notice" role="alert">
          <AlertCircle size={16} />
          <span>{notice}</span>
        </div>
      )}

      <div className="editor-fields">
        <input
          type="text"
          className="editor-title-input"
          value={title}
          onChange={(e) => handleTextChange(e.target.value, 'title')}
          onPaste={(e) => handlePaste(e, 'title')}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder="Başlık..."
          maxLength={160}
          autoFocus
          disabled={saving}
        />

        <textarea
          className="editor-body-input"
          value={body}
          onChange={(e) => handleTextChange(e.target.value, 'body')}
          onPaste={(e) => handlePaste(e, 'body')}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder="Bugün neler düşündün? (Yalnızca düz metin)"
          disabled={saving}
        />
      </div>

      <div className="editor-footer">
        <span className="editor-stats">
          {wordCount} kelime • {body.length} karakter
        </span>
        <div className="editor-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            <X size={16} />
            <span>İptal</span>
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Check size={16} />
            <span>{saving ? 'Kaydediliyor...' : 'Kaydet'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
