import { GovtHoliday } from '../types';

/**
 * Official Government & Institutional Declared Holidays (2024 - 2026)
 * Under hostel regulations, leaves taken during declared Govt / institutional holidays
 * DO NOT count against the student's 10-day personal leave quota.
 */
export const GOVT_HOLIDAYS: GovtHoliday[] = [
  // 2024 Holidays
  { date: '2024-01-15', name: 'Makara Sankranti / Pongal', description: 'Harvest Festival Holiday' },
  { date: '2024-01-26', name: 'Republic Day', description: 'National Gazetted Holiday' },
  { date: '2024-03-08', name: 'Maha Shivaratri', description: 'Gazetted Holiday' },
  { date: '2024-03-25', name: 'Holi Festival', description: 'Spring Festival Holiday' },
  { date: '2024-04-09', name: 'Ugadi / Gudi Padwa', description: 'New Year State Holiday' },
  { date: '2024-04-11', name: 'Eid-ul-Fitr', description: 'Gazetted Holiday' },
  { date: '2024-04-14', name: 'Dr. B.R. Ambedkar Jayanti', description: 'National Holiday' },
  { date: '2024-05-01', name: 'May Day (Labor Day)', description: 'Public Holiday' },
  { date: '2024-06-17', name: 'Bakrid / Eid al-Adha', description: 'Gazetted Holiday' },
  { date: '2024-07-17', name: 'Muharram', description: 'Gazetted Holiday' },
  { date: '2024-08-15', name: 'Independence Day', description: 'National Gazetted Holiday' },
  { date: '2024-09-07', name: 'Ganesh Chaturthi', description: 'Festival Public Holiday' },
  { date: '2024-10-02', name: 'Mahatma Gandhi Jayanti', description: 'National Gazetted Holiday' },
  { date: '2024-10-11', endDate: '2024-10-13', name: 'Dussehra / Vijayadashami Break', description: 'Festival & Institutional Holiday' },
  { date: '2024-10-31', endDate: '2024-11-03', name: 'Diwali / Deepavali Holidays', description: 'Declared Festival Break' },
  { date: '2024-11-01', name: 'Kannada Rajyotsava', description: 'Karnataka State Day' },
  { date: '2024-12-25', name: 'Christmas Day', description: 'Gazetted Holiday' },

  // 2025 Holidays
  { date: '2025-01-14', endDate: '2025-01-16', name: 'Sankranti / Pongal Break', description: 'Declared Festival Holiday' },
  { date: '2025-01-26', name: 'Republic Day', description: 'National Gazetted Holiday' },
  { date: '2025-02-26', name: 'Maha Shivaratri', description: 'Gazetted Holiday' },
  { date: '2025-03-30', name: 'Ugadi', description: 'State Holiday' },
  { date: '2025-03-31', name: 'Eid-ul-Fitr', description: 'Gazetted Holiday' },
  { date: '2025-04-14', name: 'Dr. B.R. Ambedkar Jayanti', description: 'National Holiday' },
  { date: '2025-05-01', name: 'May Day', description: 'Public Holiday' },
  { date: '2025-08-15', name: 'Independence Day', description: 'National Gazetted Holiday' },
  { date: '2025-08-27', name: 'Ganesh Chaturthi', description: 'Festival Holiday' },
  { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti', description: 'National Gazetted Holiday' },
  { date: '2025-10-20', endDate: '2025-10-24', name: 'Diwali / Deepavali Break', description: 'Institutional Festival Vacation' },
  { date: '2025-11-01', name: 'Kannada Rajyotsava', description: 'State Holiday' },
  { date: '2025-12-25', name: 'Christmas Day', description: 'Gazetted Holiday' },

  // 2026 Holidays
  { date: '2026-01-15', name: 'Makara Sankranti', description: 'Festival Holiday' },
  { date: '2026-01-26', name: 'Republic Day', description: 'National Gazetted Holiday' },
  { date: '2026-03-19', name: 'Ugadi', description: 'State Holiday' },
  { date: '2026-04-14', name: 'Dr. B.R. Ambedkar Jayanti', description: 'National Holiday' },
  { date: '2026-05-01', name: 'May Day', description: 'Public Holiday' },
  { date: '2026-08-15', name: 'Independence Day', description: 'National Gazetted Holiday' },
  { date: '2026-10-02', name: 'Gandhi Jayanti', description: 'National Gazetted Holiday' },
  { date: '2026-11-01', name: 'Kannada Rajyotsava', description: 'State Holiday' },
  { date: '2026-11-08', endDate: '2026-11-12', name: 'Diwali Festival Break', description: 'Declared Festival Break' },
  { date: '2026-12-25', name: 'Christmas Day', description: 'Gazetted Holiday' },
];

/**
 * Checks if a given date string or date range overlaps with any declared government/college holidays
 */
export function checkHolidayOverlap(
  startDate: string,
  endDate: string
): { isHoliday: boolean; matchedHolidays: GovtHoliday[]; holidayNames: string } {
  if (!startDate) {
    return { isHoliday: false, matchedHolidays: [], holidayNames: '' };
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;

  const matched = GOVT_HOLIDAYS.filter((h) => {
    const hStart = new Date(h.date);
    const hEnd = h.endDate ? new Date(h.endDate) : hStart;

    // Range overlap: start <= hEnd and end >= hStart
    return start <= hEnd && end >= hStart;
  });

  return {
    isHoliday: matched.length > 0,
    matchedHolidays: matched,
    holidayNames: matched.map((h) => h.name).join(', '),
  };
}

/**
 * Calculates how many days count against the student's personal leave quota (leavesCount).
 * If the leave is a declared Government Holiday, it counts as 0 days against their personal quota.
 */
export function calculateChargedDays(params: {
  startDate: string;
  endDate: string;
  totalDays: number;
  isGovtHoliday?: boolean;
}): {
  chargedDays: number;
  isExempt: boolean;
  holidayName?: string;
  explanation: string;
} {
  const overlap = checkHolidayOverlap(params.startDate, params.endDate);
  const isExempt = Boolean(params.isGovtHoliday || overlap.isHoliday);

  if (isExempt) {
    const holidayName = overlap.holidayNames || 'Government / College Declared Holiday';
    return {
      chargedDays: 0,
      isExempt: true,
      holidayName,
      explanation: `🏛️ Exempt from personal quota: ${holidayName} (0 Days charged to leave limitation).`,
    };
  }

  return {
    chargedDays: params.totalDays,
    isExempt: false,
    explanation: `${params.totalDays} Day(s) charged towards personal leave quota.`,
  };
}
