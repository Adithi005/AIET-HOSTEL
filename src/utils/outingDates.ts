import { GOVT_HOLIDAYS } from './holidays';

export interface EligibleOutingDate {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Oct 04, 2026"
  dayName: string; // e.g. "Sunday"
  isSunday: boolean;
  isGovtHoliday: boolean;
  holidayName?: string;
  allowedCurfew: string; // "04:00 PM" or "02:00 PM"
  allowedGraceEnd: string; // "04:30 PM" or "02:30 PM"
  timingsDescription: string; // "9:00 AM – 4:00 PM" or "9:00 AM – 2:00 PM"
  badgeText: string;
}

/**
 * Returns ONLY valid outing dates: Sundays and declared Government Holidays.
 * Outings on regular college weekdays are strictly prohibited.
 */
export function getEligibleOutingDates(referenceDate: Date = new Date(), lookaheadDays: number = 45): EligibleOutingDate[] {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const results: EligibleOutingDate[] = [];
  const start = new Date(referenceDate);

  for (let i = 0; i < lookaheadDays; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    const dateStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;

    const isSunday = cur.getDay() === 0;

    // Check government holiday
    const matchedHoliday = GOVT_HOLIDAYS.find((h) => {
      if (h.date === dateStr) return true;
      if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
      return false;
    });

    const isGovtHoliday = Boolean(matchedHoliday);

    // ONLY Sundays and Government Holidays are valid outing dates!
    if (isSunday || isGovtHoliday) {
      const formattedDate = `${months[cur.getMonth()]} ${pad(cur.getDate())}, ${cur.getFullYear()}`;
      const dayName = dayNames[cur.getDay()];

      const allowedCurfew = isGovtHoliday ? '02:00 PM' : '04:00 PM';
      const allowedGraceEnd = isGovtHoliday ? '02:30 PM' : '04:30 PM';
      const timingsDescription = isGovtHoliday ? '9:00 AM – 2:00 PM' : '9:00 AM – 4:00 PM';
      const badgeText = isGovtHoliday
        ? `🏛️ ${matchedHoliday?.name || 'Govt Holiday'}`
        : '🏖️ Sunday Outing';

      results.push({
        dateStr,
        formattedDate,
        dayName,
        isSunday,
        isGovtHoliday,
        holidayName: matchedHoliday?.name,
        allowedCurfew,
        allowedGraceEnd,
        timingsDescription,
        badgeText,
      });
    }
  }

  return results;
}

/**
 * Validates whether a given date is allowed for hostel outing
 */
export function validateOutingDate(dateStr: string): {
  isValid: boolean;
  isSunday: boolean;
  isGovtHoliday: boolean;
  holidayName?: string;
  allowedCurfew: string;
  allowedGraceEnd: string;
  reason: string;
} {
  if (!dateStr || dateStr.length < 10) {
    return {
      isValid: false,
      isSunday: false,
      isGovtHoliday: false,
      allowedCurfew: '04:00 PM',
      allowedGraceEnd: '04:30 PM',
      reason: 'Please enter a valid date in YYYY-MM-DD format.',
    };
  }

  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);

  const isSunday = d.getDay() === 0;

  const matchedHoliday = GOVT_HOLIDAYS.find((h) => {
    if (h.date === dateStr) return true;
    if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
    return false;
  });

  const isGovtHoliday = Boolean(matchedHoliday);

  if (!isSunday && !isGovtHoliday) {
    return {
      isValid: false,
      isSunday: false,
      isGovtHoliday: false,
      allowedCurfew: '04:00 PM',
      allowedGraceEnd: '04:30 PM',
      reason: 'Day outings are permitted ONLY on Sundays (9:00 AM – 4:00 PM) and Government Holidays (9:00 AM – 2:00 PM). Weekdays are non-outing days.',
    };
  }

  return {
    isValid: true,
    isSunday,
    isGovtHoliday,
    holidayName: matchedHoliday?.name,
    allowedCurfew: isGovtHoliday ? '02:00 PM' : '04:00 PM',
    allowedGraceEnd: isGovtHoliday ? '02:30 PM' : '04:30 PM',
    reason: isGovtHoliday
      ? `🏛️ Declared Govt Holiday (${matchedHoliday?.name}). Outing curfew: 9:00 AM – 2:00 PM.`
      : '🏖️ Official Sunday Outing. Curfew: 9:00 AM – 4:00 PM.',
  };
}
