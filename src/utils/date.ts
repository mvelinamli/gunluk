export const TURKISH_WEEKDAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const TURKISH_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export const TURKISH_MONTHS_SHORT = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

export interface CalendarCell {
  dateKey: string; // YYYY-MM-DD
  dayNumber: number;
  monthIndex: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return toDateKey(d);
}

export function formatTurkishDateLong(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  }).format(date);
}

export function formatTurkishTime(isoString: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function formatDayCellLabel(cell: CalendarCell): string {
  if (cell.dayNumber === 1 && !cell.inCurrentMonth) {
    return `${cell.dayNumber} ${TURKISH_MONTHS_SHORT[cell.monthIndex]}`;
  }
  return String(cell.dayNumber);
}

export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const todayKey = getTodayKey();
  const firstOfMonth = new Date(year, monthIndex, 1);
  // Monday=0 .. Sunday=6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - startOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const dateKey = toDateKey(cellDate);
    const weekdayIndex = i % 7;
    cells.push({
      dateKey,
      dayNumber: cellDate.getDate(),
      monthIndex: cellDate.getMonth(),
      inCurrentMonth: cellDate.getMonth() === monthIndex,
      isToday: dateKey === todayKey,
      isWeekend: weekdayIndex === 5 || weekdayIndex === 6,
    });
  }
  return cells;
}

export function buildWeekGrid(anchorDateKey: string): CalendarCell[] {
  const todayKey = getTodayKey();
  const anchor = parseDateKey(anchorDateKey);
  const startOffset = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - startOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 7; i++) {
    const cellDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateKey = toDateKey(cellDate);
    cells.push({
      dateKey,
      dayNumber: cellDate.getDate(),
      monthIndex: cellDate.getMonth(),
      inCurrentMonth: cellDate.getMonth() === anchor.getMonth(),
      isToday: dateKey === todayKey,
      isWeekend: i === 5 || i === 6,
    });
  }
  return cells;
}
