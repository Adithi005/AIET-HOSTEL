/**
 * Utility functions for Institutional Leave Policies:
 * 1. 2-Days Prior 5:00 PM Application Cutoff Rule
 * 2. Evening Departure Rule (Day of departure is excluded, count begins next day)
 * 3. Saturday Afternoon/Evening to Monday Morning Weekend Exemption (0 Days Quota with AO Sanction)
 */

export interface CutoffStatus {
  cutoffDate: string; // YYYY-MM-DD
  cutoffTime: string; // 05:00 PM
  deadlineFormatted: string; // YYYY-MM-DD at 05:00 PM
  cutoffTimestamp: number;
  isMissed: boolean;
  hoursDifference: number;
  message: string;
}

export interface LeaveSessionCalculation {
  totalCalendarDays: number;
  countedDays: number;
  chargedDays: number;
  isEveningStart: boolean;
  isEveningDeparture: boolean;
  isMorningReturn: boolean;
  isWeekendExempt: boolean;
  requiresAoPermission: boolean;
  calculationExplanation: string;
}

/**
 * Evaluates the 2-day prior 5:00 PM deadline for a given departure date.
 * For example: if departure is Friday 2024-10-25, cutoff is Wednesday 2024-10-23 at 5:00 PM (17:00).
 */
export function getCutoffStatus(startDateStr: string, currentTimestamp?: Date | number): CutoffStatus {
  const now = currentTimestamp instanceof Date ? currentTimestamp : typeof currentTimestamp === 'number' ? new Date(currentTimestamp) : new Date();

  // Parse YYYY-MM-DD
  const parts = startDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  // Cutoff is 2 calendar days before startDate at 17:00:00 (5:00 PM)
  const cutoff = new Date(year, month, day, 17, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 2);

  const cutoffTimestamp = cutoff.getTime();
  const currentMs = now.getTime();
  const isMissed = currentMs > cutoffTimestamp;
  const hoursDifference = Math.round(Math.abs(cutoffTimestamp - currentMs) / (1000 * 60 * 60));

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const cutoffDateStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
  const deadlineFormatted = `${cutoffDateStr} at 05:00 PM`;

  let message = '';
  if (isMissed) {
    message = `⚠️ Cutoff Missed: Applications for departure on ${startDateStr} closed on ${cutoffDateStr} at 05:00 PM (${hoursDifference}h ago). An AO Duplicate Coupon is required.`;
  } else {
    message = `✅ Within Deadline: Application open until ${cutoffDateStr} at 05:00 PM (${hoursDifference}h remaining).`;
  }

  return {
    cutoffDate: cutoffDateStr,
    cutoffTime: '05:00 PM',
    deadlineFormatted,
    cutoffTimestamp,
    isMissed,
    hoursDifference,
    message,
  };
}

/**
 * Calculates effective leave days taking into account:
 * 1. Evening departure: day of departure is NOT counted; counting starts next day.
 * 2. Return session: Morning return means student is back for morning classes, day not counted.
 * 3. Saturday Evening to Monday Morning: Weekend exemption -> 0 Days charged (AO Permission Required).
 * 4. Government Holidays: 0 Days charged.
 */
export function calculateLeaveSessionDays(params: {
  startDate: string;
  startSession: 'Morning' | 'Evening';
  endDate: string;
  returnSession: 'Morning' | 'Evening';
  isGovtHoliday?: boolean;
}): LeaveSessionCalculation {
  const startParts = params.startDate.split('-');
  const endParts = params.endDate.split('-');

  const startObj = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
  const endObj = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));

  const diffMs = endObj.getTime() - startObj.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const totalCalendarDays = Math.max(1, diffDays + 1);

  const startDayOfWeek = startObj.getDay(); // 0 = Sun, 6 = Sat
  const endDayOfWeek = endObj.getDay(); // 1 = Mon

  // Check Saturday Afternoon/Evening to Monday Morning Weekend Exemption
  // Saturday (6) Evening -> Monday (1) Morning
  const isWeekendExempt =
    startDayOfWeek === 6 &&
    params.startSession === 'Evening' &&
    endDayOfWeek === 1 &&
    params.returnSession === 'Morning' &&
    diffDays === 2;

  let countedDays = totalCalendarDays;

  // Evening departure: departure day not counted, starts from next day
  if (params.startSession === 'Evening') {
    countedDays = Math.max(0, countedDays - 1);
  }

  // Morning return: return day not counted if student returns before classes
  if (params.returnSession === 'Morning' && countedDays > 0) {
    countedDays = Math.max(0, countedDays - 1);
  }

  let chargedDays = countedDays;
  let requiresAoPermission = false;
  let explanation = '';

  if (params.isGovtHoliday) {
    chargedDays = 0;
    explanation = 'Government / Institutional Holiday: 0 Quota Days Charged.';
  } else if (isWeekendExempt) {
    chargedDays = 0;
    requiresAoPermission = true;
    explanation = 'Saturday Evening to Monday Morning Weekend Exemption: 0 Days Quota Charged (AO Approval Required).';
  } else if (params.startSession === 'Evening') {
    explanation = `Evening Departure: Day of departure (${params.startDate}) excluded from count. Counting starts next day.`;
  } else {
    explanation = `Standard Leave: ${chargedDays} Day(s) charged towards personal hostel quota.`;
  }

  return {
    totalCalendarDays,
    countedDays,
    chargedDays,
    isEveningStart: params.startSession === 'Evening',
    isEveningDeparture: params.startSession === 'Evening',
    isMorningReturn: params.returnSession === 'Morning',
    isWeekendExempt,
    requiresAoPermission,
    calculationExplanation: explanation,
  };
}

