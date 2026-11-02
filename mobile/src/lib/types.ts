/** A span of hours on a clock. `end` may be <= `start`, meaning it crosses midnight (23 → 7). */
export interface HourSpan {
  start: number; // 0–23
  end: number;   // 1–24 (24 = midnight at end of day)
}

export type ScheduleMode = 'weekly' | 'rotating';

/** A person's recurring work schedule. Work hours are BUSY; everything else inside awake hours is FREE. */
export interface WorkSchedule {
  mode: ScheduleMode;
  /** weekly[0] = Sunday … weekly[6] = Saturday. Each day lists work shifts. */
  weekly: HourSpan[][];
  /** Rotating pattern (e.g. 4 on / 4 off) anchored to a start date. */
  rotating: {
    startDate: string; // YYYY-MM-DD — first "on" day
    daysOn: number;
    daysOff: number;
    shift: HourSpan;
  };
  /** Hours the person is willing to meet, e.g. 8 → 23. */
  awake: HourSpan;
}

export interface Group {
  id: string;
  code: string;       // short invite code, e.g. "K7P2QD"
  name: string;
  createdBy: string; // userId of the creator — only they can delete the calendar
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  userId: string;
  nickname: string;
  color: string;
  createdAt: string;
}

/** A hand-edited day: replaces the computed free hours for that date. `mask` bit h set = free at hour h. */
export interface DayOverride {
  memberId: string;
  date: string; // YYYY-MM-DD
  mask: number;
}

export interface GroupState {
  group: Group;
  members: Member[];
  schedules: Record<string, WorkSchedule>;   // by memberId
  overrides: Record<string, DayOverride>;    // key `${memberId}|${date}`
}
