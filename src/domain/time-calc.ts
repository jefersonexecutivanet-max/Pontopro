/**
 * Core Brazilian Labor Calculation Engine (CLT & Portaria MTP 671/2021)
 * Pure functions for deterministic calculation and unit testing.
 */

import { APP_CONFIG } from '../config/app-config';
import { EventType, TimeEvent, DailySummary, WorkSchedule } from '../types';

export interface PunchInterval {
  start: Date;
  end: Date;
  type: 'work' | 'lunch' | 'overtime';
}

/**
 * Checks whether an event timestamp falls inside nighttime window (22:00 to 05:00)
 */
export function isNightTime(date: Date): boolean {
  const hours = date.getHours();
  return hours >= APP_CONFIG.clt.nightShiftStartHour || hours < APP_CONFIG.clt.nightShiftEndHour;
}

/**
 * Calculates minutes between two dates
 */
export function diffInMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60)));
}

/**
 * Calculates nighttime minutes worked with reduced hour factor (hora ficta reduzida: 52min30s)
 * According to Art. 73 § 1º da CLT: 1 hora noturna = 52 minutos e 30 segundos (fator 60 / 52.5 = 1.142857)
 */
export function calculateNightMinutes(start: Date, end: Date): number {
  let nightMinutesReal = 0;
  const current = new Date(start);

  while (current < end) {
    if (isNightTime(current)) {
      nightMinutesReal++;
    }
    current.setMinutes(current.getMinutes() + 1);
  }

  // Convert real night minutes to legal reduced night minutes (hora ficta)
  return Math.round(nightMinutesReal * APP_CONFIG.clt.nightHourMultiplier);
}

/**
 * Calculates tolerance according to Art. 58, § 1º da CLT:
 * Variations of up to 5 minutes on each punch, limited to a daily maximum of 10 minutes,
 * are not discounted nor computed as overtime.
 */
export function applyCltTolerance(actualMinutes: number, expectedMinutes: number): number {
  const diff = actualMinutes - expectedMinutes;
  if (Math.abs(diff) <= APP_CONFIG.clt.maxDailyToleranceMinutes) {
    return expectedMinutes; // No discount and no overtime within 10 min daily tolerance
  }
  return actualMinutes;
}

/**
 * Pairs up raw time events for a single day into work intervals
 */
export function pairEvents(events: TimeEvent[]): {
  workMinutes: number;
  lunchMinutes: number;
  nightMinutes: number;
} {
  if (!events || events.length === 0) {
    return { workMinutes: 0, lunchMinutes: 0, nightMinutes: 0 };
  }

  // Sort chronologically by occurred_at
  const sorted = [...events].sort((a, b) => 
    new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );

  let workMinutes = 0;
  let lunchMinutes = 0;
  let nightMinutes = 0;

  let currentEntry: Date | null = null;
  let lunchStart: Date | null = null;

  for (const event of sorted) {
    const eventTime = new Date(event.occurred_at);

    switch (event.event_type) {
      case 'entry':
        currentEntry = eventTime;
        break;

      case 'lunch_start':
        if (currentEntry) {
          workMinutes += diffInMinutes(currentEntry, eventTime);
          nightMinutes += calculateNightMinutes(currentEntry, eventTime);
          currentEntry = null;
        }
        lunchStart = eventTime;
        break;

      case 'lunch_end':
        if (lunchStart) {
          lunchMinutes += diffInMinutes(lunchStart, eventTime);
          lunchStart = null;
        }
        currentEntry = eventTime;
        break;

      case 'exit':
        if (currentEntry) {
          workMinutes += diffInMinutes(currentEntry, eventTime);
          nightMinutes += calculateNightMinutes(currentEntry, eventTime);
          currentEntry = null;
        }
        break;

      default:
        break;
    }
  }

  return { workMinutes, lunchMinutes, nightMinutes };
}

/**
 * Calculates a full daily summary against a work schedule
 */
export function calculateDailySummary(
  dateStr: string,
  employeeId: string,
  events: TimeEvent[],
  schedule: WorkSchedule,
  isWeekendOrHoliday: boolean = false
): DailySummary {
  const { workMinutes, lunchMinutes, nightMinutes } = pairEvents(events);
  const expectedMinutes = isWeekendOrHoliday ? 0 : schedule.daily_expected_hours * 60;

  // Apply CLT tolerance
  const adjustedWorkMinutes = applyCltTolerance(workMinutes, expectedMinutes);
  const balanceMinutes = adjustedWorkMinutes - expectedMinutes;

  let overtime50 = 0;
  let overtime100 = 0;

  if (balanceMinutes > 0) {
    if (isWeekendOrHoliday) {
      overtime100 = balanceMinutes;
    } else {
      overtime50 = balanceMinutes;
    }
  }

  let status: DailySummary['status'] = 'complete';
  if (events.length === 0) {
    status = isWeekendOrHoliday ? 'day_off' : 'absent';
  } else if (events.length % 2 !== 0) {
    status = 'incomplete';
  }

  return {
    date: dateStr,
    employee_id: employeeId,
    events,
    worked_minutes: workMinutes,
    expected_minutes: expectedMinutes,
    balance_minutes: balanceMinutes,
    overtime_50_minutes: overtime50,
    overtime_100_minutes: overtime100,
    night_shift_minutes: nightMinutes,
    lunch_break_minutes: lunchMinutes,
    status,
  };
}

/**
 * Formats minutes to HH:MM format with sign (+01:30 or -00:45)
 */
export function formatMinutes(minutes: number, showSign: boolean = false): string {
  const isNegative = minutes < 0;
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const str = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  if (!showSign) return str;
  return isNegative ? `-${str}` : `+${str}`;
}
