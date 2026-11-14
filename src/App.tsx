import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  PanelRight,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { CalendarMode, CalendarView } from './components/CalendarView';
import { DayPanel } from './components/DayPanel';
import { FullScreenEntryView } from './components/FullScreenEntryView';
import { LockScreen } from './components/LockScreen';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import {
  formatTurkishDateLong,
  getTodayKey,
  parseDateKey,
  shiftDateKey,
  TURKISH_MONTHS,
} from './utils/date';
import type { AuthStatus, JournalEntry } from './types/journal';

export function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
  const [viewMonthYear, setViewMonthYear] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showDaySidebar, setShowDaySidebar] = useState(false);
  const [entryPageState, setEntryPageState] = useState<{
    open: boolean;
    dateKey: string;
    entry: JournalEntry | null;
    mode: 'read' | 'edit' | 'create';
  }>({ open: false, dateKey: getTodayKey(), entry: null, mode: 'create' });

  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadEntries = useCallback(async () => {
    const list = await window.journalApi.journal.list();
    setEntries(list);
  }, []);

  useEffect(() => {
    window.journalApi.auth.status().then((s) => {
      setStatus(s);
      if (s.unlocked) {
        void loadEntries();
      }
    });

    const unsubscribe = window.journalApi.auth.onLocked(() => {
      setEntries([]);
      setSearchOpen(false);
      setSettingsOpen(false);
      setEntryPageState((prev) => ({ ...prev, open: false }));
      setStatus((prev) => (prev ? { ...prev, unlocked: false } : prev));
    });

    return unsubscribe;
  }, [loadEntries]);

  const handleLock = useCallback(async () => {
    const nextStatus = await window.journalApi.auth.lock();
    setEntries([]);
    setSearchOpen(false);
    setSettingsOpen(false);
    setEntryPageState((prev) => ({ ...prev, open: false }));
    setStatus(nextStatus);
  }, []);

  // Inactivity auto-lock
  useEffect(() => {
    if (!status?.unlocked || !status.autoLockMinutes || status.autoLockMinutes <= 0) {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void handleLock();
      }, status.autoLockMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [status?.unlocked, status?.autoLockMinutes, handleLock]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalEntry[]> = {};
    for (const entry of entries) {
      if (!map[entry.date]) {
        map[entry.date] = [];
      }
      map[entry.date].push(entry);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [entries]);

  const entriesForSelectedDate = useMemo(
    () => entriesByDate[selectedDate] ?? [],
    [entriesByDate, selectedDate],
  );

  const handleAuthenticated = async (nextStatus: AuthStatus) => {
    setStatus(nextStatus);
    if (nextStatus.unlocked) {
      await loadEntries();
    }
  };

  const handleSaveEntry = async (payload: {
    id?: string;
    date: string;
    title: string;
    body: string;
  }) => {
    if (payload.id) {
      const updated = await window.journalApi.journal.update({
        id: payload.id,
        title: payload.title,
        body: payload.body,
      });
      setEntries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } else {
      const created = await window.journalApi.journal.create({
        date: payload.date,
        title: payload.title,
        body: payload.body,
      });
      setEntries((prev) => [created, ...prev]);
    }
  };

  const handleDelete = async (id: string) => {
    await window.journalApi.journal.delete(id);
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePrev = () => {
    if (calendarMode === 'year') {
      setViewMonthYear((prev) => ({ ...prev, year: prev.year - 1 }));
    } else if (calendarMode === 'month') {
      setViewMonthYear((prev) =>
        prev.month === 0
          ? { year: prev.year - 1, month: 11 }
          : { year: prev.year, month: prev.month - 1 },
      );
    } else if (calendarMode === 'week') {
      const nextKey = shiftDateKey(selectedDate, -7);
      const d = parseDateKey(nextKey);
      setSelectedDate(nextKey);
      setViewMonthYear({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const nextKey = shiftDateKey(selectedDate, -1);
      const d = parseDateKey(nextKey);
      setSelectedDate(nextKey);
      setViewMonthYear({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  const handleNext = () => {
    if (calendarMode === 'year') {
      setViewMonthYear((prev) => ({ ...prev, year: prev.year + 1 }));
    } else if (calendarMode === 'month') {
      setViewMonthYear((prev) =>
        prev.month === 11
          ? { year: prev.year + 1, month: 0 }
          : { year: prev.year, month: prev.month + 1 },
      );
    } else if (calendarMode === 'week') {
      const nextKey = shiftDateKey(selectedDate, 7);
      const d = parseDateKey(nextKey);
      setSelectedDate(nextKey);
      setViewMonthYear({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      const nextKey = shiftDateKey(selectedDate, 1);
      const d = parseDateKey(nextKey);
      setSelectedDate(nextKey);
      setViewMonthYear({ year: d.getFullYear(), month: d.getMonth() });
    }
  };

  const handleToday = () => {
    const now = new Date();
    setSelectedDate(getTodayKey());
    setViewMonthYear({ year: now.getFullYear(), month: now.getMonth() });
  };

  if (!status) {
    return (
      <div className="app-loading">
        <span>Yükleniyor...</span>
      </div>
    );
  }

  if (!status.unlocked) {
    return <LockScreen status={status} onAuthenticated={handleAuthenticated} />;
  }

  if (entryPageState.open) {
    return (
      <FullScreenEntryView
        dateKey={entryPageState.dateKey}
        entry={entryPageState.entry}
        initialMode={entryPageState.mode}
        isMac={status.platform === 'darwin'}
        onSave={handleSaveEntry}
        onDelete={handleDelete}
        onBack={() => setEntryPageState((prev) => ({ ...prev, open: false }))}
      />
    );
  }

  const headerTitle =
    calendarMode === 'year' ? (
      <span className="cal-title-bold">{viewMonthYear.year}</span>
    ) : calendarMode === 'day' ? (
      <span className="cal-title-bold">{formatTurkishDateLong(selectedDate)}</span>
    ) : (
      <>
        <span className="cal-title-bold">{TURKISH_MONTHS[viewMonthYear.month]}</span>{' '}
        <span className="cal-title-light">{viewMonthYear.year}</span>
      </>
    );

  return (
    <div className="app-shell">
      <header className={`cal-topbar ${status.platform === 'darwin' ? 'is-mac' : ''}`}>
        <div className="cal-topbar-left">
          <div className="cal-pill-group">
            <button
              type="button"
              className={`cal-pill-icon ${showDaySidebar ? 'is-active' : ''}`}
              onClick={() => setShowDaySidebar((prev) => !prev)}
              title="Seçili gün listesini göster/gizle"
              aria-label="Seçili gün listesini göster/gizle"
            >
              <PanelRight size={16} />
            </button>
            <button
              type="button"
              className="cal-pill-icon"
              onClick={() => setSettingsOpen(true)}
              title="Ayarlar ve Güvenlik"
              aria-label="Ayarlar"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              className="cal-pill-icon"
              onClick={handleLock}
              title="Uygulamayı kilitle"
              aria-label="Kilitle"
            >
              <Lock size={15} />
            </button>
          </div>

          <button
            type="button"
            className="cal-circle-btn"
            title="Seçili güne yeni günlük notu ekle"
            aria-label="Yeni günlük notu"
            onClick={() =>
              setEntryPageState({
                open: true,
                dateKey: selectedDate,
                entry: null,
                mode: 'create',
              })
            }
          >
            <Plus size={17} />
          </button>
        </div>

        <div className="cal-segmented" role="tablist" aria-label="Takvim görünümü">
          {(
            [
              { id: 'day', label: 'Gün' },
              { id: 'week', label: 'Hafta' },
              { id: 'month', label: 'Ay' },
              { id: 'year', label: 'Yıl' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={calendarMode === tab.id}
              className={`cal-segment-btn ${calendarMode === tab.id ? 'is-active' : ''}`}
              onClick={() => setCalendarMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="cal-topbar-right">
          <button
            type="button"
            className="cal-circle-btn"
            onClick={() => setSearchOpen(true)}
            title="Geçmiş günlüklerde ara"
            aria-label="Ara"
          >
            <Search size={16} />
          </button>
        </div>
      </header>

      <div className="cal-subheader">
        <h1 className="cal-main-title">{headerTitle}</h1>

        <div className="cal-nav-pill">
          <button
            type="button"
            className="cal-nav-arrow"
            onClick={handlePrev}
            aria-label="Önceki"
          >
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="cal-nav-today" onClick={handleToday}>
            Bugün
          </button>
          <button
            type="button"
            className="cal-nav-arrow"
            onClick={handleNext}
            aria-label="Sonraki"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <main className={`cal-workspace ${showDaySidebar ? 'with-sidebar' : ''}`}>
        <CalendarView
          mode={calendarMode}
          viewYear={viewMonthYear.year}
          viewMonth={viewMonthYear.month}
          selectedDate={selectedDate}
          entriesByDate={entriesByDate}
          onSelectDate={(dateKey) => {
            setSelectedDate(dateKey);
            const d = parseDateKey(dateKey);
            if (calendarMode === 'month') {
              setViewMonthYear({ year: d.getFullYear(), month: d.getMonth() });
            }
          }}
          onOpenEntry={(entry) =>
            setEntryPageState({
              open: true,
              dateKey: entry.date,
              entry,
              mode: 'read',
            })
          }
          onCreateForDate={(dateKey) =>
            setEntryPageState({
              open: true,
              dateKey,
              entry: null,
              mode: 'create',
            })
          }
          onSelectMonthFromYear={(year, month) => {
            setViewMonthYear({ year, month });
            setCalendarMode('month');
          }}
        />

        {showDaySidebar && (
          <aside className="cal-sidebar-drawer">
            <DayPanel
              selectedDate={selectedDate}
              entries={entriesForSelectedDate}
              onCreate={async (payload) => handleSaveEntry(payload)}
              onUpdate={async (payload) =>
                handleSaveEntry({ ...payload, date: selectedDate })
              }
              onDelete={handleDelete}
            />
          </aside>
        )}
      </main>

      <SearchModal
        open={searchOpen}
        entries={entries}
        onSelectEntry={(entry) => {
          setSelectedDate(entry.date);
          const d = parseDateKey(entry.date);
          setViewMonthYear({ year: d.getFullYear(), month: d.getMonth() });
          setEntryPageState({
            open: true,
            dateKey: entry.date,
            entry,
            mode: 'read',
          });
        }}
        onClose={() => setSearchOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        status={status}
        onUpdateStatus={setStatus}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