/**
 * Calculates the minimum allowed departure date for student leave application.
 * Institutional Policy: Leave must be applied at least 2 full days in advance before 5:00 PM.
 * E.g., if today is Sep 29, applications start strictly from Oct 2.
 * (Sep 29, Sep 30, and Oct 1 cannot be applied by student; only AO Admin can issue an AO Duplicate/Compensation Pass).
 */
export function getMinEligibleLeaveStartDate(referenceDate: Date = new Date()): {
  minDateStr: string;
  minFormatted: string;
  todayStr: string;
  todayFormatted: string;
} {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const now = new Date(referenceDate);
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const todayFormatted = `${months[now.getMonth()]} ${pad(now.getDate())}, ${now.getFullYear()}`;

  // Advance by 3 calendar days to guarantee the 2-days-prior-5PM deadline (e.g. Sep 29 -> Oct 2)
  const minDate = new Date(now);
  minDate.setDate(now.getDate() + 3);

  const minDateStr = `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}`;
  const minFormatted = `${months[minDate.getMonth()]} ${pad(minDate.getDate())}, ${minDate.getFullYear()}`;

  return {
    minDateStr,
    minFormatted,
    todayStr,
    todayFormatted,
  };
}

export interface EligibleLeaveDateItem {
  dateStr: string;
  dayName: string;
  formattedDate: string;
  isWeekend: boolean;
}

/**
 * Returns an array of eligible upcoming departure dates starting from the minimum date (e.g. Oct 2 when today is Sep 29).
 */
export function getEligibleLeaveDatesList(
  referenceDate: Date = new Date(),
  count: number = 14
): EligibleLeaveDateItem[] {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const { minDateStr } = getMinEligibleLeaveStartDate(referenceDate);
  const parts = minDateStr.split('-');
  const start = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

  const list: EligibleLeaveDateItem[] = [];
  for (let i = 0; i < count; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);

    const dateStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
    const formattedDate = `${months[cur.getMonth()]} ${pad(cur.getDate())}`;
    const dayName = dayNames[cur.getDay()];
    const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;

    list.push({
      dateStr,
      dayName,
      formattedDate,
      isWeekend,
    });
  }
  return list;
}

/**
 * Validates whether a requested departure date is allowed under the 2-day advance notice rule.
 */
export function validateLeaveStartDate(
  startDateStr: string,
  referenceDate: Date = new Date()
): {
  isAllowed: boolean;
  minDateStr: string;
  minFormatted: string;
  reason: string;
} {
  const { minDateStr, minFormatted, todayFormatted } = getMinEligibleLeaveStartDate(referenceDate);

  if (!startDateStr || startDateStr < minDateStr) {
    return {
      isAllowed: false,
      minDateStr,
      minFormatted,
      reason: `Institutional Leave Policy: Students must apply leave 2 days before 5:00 PM. Applications for departure before ${minFormatted} (such as ${startDateStr || 'today'}) are closed. As of today (${todayFormatted}), leaves can only be applied from ${minFormatted} onwards. For emergency leave, only the AO Admin can issue an AO Duplicate / Compensation Pass.`,
    };
  }

  return {
    isAllowed: true,
    minDateStr,
    minFormatted,
    reason: `Application permitted. Departure is on or after ${minFormatted}.`,
  };
}

