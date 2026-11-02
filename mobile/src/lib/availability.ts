import type { DayOverride, HourSpan, Member, WorkSchedule } from './types';

export const ALL_HOURS = 0xffffff; // 24 bits
export const HOURS = Array.from({ length: 24 }, (_, h) => h);

// ---------- dates ----------
export const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
export const todayKey = () => toKey(new Date());
export const weekdayOf = (k: string) => fromKey(k).getDay();
export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

export function formatHour(h: number): string {
  const x = ((h % 24) + 24) % 24;
  if (x === 0) return '12 AM';
  if (x === 12) return '12 PM';
  return x < 12 ? `${x} AM` : `${x - 12} PM`;
}
export function formatSpan(s: HourSpan): string {
  return `${formatHour(s.start)} – ${formatHour(s.end === 24 ? 0 : s.end)}`;
}
export function formatDateLong(k: string): string {
  return fromKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
export function formatDateShort(k: string): string {
  return fromKey(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---------- masks ----------
export const bit = (h: number) => 1 << h;
export const has = (mask: number, h: number) => (mask & bit(h)) !== 0;
export function popcount(mask: number): number {
  let c = 0;
  for (let m = mask & ALL_HOURS; m; m &= m - 1) c++;
  return c;
}
export function hoursOf(mask: number): number[] {
  return HOURS.filter((h) => has(mask, h));
}

/**
 * Split a span into the part that falls on "this" day and the part that spills into the next day.
 * A span with end <= start crosses midnight.
 */
function splitSpan(s: HourSpan): { today: number; tomorrow: number } {
  const start = Math.max(0, Math.min(23, Math.floor(s.start)));
  const end = Math.max(0, Math.min(24, Math.floor(s.end)));
  let today = 0;
  let tomorrow = 0;
  if (end > start) {
    for (let h = start; h < end; h++) today |= bit(h);
  } else if (end === start) {
    // treat as empty span
  } else {
    for (let h = start; h < 24; h++) today |= bit(h);
    for (let h = 0; h < end; h++) tomorrow |= bit(h);
  }
  return { today, tomorrow };
}

export function maskFromSpans(spans: HourSpan[]): number {
  return spans.reduce((m, s) => m | splitSpan(s).today, 0);
}

/** Does the rotating pattern make `date` a work day? */
export function isRotatingWorkDay(r: WorkSchedule['rotating'], date: string): boolean {
  const cycle = r.daysOn + r.daysOff;
  if (cycle <= 0 || r.daysOn <= 0) return false;
  const diff = daysBetween(r.startDate, date);
  const idx = ((diff % cycle) + cycle) % cycle;
  return idx < r.daysOn;
}

/** Work shifts that START on `date`. */
export function shiftsOn(s: WorkSchedule, date: string): HourSpan[] {
  if (s.mode === 'rotating') return isRotatingWorkDay(s.rotating, date) ? [s.rotating.shift] : [];
  return s.weekly[weekdayOf(date)] ?? [];
}

/** Busy mask for `date`, including overnight spill from the previous day's shifts. */
export function workMask(s: WorkSchedule, date: string): number {
  let m = 0;
  for (const sp of shiftsOn(s, date)) m |= splitSpan(sp).today;
  for (const sp of shiftsOn(s, addDays(date, -1))) m |= splitSpan(sp).tomorrow;
  return m;
}

export function awakeMask(s: WorkSchedule): number {
  const { today, tomorrow } = splitSpan(s.awake);
  return today | tomorrow;
}

/** Free hours for one member on one date: a hand-edited override wins, otherwise awake − work. */
export function freeMask(s: WorkSchedule | undefined, date: string, override?: DayOverride): number {
  if (override) return override.mask & ALL_HOURS;
  if (!s) return 0;
  return awakeMask(s) & ~workMask(s, date) & ALL_HOURS;
}

export const overrideKey = (memberId: string, date: string) => `${memberId}|${date}`;

export interface MemberDay {
  member: Member;
  mask: number;
  hours: number; // popcount
  overridden: boolean;
}

export interface DaySummary {
  date: string;
  perMember: MemberDay[];
  /** members with at least `minHours` free hours */
  available: Member[];
  /** hour → member ids free then */
  byHour: string[][];
  /** mask of hours where EVERYONE (with a schedule) is free */
  everyoneMask: number;
  /** best contiguous windows, most people first */
  windows: Window[];
  total: number;
}

export interface Window {
  start: number;
  end: number;      // exclusive
  memberIds: string[];
  count: number;
}

export function summarizeDay(
  date: string,
  members: Member[],
  schedules: Record<string, WorkSchedule>,
  overrides: Record<string, DayOverride>,
  minHours = 1,
): DaySummary {
  const perMember: MemberDay[] = members.map((member) => {
    const ov = overrides[overrideKey(member.id, date)];
    const mask = freeMask(schedules[member.id], date, ov);
    return { member, mask, hours: popcount(mask), overridden: !!ov };
  });
  const available = perMember.filter((p) => p.hours >= minHours).map((p) => p.member);
  const byHour = HOURS.map((h) => perMember.filter((p) => has(p.mask, h)).map((p) => p.member.id));
  let everyoneMask = members.length ? ALL_HOURS : 0;
  for (const p of perMember) everyoneMask &= p.mask;
  return { date, perMember, available, byHour, everyoneMask, windows: findWindows(byHour), total: members.length };
}

/** Contiguous runs of hours where the same set of people are free, ranked by headcount then length. */
export function findWindows(byHour: string[][], minLen = 2): Window[] {
  const out: Window[] = [];
  let i = 0;
  while (i < 24) {
    const set = byHour[i];
    if (!set.length) { i++; continue; }
    const key = set.join(',');
    let j = i + 1;
    while (j < 24 && byHour[j].join(',') === key) j++;
    if (j - i >= minLen) out.push({ start: i, end: j, memberIds: set, count: set.length });
    i = j;
  }
  // Also merge: windows where a superset of people is free count for the subset; keep simple — rank as is.
  return out.sort((a, b) => b.count - a.count || (b.end - b.start) - (a.end - a.start) || a.start - b.start);
}

/** Month view helper: for each date in [start, end], which members are available (≥ minHours) and how many hours everyone shares. */
export function summarizeRange(
  start: string,
  end: string,
  members: Member[],
  schedules: Record<string, WorkSchedule>,
  overrides: Record<string, DayOverride>,
  minHours = 2,
): Record<string, { available: Member[]; everyoneHours: number; bestCount: number }> {
  const out: Record<string, { available: Member[]; everyoneHours: number; bestCount: number }> = {};
  for (let k = start; k <= end; k = addDays(k, 1)) {
    const s = summarizeDay(k, members, schedules, overrides, minHours);
    const bestCount = s.windows.length ? s.windows[0].count : 0;
    out[k] = { available: s.available, everyoneHours: popcount(s.everyoneMask), bestCount };
  }
  return out;
}

// ---------- defaults & presets ----------
export const DEFAULT_SCHEDULE: WorkSchedule = {
  mode: 'weekly',
  weekly: [[], [], [], [], [], [], []],
  rotating: { startDate: todayKey(), daysOn: 4, daysOff: 4, shift: { start: 7, end: 19 } },
  awake: { start: 8, end: 23 },
};

export const SHIFT_PRESETS: { label: string; span: HourSpan }[] = [
  { label: '9 to 5', span: { start: 9, end: 17 } },
  { label: '8 to 4', span: { start: 8, end: 16 } },
  { label: '7 to 3', span: { start: 7, end: 15 } },
  { label: '3 to 11', span: { start: 15, end: 23 } },
  { label: 'Night 11 to 7', span: { start: 23, end: 7 } },
  { label: '12-hr day', span: { start: 7, end: 19 } },
  { label: '12-hr night', span: { start: 19, end: 7 } },
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
