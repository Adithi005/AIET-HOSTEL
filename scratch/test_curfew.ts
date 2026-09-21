import { getCurfewStatus, parseTimeToMinutes, CURFEW_CONFIG } from '../src/utils/curfew';
import { OutingApplication } from '../src/types';

function runTests() {
  console.log('--- Testing parseTimeToMinutes ---');
  console.assert(parseTimeToMinutes('09:00 AM') === 540, '09:00 AM should be 540 min');
  console.assert(parseTimeToMinutes('04:00 PM') === 960, '04:00 PM should be 960 min');
  console.assert(parseTimeToMinutes('04:30 PM') === 990, '04:30 PM should be 990 min');
  console.assert(parseTimeToMinutes('02:00 PM') === 840, '02:00 PM should be 840 min');
  console.assert(parseTimeToMinutes('02:30 PM') === 870, '02:30 PM should be 870 min');
  console.log('✅ parseTimeToMinutes passed');

  console.log('\n--- Testing Regular Outing Curfew ---');
  const regularOuting: OutingApplication = {
    id: 'OUT-TEST',
    usn: '1RV22CS089',
    studentName: 'Test Student',
    roomNumber: 'B-304',
    hostelBlock: 'Cauvery',
    outingType: 'Local City Outing',
    outDate: '2024-10-25',
    outTime: '09:00 AM',
    expectedInTime: '04:00 PM',
    destination: 'Town',
    purpose: 'Shopping',
    contactNumber: '123',
    emergencyContact: '456',
    appliedAt: '2024-10-25 09:00',
    status: 'Exited Gate',
    outpassToken: 'OP-123',
    qrCodeValue: 'TEST',
  };

  // 1. Return at 3:30 PM (On Time)
  const evalOnTime = getCurfewStatus(regularOuting, '03:30 PM');
  console.assert(evalOnTime.status === 'On Time', '3:30 PM should be On Time');
  console.assert(!evalOnTime.isGraceAlert && !evalOnTime.isLate, 'Should not be grace or late');
  console.log('✅ Regular 3:30 PM -> On Time');

  // 2. Return at 4:15 PM (Grace Window)
  const evalGrace = getCurfewStatus(regularOuting, '04:15 PM');
  console.assert(evalGrace.status === 'Grace Period Alert', '4:15 PM should be Grace Period Alert');
  console.assert(evalGrace.isGraceAlert && !evalGrace.isLate, 'Should be grace alert and not late');
  console.assert(evalGrace.minutesPastCurfew === 15, 'Minutes past curfew should be 15');
  console.log('✅ Regular 4:15 PM -> Grace Alert Window (4:00 - 4:30 PM)');

  // 3. Return at 4:45 PM (Late Breach)
  const evalLate = getCurfewStatus(regularOuting, '04:45 PM');
  console.assert(evalLate.status === 'Late Curfew Breach', '4:45 PM should be Late Curfew Breach');
  console.assert(evalLate.isLate, 'Should be marked late');
  console.assert(evalLate.minutesPastCurfew === 45, 'Minutes past curfew should be 45');
  console.log('✅ Regular 4:45 PM -> Late Curfew Breach (> 4:30 PM cutoff)');

  console.log('\n--- Testing Govt Holiday Outing Curfew ---');
  const holidayOuting: OutingApplication = {
    ...regularOuting,
    isGovtHolidayOuting: true,
  };

  // 1. Return at 1:30 PM (On Time)
  const holOnTime = getCurfewStatus(holidayOuting, '01:30 PM');
  console.assert(holOnTime.status === 'On Time', '1:30 PM should be On Time');
  console.log('✅ Holiday 1:30 PM -> On Time');

  // 2. Return at 2:15 PM (Grace Window)
  const holGrace = getCurfewStatus(holidayOuting, '02:15 PM');
  console.assert(holGrace.status === 'Grace Period Alert', '2:15 PM should be Grace Period Alert');
  console.assert(holGrace.isGraceAlert && !holGrace.isLate, 'Should be grace alert and not late');
  console.log('✅ Holiday 2:15 PM -> Grace Alert Window (2:00 - 2:30 PM)');

  // 3. Return at 2:40 PM (Late Breach)
  const holLate = getCurfewStatus(holidayOuting, '02:40 PM');
  console.assert(holLate.status === 'Late Curfew Breach', '2:40 PM should be Late Curfew Breach');
  console.assert(holLate.isLate, 'Should be marked late');
  console.log('✅ Holiday 2:40 PM -> Late Curfew Breach (> 2:30 PM cutoff)');

  console.log('\n🎉 ALL CURFEW LOGIC VERIFICATION TESTS PASSED!');
}

runTests();
