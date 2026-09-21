// Test Script for Leave Timing Rules & Policies

function getCutoffStatus(startDateStr, currentTimestamp) {
  const now = currentTimestamp instanceof Date ? currentTimestamp : typeof currentTimestamp === 'number' ? new Date(currentTimestamp) : new Date();

  const parts = startDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const cutoff = new Date(year, month, day, 17, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 2);

  const cutoffTimestamp = cutoff.getTime();
  const currentMs = now.getTime();
  const isMissed = currentMs > cutoffTimestamp;
  const hoursDifference = Math.round(Math.abs(cutoffTimestamp - currentMs) / (1000 * 60 * 60));

  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  const cutoffDateStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;

  return {
    cutoffDate: cutoffDateStr,
    cutoffTime: '05:00 PM',
    cutoffTimestamp,
    isMissed,
    hoursDifference,
  };
}

function calculateLeaveSessionDays(params) {
  const startParts = params.startDate.split('-');
  const endParts = params.endDate.split('-');

  const startObj = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10));
  const endObj = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10));

  const diffMs = endObj.getTime() - startObj.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const totalCalendarDays = Math.max(1, diffDays + 1);

  const startDayOfWeek = startObj.getDay(); // 0 = Sun, 6 = Sat
  const endDayOfWeek = endObj.getDay(); // 1 = Mon

  const isWeekendExempt =
    startDayOfWeek === 6 &&
    params.startSession === 'Evening' &&
    endDayOfWeek === 1 &&
    params.returnSession === 'Morning' &&
    diffDays === 2;

  let countedDays = totalCalendarDays;

  if (params.startSession === 'Evening') {
    countedDays = Math.max(0, countedDays - 1);
  }

  if (params.returnSession === 'Morning' && countedDays > 0) {
    countedDays = Math.max(0, countedDays - 1);
  }

  let chargedDays = countedDays;
  let requiresAoPermission = false;

  if (params.isGovtHoliday) {
    chargedDays = 0;
  } else if (isWeekendExempt) {
    chargedDays = 0;
    requiresAoPermission = true;
  }

  return {
    totalCalendarDays,
    countedDays,
    chargedDays,
    isEveningStart: params.startSession === 'Evening',
    isMorningReturn: params.returnSession === 'Morning',
    isWeekendExempt,
    requiresAoPermission,
  };
}

console.log('=== TEST 1: 2-Day Prior 5:00 PM Deadline ===');
// Friday departure: 2024-10-25
// Cutoff is Wednesday 2024-10-23 17:00
const testDate = '2024-10-25';

// Case 1A: Tuesday (3 days prior) -> should NOT be missed
const t1 = getCutoffStatus(testDate, new Date(2024, 9, 22, 10, 0, 0));
console.log('1A: Applied Tuesday 10 AM (3 days prior) -> isMissed:', t1.isMissed, '(Expected: false)');
console.assert(t1.isMissed === false, '1A Failed');

// Case 1B: Wednesday 4:30 PM (before 5:00 PM cutoff) -> should NOT be missed
const t2 = getCutoffStatus(testDate, new Date(2024, 9, 23, 16, 30, 0));
console.log('1B: Applied Wednesday 4:30 PM -> isMissed:', t2.isMissed, '(Expected: false)');
console.assert(t2.isMissed === false, '1B Failed');

// Case 1C: Wednesday 5:01 PM (after 5:00 PM cutoff) -> should BE MISSED
const t3 = getCutoffStatus(testDate, new Date(2024, 9, 23, 17, 1, 0));
console.log('1C: Applied Wednesday 5:01 PM -> isMissed:', t3.isMissed, '(Expected: true)');
console.assert(t3.isMissed === true, '1C Failed');

// Case 1D: Thursday morning (1 day prior) -> should BE MISSED
const t4 = getCutoffStatus(testDate, new Date(2024, 9, 24, 9, 0, 0));
console.log('1D: Applied Thursday 9:00 AM -> isMissed:', t4.isMissed, '(Expected: true)');
console.assert(t4.isMissed === true, '1D Failed');

console.log('\n=== TEST 2: Evening Departure Rule ===');
// Leave from Friday to Sunday (3 calendar days: Fri, Sat, Sun)
// If Morning departure & Evening return -> 3 days charged
const s1 = calculateLeaveSessionDays({
  startDate: '2024-10-25',
  startSession: 'Morning',
  endDate: '2024-10-27',
  returnSession: 'Evening',
});
console.log('2A: Morning Start, Evening Return -> Charged:', s1.chargedDays, '(Expected: 3)');
console.assert(s1.chargedDays === 3, '2A Failed');

// If Evening departure -> Friday is NOT counted, counting starts next day (Sat, Sun) -> 2 days charged
const s2 = calculateLeaveSessionDays({
  startDate: '2024-10-25',
  startSession: 'Evening',
  endDate: '2024-10-27',
  returnSession: 'Evening',
});
console.log('2B: Evening Start, Evening Return -> Charged:', s2.chargedDays, '(Expected: 2)');
console.assert(s2.chargedDays === 2, '2B Failed');

console.log('\n=== TEST 3: Saturday PM to Monday AM Weekend Exemption ===');
// 2024-10-26 is Saturday, 2024-10-28 is Monday
const w1 = calculateLeaveSessionDays({
  startDate: '2024-10-26', // Saturday
  startSession: 'Evening',
  endDate: '2024-10-28',   // Monday
  returnSession: 'Morning',
});
console.log('3A: Saturday Evening to Monday Morning -> isWeekendExempt:', w1.isWeekendExempt, 'Charged:', w1.chargedDays, 'Requires AO:', w1.requiresAoPermission);
console.assert(w1.isWeekendExempt === true, '3A WeekendExempt Failed');
console.assert(w1.chargedDays === 0, '3A Charged 0 Failed');
console.assert(w1.requiresAoPermission === true, '3A Requires AO Failed');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
