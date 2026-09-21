import { OutingApplication } from '../types';

export const CURFEW_CONFIG = {
  REGULAR: {
    label: 'Regular Day Outing',
    startTime: '09:00 AM',
    curfewTime: '04:00 PM',
    graceEndTime: '04:30 PM',
    startMinutes: 9 * 60, // 540
    curfewMinutes: 16 * 60, // 960
    graceEndMinutes: 16 * 60 + 30, // 990
  },
  HOLIDAY: {
    label: 'Govt Holiday Outpass',
    startTime: '09:00 AM',
    curfewTime: '02:00 PM',
    graceEndTime: '02:30 PM',
    startMinutes: 9 * 60, // 540
    curfewMinutes: 14 * 60, // 840
    graceEndMinutes: 14 * 60 + 30, // 870
  },
};

/**
 * Parses time strings like "04:30 PM", "4:30 PM", "16:30", or Date objects into minutes from midnight.
 */
export function parseTimeToMinutes(timeInput: string | Date): number {
  if (timeInput instanceof Date) {
    return timeInput.getHours() * 60 + timeInput.getMinutes();
  }

  if (!timeInput || typeof timeInput !== 'string') {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  const clean = timeInput.trim().toUpperCase();

  // If timestamp contains date part like "2024-10-25 04:30 PM"
  const timePart = clean.includes(' ') && (clean.includes('AM') || clean.includes('PM'))
    ? clean.split(' ').slice(-2).join(' ')
    : clean;

  const match = timePart.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
  if (!match) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3];

  if (meridian === 'PM' && hours < 12) {
    hours += 12;
  } else if (meridian === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const meridian = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hours12)}:${pad(mins)} ${meridian}`;
}

export interface CurfewEvaluation {
  isHoliday: boolean;
  curfewTime: string;
  graceEndTime: string;
  status: 'On Time' | 'Grace Period Alert' | 'Late Curfew Breach';
  isGraceAlert: boolean;
  isLate: boolean;
  minutesPastCurfew: number;
  alertMessage: string;
  badgeColor: string;
}

/**
 * Evaluates the curfew status of an outing against the specified or current time.
 */
export function getCurfewStatus(
  outing: OutingApplication | null | undefined,
  timeToCheck?: string | Date
): CurfewEvaluation {
  const isHoliday = Boolean(outing?.isGovtHolidayOuting);
  const cfg = isHoliday ? CURFEW_CONFIG.HOLIDAY : CURFEW_CONFIG.REGULAR;

  const currentMinutes = parseTimeToMinutes(timeToCheck || new Date());
  const curfewMinutes = cfg.curfewMinutes;
  const graceEndMinutes = cfg.graceEndMinutes;

  if (currentMinutes <= curfewMinutes) {
    return {
      isHoliday,
      curfewTime: cfg.curfewTime,
      graceEndTime: cfg.graceEndTime,
      status: 'On Time',
      isGraceAlert: false,
      isLate: false,
      minutesPastCurfew: 0,
      alertMessage: `Curfew is ${cfg.curfewTime}. Return safely before gate cutoff.`,
      badgeColor: '#10B981', // green
    };
  } else if (currentMinutes <= graceEndMinutes) {
    const remainingGraceMins = graceEndMinutes - currentMinutes;
    return {
      isHoliday,
      curfewTime: cfg.curfewTime,
      graceEndTime: cfg.graceEndTime,
      status: 'Grace Period Alert',
      isGraceAlert: true,
      isLate: false,
      minutesPastCurfew: currentMinutes - curfewMinutes,
      alertMessage: `⚠️ Curfew was at ${cfg.curfewTime}! Grace period ends at ${cfg.graceEndTime} (${remainingGraceMins} min remaining). Return immediately!`,
      badgeColor: '#F59E0B', // amber
    };
  } else {
    const lateMinutes = currentMinutes - graceEndMinutes;
    return {
      isHoliday,
      curfewTime: cfg.curfewTime,
      graceEndTime: cfg.graceEndTime,
      status: 'Late Curfew Breach',
      isGraceAlert: false,
      isLate: true,
      minutesPastCurfew: currentMinutes - curfewMinutes,
      alertMessage: `🚨 Late Entry Violation: Returned after ${cfg.graceEndTime} cutoff (+${lateMinutes} min late). Next outing will be blocked until SWO permission!`,
      badgeColor: '#EF4444', // red
    };
  }
}
