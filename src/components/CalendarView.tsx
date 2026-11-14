import { Plus } from 'lucide-react';
import {
  buildMonthGrid,
  buildWeekGrid,
  formatDayCellLabel,
  formatTurkishDateLong,
  formatTurkishTime,
  toDateKey,
  TURKISH_MONTHS,
  TURKISH_WEEKDAYS_SHORT,
} from '../utils/date';
import type { JournalEntry } from '../types/journal';

export type CalendarMode = 'day' | 'week' | 'month' | 'year';

interface CalendarViewProps {
  mode: CalendarMode;
  viewYear: number;
  viewMonth: number; // 0-11
  selectedDate: string;
  entriesByDate: Record<string, JournalEntry[]>;
  onSelectDate: (dateKey: string) => void;
  onOpenEntry: (entry: JournalEntry) => void;
  onCreateForDate: (dateKey: string) => void;
  onSelectMonthFromYear: (year: number, month: number) => void;
}

export function CalendarView({
  mode,
  viewYear,
  viewMonth,
  selectedDate,
  entriesByDate,
  onSelectDate,
  onOpenEntry,
  onCreateForDate,
  onSelectMonthFromYear,
}: CalendarViewProps) {
  if (mode === 'year') {
    const todayKey = toDateKey(new Date());
    return (
      <section className="cal-year-view" aria-label="Yıl Görünümü">
        <div className="cal-year-grid">
          {TURKISH_MONTHS.map((monthName, mIdx) => {
            const cells = buildMonthGrid(viewYear, mIdx);
            return (
              <div key={monthName} className="cal-year-month-card">
                <button
                  type="button"
                  className="cal-year-month-title"
                  onClick={() => onSelectMonthFromYear(viewYear, mIdx)}
                >
                  {monthName}
                </button>
                <div className="cal-year-weekdays">
                  {TURKISH_WEEKDAYS_SHORT.map((wd) => (
                    <span key={wd}>{wd[0]}</span>
                  ))}
                </div>
                <div className="cal-year-days">
                  {cells.map((cell) => {
                    const count = entriesByDate[cell.dateKey]?.length ?? 0;
                    const isToday = cell.dateKey === todayKey;
                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        className={[
                          'cal-year-day',
                          !cell.inCurrentMonth && 'is-outside',
                          isToday && 'is-today',
                          cell.dateKey === selectedDate && 'is-selected',
                          count > 0 && 'has-entries',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => {
                          onSelectDate(cell.dateKey);
                          onSelectMonthFromYear(viewYear, cell.monthIndex);
                        }}
                      >
                        {cell.dayNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (mode === 'week') {
    const weekCells = buildWeekGrid(selectedDate);
    return (
      <section className="cal-month-surface" aria-label="Hafta Görünümü">
        <div className="cal-weekdays-bar">
          {weekCells.map((cell, idx) => (
            <div
              key={cell.dateKey}
              className={`cal-weekday-col ${cell.isWeekend ? 'is-weekend' : ''}`}
            >
              <span>{TURKISH_WEEKDAYS_SHORT[idx]}</span>
              <span className={`cal-week-num ${cell.isToday ? 'is-today-pill' : ''}`}>
                {cell.dayNumber}
              </span>
            </div>
          ))}
        </div>

        <div className="cal-week-grid">
          {weekCells.map((cell) => {
            const dayEntries = entriesByDate[cell.dateKey] ?? [];
            const isSelected = cell.dateKey === selectedDate;
            return (
              <div
                key={cell.dateKey}
                className={[
                  'cal-week-col',
                  cell.isWeekend && 'is-weekend',
                  isSelected && 'is-selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelectDate(cell.dateKey)}
              >
                <div className="cal-week-col-header">
                  <button
                    type="button"
                    className="cal-cell-add-btn"
                    title="Bu güne not ekle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(cell.dateKey);
                      onCreateForDate(cell.dateKey);
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="cal-cell-entries">
                  {dayEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="cal-entry-row"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(cell.dateKey);
                        onOpenEntry(entry);
                      }}
                    >
                      <span className="cal-entry-bar" />
                      <span className="cal-entry-title">{entry.title}</span>
                      <span className="cal-entry-time">{formatTurkishTime(entry.createdAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (mode === 'day') {
    const dayEntries = entriesByDate[selectedDate] ?? [];
    return (
      <section className="cal-day-view" aria-label="Gün Görünümü">
        <div className="cal-day-view-header">
          <div>
            <h3>{formatTurkishDateLong(selectedDate)}</h3>
            <p>
              {dayEntries.length === 0
                ? 'Bu güne ait henüz bir not yok'
                : `${dayEntries.length} günlük notu`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onCreateForDate(selectedDate)}
          >
            <Plus size={15} />
            <span>Yeni Not</span>
          </button>
        </div>

        {dayEntries.length === 0 ? (
          <div className="cal-day-empty">
            <p>Bu gün için henüz bir şey yazılmamış. “Yeni Not” ile ilk kaydını ekleyebilirsin.</p>
          </div>
        ) : (
          <div className="cal-day-list">
            {dayEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="cal-day-list-item"
                onClick={() => onOpenEntry(entry)}
              >
                <span className="cal-entry-bar" />
                <div className="cal-day-list-content">
                  <div className="cal-day-list-top">
                    <strong>{entry.title}</strong>
                    <span>{formatTurkishTime(entry.createdAt)}</span>
                  </div>
                  <p>{entry.body}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  // Default: Apple Calendar-style Month Grid ("Ay")
  const cells = buildMonthGrid(viewYear, viewMonth);

  return (
    <section className="cal-month-surface" aria-label="Aylık Takvim">
      <div className="cal-weekdays-bar" aria-hidden="true">
        {TURKISH_WEEKDAYS_SHORT.map((day, idx) => (
          <div
            key={day}
            className={`cal-weekday-col ${idx >= 5 ? 'is-weekend-label' : ''}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="cal-month-grid" role="grid">
        {cells.map((cell) => {
          const dayEntries = entriesByDate[cell.dateKey] ?? [];
          const isSelected = cell.dateKey === selectedDate;
          const visibleEntries = dayEntries.slice(0, 4);
          const overflowCount = dayEntries.length - visibleEntries.length;

          return (
            <div
              key={cell.dateKey}
              role="gridcell"
              tabIndex={0}
              className={[
                'cal-month-cell',
                !cell.inCurrentMonth && 'is-outside',
                cell.isWeekend && 'is-weekend',
                cell.isToday && 'is-today',
                isSelected && 'is-selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelectDate(cell.dateKey)}
              onDoubleClick={() => {
                onSelectDate(cell.dateKey);
                onCreateForDate(cell.dateKey);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSelectDate(cell.dateKey);
                }
              }}
            >
              <div className="cal-cell-top">
                <button
                  type="button"
                  className="cal-cell-add-btn"
                  title="Bu güne yeni not ekle"
                  aria-label={`${cell.dateKey} gününe yeni not ekle`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(cell.dateKey);
                    onCreateForDate(cell.dateKey);
                  }}
                >
                  <Plus size={13} />
                </button>

                <span className={`cal-day-num ${cell.isToday ? 'is-today-badge' : ''}`}>
                  {formatDayCellLabel(cell)}
                </span>
              </div>

              <div className="cal-cell-entries">
                {visibleEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="cal-entry-row"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(cell.dateKey);
                      onOpenEntry(entry);
                    }}
                    title={`${entry.title} (${formatTurkishTime(entry.createdAt)})`}
                  >
                    <span className="cal-entry-bar" />
                    <span className="cal-entry-title">{entry.title}</span>
                    <span className="cal-entry-time">{formatTurkishTime(entry.createdAt)}</span>
                  </button>
                ))}

                {overflowCount > 0 && (
                  <button
                    type="button"
                    className="cal-entry-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(cell.dateKey);
                    }}
                  >
                    +{overflowCount} not daha...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
