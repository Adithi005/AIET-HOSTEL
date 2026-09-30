const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Initial seed data
const initialData = {
  profile: {
    usn: '1RV22CS089',
    name: 'Aditya Sharma',
    branch: 'Computer Science & Engineering',
    mail: 'aditya.cs22@rvce.edu.in',
    contactNumber: '+91 98765 43210',
    guardianContact: '+91 98765 01234',
    hostelBlock: 'Cauvery Block (B-3)',
    roomNumber: 'B-304',
    currentSemester: 5,
    academicYear: '3rd Year (2024-2025)',
    avatarUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    leavesCount: 4,
    isOutingBlocked: false,
    outingBlockReason: null,
  },
  outings: [
    {
      id: 'OUT-3013',
      registrationId: 'REG-OUT-1RV22CS089-3013',
      barcode: '*REG-OUT-1RV22CS089-3013*',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      outingType: 'Regular Outing',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '09:00 AM',
      expectedInTime: '04:00 PM',
      checkOutTime: '09:30 AM',
      checkOutGate: 'Campus Main Gate 1',
      checkOutGuard: 'Security Guard Ramu',
      destination: 'Local City Center',
      purpose: 'Books purchase and project discussion',
      contactNumber: '+91 98765 43210',
      emergencyContact: '+91 98765 01234',
      appliedAt: 'Today 08:40 AM',
      status: 'Outpass Generated',
      outpassToken: 'OP-59821',
      qrCodeValue: 'AIETNEST-OP-59821-1RV22CS089',
      movementHistory: [
        {
          id: 'EVT-OUT-3013-1',
          action: 'Check Out',
          timestamp: 'Today 09:30 AM',
          gate: 'Campus Main Gate 1',
          guardName: 'Security Guard Ramu',
          remarks: 'Outpass verified at gate.',
          barcode: '*REG-OUT-1RV22CS089-3013*',
          usn: '1RV22CS089',
        },
      ],
    },
    {
      id: 'OUT-3012',
      registrationId: 'REG-OUT-1RV22CS089-3012',
      barcode: '*REG-OUT-1RV22CS089-3012*',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      outingType: 'Govt Holiday Outing',
      outDate: '2026-09-27',
      outTime: '09:00 AM',
      expectedInTime: '02:00 PM',
      checkOutTime: '09:15 AM',
      checkOutGate: 'Campus Main Gate 1',
      checkOutGuard: 'Security Guard Somanna',
      checkInTime: '01:45 PM',
      checkInGate: 'Campus Main Gate 1',
      checkInGuard: 'Security Guard Somanna',
      destination: 'Town Library',
      purpose: 'Reference study',
      appliedAt: '2026-09-27 08:30 AM',
      status: 'Returned & Closed',
      outpassToken: 'OP-59810',
      movementHistory: [],
    }
  ],
  leaves: [
    {
      id: 'LV-1004',
      registrationId: 'REG-LV-1RV22CS089-1004',
      barcode: '*REG-LV-1RV22CS089-1004*',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      leaveType: 'Home Visit',
      startDate: '2026-10-18',
      endDate: '2026-10-21',
      startSession: 'Morning',
      returnSession: 'Evening',
      totalDays: 3,
      reason: 'Family function visit',
      appliedDate: '2026-10-14',
      status: 'Approved',
      gateToken: 'TK-84920',
      tokenGeneratedAt: '2026-10-14 16:30',
      isGovtHoliday: true,
      holidayName: 'Deepavali Holidays',
      chargedDays: 0,
      isAutoApproved: true,
      movementHistory: [],
    }
  ],
  grievances: [
    {
      id: 'GR-101',
      category: 'Maintenance',
      title: 'Study Lamp Switch Replacement',
      description: 'Switch in room B-304 is loose and sparks intermittently.',
      status: 'In Progress',
      createdAt: '2026-09-28',
      assignedTo: 'Electrician Ramesh',
    }
  ],
  messRatings: [],
  notifications: [
    {
      id: 'NOTIF-1',
      usn: '1RV22CS089',
      title: 'Gate Pass Approved',
      message: 'Your outing pass for today has been auto-approved.',
      timestamp: 'Today 08:45 AM',
      read: false,
    }
  ],
  aoPetitions: [
    {
      id: 'AO-PET-101',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      type: 'Fees Delay Permission',
      reason: 'Education loan disbursement pending from Canara Bank main branch. Requesting 15-day payment extension till Oct 15th.',
      requestedDate: '2026-09-28',
      expectedPaymentDate: '2026-10-15',
      status: 'Pending AO Approval',
    },
    {
      id: 'AO-PET-102',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      type: 'Mess Bill Reduction',
      reason: 'Participated in VTU Inter-Collegiate Athletics Meet and was away from campus for 8 consecutive days.',
      requestedDate: '2026-09-25',
      reductionDays: 8,
      status: 'Pending AO Approval',
    },
    {
      id: 'AO-PET-103',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      type: 'Study Certificate',
      reason: 'Required for State Post-Matric e-Pass Scholarship Renewal application portal.',
      requestedDate: '2026-09-26',
      purpose: 'State Scholarship Portal Verification',
      targetSemester: 5,
      status: 'Pending AO Approval',
    },
    {
      id: 'AO-PET-104',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      type: 'Marks Card / Grade Transcript',
      reason: 'Official verified 4th Semester grade transcript copy required for off-campus summer technical internship background verification.',
      requestedDate: '2026-09-27',
      purpose: 'Internship Onboarding Verification',
      targetSemester: 4,
      status: 'Pending AO Approval',
    },
  ],
  academics: [
    {
      semester: 5,
      academicYear: '2024-2025',
      sgpa: 8.85,
      cgpa: 8.95,
      overallAttendance: 86.4,
      subjects: [
        { code: '21CS51', name: 'Management & Entrepreneurship', ia1: 28, ia2: 27, ia3: 29, maxIa: 30, classesAttended: 42, totalClasses: 48, attendancePercentage: 87.5 },
        { code: '21CS52', name: 'Computer Networks', ia1: 26, ia2: 28, ia3: 27, maxIa: 30, classesAttended: 38, totalClasses: 44, attendancePercentage: 86.4 },
        { code: '21CS53', name: 'Database Management Systems', ia1: 29, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 44, totalClasses: 48, attendancePercentage: 91.7 },
        { code: '21CS54', name: 'Theory of Computation', ia1: 24, ia2: 25, ia3: 26, maxIa: 30, classesAttended: 34, totalClasses: 46, attendancePercentage: 73.9 },
        { code: '21CS55', name: 'Software Engineering', ia1: 27, ia2: 28, ia3: 28, maxIa: 30, classesAttended: 40, totalClasses: 44, attendancePercentage: 90.9 },
      ],
    },
    {
      semester: 4,
      academicYear: '2023-2024',
      sgpa: 9.20,
      cgpa: 8.98,
      overallAttendance: 89.2,
      subjects: [
        { code: '21MAT41', name: 'Complex Analysis & Transforms', ia1: 28, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 43, totalClasses: 48, attendancePercentage: 89.6 },
        { code: '21CS42', name: 'Design & Analysis of Algorithms', ia1: 29, ia2: 30, ia3: 29, maxIa: 30, classesAttended: 42, totalClasses: 46, attendancePercentage: 91.3 },
      ],
    },
  ],
  healthLogs: [
    {
      id: 'HLOG-001',
      usn: '1RV22CS089',
      studentName: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      date: '2026-09-28',
      status: 'Resting in Health Room',
      location: 'Hostel Health Room / Sick Bay',
      symptomsOrDiagnosis: 'Acute viral fever (102°F), shivering and fatigue',
      doctorName: 'Dr. Preethi Rao (Hostel Physician)',
      prescribedMedicines: 'Paracetamol 650mg TDS, ORS Electrolytes',
      guardianIntimated: true,
      checkInTime: '2026-09-28 08:30 AM',
      recordedByWarden: 'Mr. R. K. Gowda (Warden)',
      remarks: 'Student advised complete bed rest in hostel sick bay.',
    }
  ],
  students: [
    {
      usn: '1RV22CS089',
      name: 'Aditya Sharma',
      roomNumber: 'B-304',
      hostelBlock: 'Cauvery Block B-3',
      branch: 'Computer Science & Engineering',
      year: '3rd Year',
      guardianContact: '+91 98765 01234',
      deviceModel: 'Pixel 8 Pro (Android 14)',
      activeDeviceId: 'HWID-PX8-9921',
      isInsideCampus: true,
    },
    {
      usn: '1RV22EC045',
      name: 'Rohan Mehta',
      roomNumber: 'A-102',
      hostelBlock: 'Sharavathi Block A-1',
      branch: 'Electronics & Communication',
      year: '3rd Year',
      guardianContact: '+91 98451 11223',
      deviceModel: 'iPhone 15 Pro (iOS 17)',
      activeDeviceId: 'HWID-IP15-4412',
      isInsideCampus: false,
    },
    {
      usn: '1RV21ME078',
      name: 'Vignesh Rao',
      roomNumber: 'B-110',
      hostelBlock: 'Cauvery Block B-1',
      branch: 'Mechanical Engineering',
      year: '4th Year',
      guardianContact: '+91 99002 99887',
      deviceModel: 'Samsung Galaxy S23 (Android 14)',
      activeDeviceId: 'HWID-S23-7721',
      isInsideCampus: true,
    }
  ],
  blockedStudents: [
    {
      usn: '1RV22EC045',
      name: 'Rohan Mehta',
      roomNumber: 'A-102',
      hostelBlock: 'Sharavathi Block A-1',
      branch: 'ECE',
      reason: 'Late return curfew breach (+45m past 04:30 PM cutoff)',
      blockedAt: '2026-09-28 17:15',
    }
  ],
  vehicleBookings: []
};

// Ensure data directory exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize db.json if not present
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
}

function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    let mutated = false;
    for (const key of Object.keys(initialData)) {
      if (parsed[key] === undefined || (Array.isArray(initialData[key]) && Array.isArray(parsed[key]) && parsed[key].length === 0 && initialData[key].length > 0)) {
        parsed[key] = initialData[key];
        mutated = true;
      }
    }
    if (mutated) {
      writeDb(parsed);
    }
    return parsed;
  } catch (err) {
    console.error('Error reading db.json:', err);
    return initialData;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing db.json:', err);
    return false;
  }
}

module.exports = {
  readDb,
  writeDb,
};
