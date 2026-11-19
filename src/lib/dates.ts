// Datums-Helfer (deutsche Namen fest eingebaut, unabhängig von Intl).
export const pad2 = (n: number) => String(n).padStart(2, '0');

export const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
// Montag zuerst, wie im Kalender.
export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const today = () => dateOnly(new Date());
export const firstOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// HH:mm
export const formatTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
// dd.MM.yyyy
export const formatDate = (d: Date) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
// November 2026
export const formatMonthYear = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
// Donnerstag, 19. November 2026
export const formatLongDate = (d: Date) =>
  `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export type Time = { hour: number; minute: number };
export const formatHM = (t: Time) => `${pad2(t.hour)}:${pad2(t.minute)}`;
export const timeOf = (d: Date): Time => ({ hour: d.getHours(), minute: d.getMinutes() });
export const at = (day: Date, t: Time) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.hour, t.minute);

const EMAIL = /^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;
export const isValidEmail = (v: string) => EMAIL.test(v.trim());
