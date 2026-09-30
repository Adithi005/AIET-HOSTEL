import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import {
  UserProfile,
  SemesterRecord,
  LeaveApplication,
  GrievanceTicket,
  MessDaySchedule,
  MessRating,
  StudentDocument,
  OutingApplication,
  OutingType,
  GovtHoliday,
  GateLogEntry,
  GateCheckEvent,
  StudentScanDossier,
  HealthRoomLog,
  AdminRole,
  MasterActivityItem,
  CheckInCooldownInfo,
  StudentNotification,
  VehicleType,
  VehicleDestination,
  VehicleSlot,
  VehicleBooking,
  AoPetitionType,
  AoStudentPetition,
} from '../types';
import { getLeaveEscalationInfo, buildApprovalSteps } from '../utils/escalation';
import { calculateChargedDays, checkHolidayOverlap } from '../utils/holidays';
import { getCurfewStatus, CURFEW_CONFIG } from '../utils/curfew';
import { getCutoffStatus, calculateLeaveSessionDays } from '../utils/leaveTiming';

const STORAGE_KEYS = {
  PROFILE: '@stayvya_user_profile',
  ACADEMICS: '@stayvya_academics_4years',
  LEAVES: '@stayvya_leaves',
  PUBLIC_OUTPASS: '@stayvya_public_outpass',
  GRIEVANCES: '@stayvya_grievances',
  MESS_RATINGS: '@stayvya_mess_ratings',
  DOCUMENTS: '@stayvya_documents',
  OUTINGS: '@stayvya_outings',
  GATE_LOGS: '@stayvya_gate_logs',
  HEALTH_LOGS: '@stayvya_health_logs',
  ADMIN_LEAVES: '@stayvya_admin_leaves',
  NOTIFICATIONS: '@stayvya_notifications',
  VEHICLE_BOOKINGS: '@stayvya_vehicle_bookings',
  VEHICLE_SLOTS: '@stayvya_vehicle_slots',
  BLOCKED_STUDENTS: '@stayvya_blocked_students',
  AO_PETITIONS: '@stayvya_ao_petitions',
};

// =========================================================
// INITIAL AO STUDENT PETITIONS & SPECIAL APPLICATIONS
// (Fees delay, mess bill reduction, study cert, marks card)
// =========================================================
export const INITIAL_AO_PETITIONS: AoStudentPetition[] = [
  {
    id: 'AO-PET-101',
    usn: '1RV22CS089',
    studentName: 'Adithya Shenoy',
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
    studentName: 'Adithya Shenoy',
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
    studentName: 'Adithya Shenoy',
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
    studentName: 'Adithya Shenoy',
    roomNumber: 'B-304',
    hostelBlock: 'Cauvery Block B-3',
    type: 'Marks Card / Grade Transcript',
    reason: 'Official verified 4th Semester grade transcript copy required for off-campus summer technical internship background verification.',
    requestedDate: '2026-09-27',
    purpose: 'Internship Onboarding Verification',
    targetSemester: 4,
    status: 'Pending AO Approval',
  },
];

// =========================================================
// VEHICLE SCHEDULE SLOTS & SEED BOOKINGS (Vidyagiri & Health Center)
// =========================================================
export const INITIAL_VEHICLE_SLOTS: VehicleSlot[] = [
  // Vidyagiri Campus Transit (Eeco, TT, Mini Bus, Bus)
  {
    id: 'SLOT-VID-1',
    destination: 'Vidyagiri',
    vehicleType: 'TT',
    departureTime: '08:30 AM',
    departureMinutesFromMidnight: 8 * 60 + 30,
    vehiclePlate: 'KA-19-M-3912',
    capacity: 14,
    driverName: 'Ramesh Gowda',
    driverContact: '+91 98451 23410',
    pickupPoint: 'Hostel Gate 1 Porch',
    notes: 'Morning Academic & Exam Shuttle to Vidyagiri',
  },
  {
    id: 'SLOT-VID-2',
    destination: 'Vidyagiri',
    vehicleType: 'Eeco',
    departureTime: '10:00 AM',
    departureMinutesFromMidnight: 10 * 60,
    vehiclePlate: 'KA-19-E-8401',
    capacity: 7,
    driverName: 'Shekar Poojary',
    driverContact: '+91 98860 44219',
    pickupPoint: 'Hostel Gate 1 Porch',
    notes: 'Library & Department Special Shuttle',
  },
  {
    id: 'SLOT-VID-3',
    destination: 'Vidyagiri',
    vehicleType: 'Mini Bus',
    departureTime: '01:30 PM',
    departureMinutesFromMidnight: 13 * 60 + 30,
    vehiclePlate: 'KA-19-B-7102',
    capacity: 26,
    driverName: 'Venkatesh Rao',
    driverContact: '+91 94481 99120',
    pickupPoint: 'Hostel Main Circle',
    notes: 'Afternoon Mass Transit to Vidyagiri Main Campus',
  },
  {
    id: 'SLOT-VID-4',
    destination: 'Vidyagiri',
    vehicleType: 'Bus',
    departureTime: '05:00 PM',
    departureMinutesFromMidnight: 17 * 60,
    vehiclePlate: 'KA-19-F-9944',
    capacity: 45,
    driverName: 'Anand Devadiga',
    driverContact: '+91 97410 88231',
    pickupPoint: 'Hostel Campus Ground Gate',
    notes: 'Evening Return & Campus Transfer Bus',
  },

  // Health Center / Clinic Transit (Students under Medical Care)
  {
    id: 'SLOT-HLT-1',
    destination: 'Health Center',
    vehicleType: 'Eeco',
    departureTime: '09:15 AM',
    departureMinutesFromMidnight: 9 * 60 + 15,
    vehiclePlate: 'KA-19-E-5511',
    capacity: 7,
    driverName: 'Santhosh Kulal',
    driverContact: '+91 99002 11982',
    pickupPoint: 'Hostel Health Room / Sick Bay Gate',
    notes: 'Morning Sick Bay & Physician OP Clinic Shuttle',
  },
  {
    id: 'SLOT-HLT-2',
    destination: 'Health Center',
    vehicleType: 'TT',
    departureTime: '11:45 AM',
    departureMinutesFromMidnight: 11 * 60 + 45,
    vehiclePlate: 'KA-19-M-6029',
    capacity: 14,
    driverName: 'Mohan Shetty',
    driverContact: '+91 98442 33190',
    pickupPoint: 'Hostel Health Room / Sick Bay Gate',
    notes: 'Midday Medical Review & Diagnostic Lab Visit',
  },
  {
    id: 'SLOT-HLT-3',
    destination: 'Health Center',
    vehicleType: 'Eeco',
    departureTime: '03:15 PM',
    departureMinutesFromMidnight: 15 * 60 + 15,
    vehiclePlate: 'KA-19-E-5511',
    capacity: 7,
    driverName: 'Santhosh Kulal',
    driverContact: '+91 99002 11982',
    pickupPoint: 'Hostel Health Room / Sick Bay Gate',
    notes: 'Afternoon Doctor Follow-up & Pharmacy Transit',
  },
  {
    id: 'SLOT-HLT-4',
    destination: 'Health Center',
    vehicleType: 'Mini Bus',
    departureTime: '06:30 PM',
    departureMinutesFromMidnight: 18 * 60 + 30,
    vehiclePlate: 'KA-19-B-8090',
    capacity: 26,
    driverName: 'Prashanth Nayak',
    driverContact: '+91 94811 55672',
    pickupPoint: 'Hostel Care Porch',
    notes: 'Evening Health Care Group Return Shuttle',
  },
];

export const INITIAL_VEHICLE_BOOKINGS: VehicleBooking[] = [
  // Vidyagiri bookings (Students under hostel care)
  {
    id: 'VB-101',
    bookingToken: 'VB-VID-8241',
    usn: '4AL22CS014',
    studentName: 'Chandan Kumar',
    roomNumber: 'A-201',
    contactNumber: '+91 98450 11223',
    destination: 'Vidyagiri',
    vehicleType: 'TT',
    departureTime: '08:30 AM',
    departureDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'Hostel Gate 1 Porch',
    driverName: 'Ramesh Gowda',
    driverContact: '+91 98451 23410',
    vehiclePlate: 'KA-19-M-3912',
    seatNumber: 1,
    reason: 'Main Library Reference & Project Submission',
    status: 'Confirmed',
    bookedAt: 'Today 07:15 AM',
  },
  {
    id: 'VB-102',
    bookingToken: 'VB-VID-8242',
    usn: '4AL22IS028',
    studentName: 'Sneha Hegde',
    roomNumber: 'B-108',
    contactNumber: '+91 97410 33445',
    destination: 'Vidyagiri',
    vehicleType: 'TT',
    departureTime: '08:30 AM',
    departureDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'Hostel Gate 1 Porch',
    driverName: 'Ramesh Gowda',
    driverContact: '+91 98451 23410',
    vehiclePlate: 'KA-19-M-3912',
    seatNumber: 2,
    reason: 'Campus Placement Drive & Interview',
    status: 'Confirmed',
    bookedAt: 'Today 07:22 AM',
  },
  {
    id: 'VB-103',
    bookingToken: 'VB-VID-8243',
    usn: '4AL22EC039',
    studentName: 'Rahul Nayak',
    roomNumber: 'A-315',
    contactNumber: '+91 99002 44556',
    destination: 'Vidyagiri',
    vehicleType: 'TT',
    departureTime: '08:30 AM',
    departureDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'Hostel Gate 1 Porch',
    driverName: 'Ramesh Gowda',
    driverContact: '+91 98451 23410',
    vehiclePlate: 'KA-19-M-3912',
    seatNumber: 3,
    reason: 'Vidyagiri Electronics Lab Workshop',
    status: 'Confirmed',
    bookedAt: 'Today 07:35 AM',
  },
  {
    id: 'VB-104',
    bookingToken: 'VB-VID-8301',
    usn: '4AL22ME012',
    studentName: 'Karthik Prabhu',
    roomNumber: 'C-104',
    contactNumber: '+91 98440 55667',
    destination: 'Vidyagiri',
    vehicleType: 'Mini Bus',
    departureTime: '01:30 PM',
    departureDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'Hostel Main Circle',
    driverName: 'Venkatesh Rao',
    driverContact: '+91 94481 99120',
    vehiclePlate: 'KA-19-B-7102',
    seatNumber: 5,
    reason: 'Sports Complex Training & VTU Athletic Meet',
    status: 'Confirmed',
    bookedAt: 'Today 10:10 AM',
  },
  // Health Center bookings (Students under hostel medical care)
  {
    id: 'VB-201',
    bookingToken: 'VB-HLT-9101',
    usn: '4AL22CS064',
    studentName: 'Priya Dsouza',
    roomNumber: 'B-214',
    contactNumber: '+91 98451 77889',
    destination: 'Health Center',
    vehicleType: 'Eeco',
    departureTime: '09:15 AM',
    departureDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'Hostel Health Room / Sick Bay Gate',
    driverName: 'Santhosh Kulal',
    driverContact: '+91 99002 11982',
    vehiclePlate: 'KA-19-E-5511',
    seatNumber: 1,
    reason: 'High Fever & Physician Consultation',
    status: 'Confirmed',
    bookedAt: 'Today 08:10 AM',
    isHealthCareEmergency: true,
  },
  {
    id: 'VB-202',
    bookingToken: 'VB-HLT-9102',
    usn: '4AL22CV019',
    studentName: 'Manoj Kumar',
    roomNumber: 'C-302',
    contactNumber: '+91 99881 22334',
    destination: 'Health Center',
    vehicleType: 'Eeco',
    departureTime: '09:15 AM',
    departureDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'Hostel Health Room / Sick Bay Gate',
    driverName: 'Santhosh Kulal',
    driverContact: '+91 99002 11982',
    vehiclePlate: 'KA-19-E-5511',
    seatNumber: 2,
    reason: 'Sprained Ankle & X-Ray checkup',
    status: 'Confirmed',
    bookedAt: 'Today 08:25 AM',
    isHealthCareEmergency: true,
  },
  {
    id: 'VB-203',
    bookingToken: 'VB-HLT-9110',
    usn: '4AL22AI031',
    studentName: 'Ananya Sharma',
    roomNumber: 'B-405',
    contactNumber: '+91 97400 88990',
    destination: 'Health Center',
    vehicleType: 'TT',
    departureTime: '11:45 AM',
    departureDate: new Date().toISOString().split('T')[0],
    pickupPoint: 'Hostel Health Room / Sick Bay Gate',
    driverName: 'Mohan Shetty',
    driverContact: '+91 98442 33190',
    vehiclePlate: 'KA-19-M-6029',
    seatNumber: 1,
    reason: 'Allergic Reaction & Antihistamine Prescription',
    status: 'Confirmed',
    bookedAt: 'Today 09:40 AM',
  },
];

// Seed 4-Year Academic History (Sem 1 through Sem 8)
export const INITIAL_4YEAR_ACADEMICS: SemesterRecord[] = [
  {
    semester: 1,
    academicYear: '2022-2023',
    sgpa: 8.92,
    cgpa: 8.92,
    overallAttendance: 91.5,
    subjects: [
      { code: '22MAT11', name: 'Calculus & Linear Algebra', ia1: 27, ia2: 28, ia3: 29, maxIa: 30, classesAttended: 44, totalClasses: 48, attendancePercentage: 91.6 },
      { code: '22PHY12', name: 'Engineering Physics', ia1: 26, ia2: 27, ia3: 28, maxIa: 30, classesAttended: 40, totalClasses: 44, attendancePercentage: 90.9 },
      { code: '22ELE13', name: 'Basic Electrical Engineering', ia1: 25, ia2: 28, ia3: 27, maxIa: 30, classesAttended: 42, totalClasses: 46, attendancePercentage: 91.3 },
      { code: '22CIV14', name: 'Elements of Civil Engg', ia1: 28, ia2: 29, ia3: 29, maxIa: 30, classesAttended: 43, totalClasses: 46, attendancePercentage: 93.4 },
      { code: '22EGD15', name: 'Engineering Graphics & Design', ia1: 29, ia2: 30, ia3: 28, maxIa: 30, classesAttended: 38, totalClasses: 42, attendancePercentage: 90.4 },
    ],
  },
  {
    semester: 2,
    academicYear: '2022-2023',
    sgpa: 9.15,
    cgpa: 9.03,
    overallAttendance: 93.0,
    subjects: [
      { code: '22MAT21', name: 'Advanced Calculus & Numerical Methods', ia1: 28, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 45, totalClasses: 48, attendancePercentage: 93.7 },
      { code: '22CHE22', name: 'Engineering Chemistry', ia1: 27, ia2: 28, ia3: 29, maxIa: 30, classesAttended: 41, totalClasses: 44, attendancePercentage: 93.1 },
      { code: '22CPS23', name: 'C Programming for Problem Solving', ia1: 29, ia2: 30, ia3: 30, maxIa: 30, classesAttended: 44, totalClasses: 46, attendancePercentage: 95.6 },
      { code: '22ELN24', name: 'Basic Electronics', ia1: 26, ia2: 27, ia3: 28, maxIa: 30, classesAttended: 38, totalClasses: 42, attendancePercentage: 90.4 },
      { code: '22ENG25', name: 'Technical English Communication', ia1: 28, ia2: 29, ia3: 29, maxIa: 30, classesAttended: 34, totalClasses: 36, attendancePercentage: 94.4 },
    ],
  },
  {
    semester: 3,
    academicYear: '2023-2024',
    sgpa: 8.85,
    cgpa: 8.97,
    overallAttendance: 88.4,
    subjects: [
      { code: '22CS31', name: 'Discrete Mathematical Structures', ia1: 26, ia2: 27, ia3: 28, maxIa: 30, classesAttended: 41, totalClasses: 48, attendancePercentage: 85.4 },
      { code: '22CS32', name: 'Data Structures & Algorithms', ia1: 29, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 46, totalClasses: 50, attendancePercentage: 92.0 },
      { code: '22CS33', name: 'Analog & Digital Electronics', ia1: 25, ia2: 26, ia3: 27, maxIa: 30, classesAttended: 38, totalClasses: 44, attendancePercentage: 86.3 },
      { code: '22CS34', name: 'Computer Organization & Architecture', ia1: 27, ia2: 28, ia3: 28, maxIa: 30, classesAttended: 40, totalClasses: 46, attendancePercentage: 86.9 },
      { code: '22CSL35', name: 'Data Structures Lab', ia1: 30, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 30, totalClasses: 32, attendancePercentage: 93.7 },
    ],
  },
  {
    semester: 4,
    academicYear: '2023-2024',
    sgpa: 9.20,
    cgpa: 9.02,
    overallAttendance: 89.2,
    subjects: [
      { code: '22CS41', name: 'Mathematical Foundations for Computing', ia1: 28, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 42, totalClasses: 46, attendancePercentage: 91.3 },
      { code: '22CS42', name: 'Design & Analysis of Algorithms', ia1: 29, ia2: 30, ia3: 29, maxIa: 30, classesAttended: 45, totalClasses: 48, attendancePercentage: 93.7 },
      { code: '22CS43', name: 'Operating Systems', ia1: 27, ia2: 28, ia3: 29, maxIa: 30, classesAttended: 41, totalClasses: 48, attendancePercentage: 85.4 },
      { code: '22CS44', name: 'Microcontroller & Embedded Systems', ia1: 26, ia2: 28, ia3: 27, maxIa: 30, classesAttended: 39, totalClasses: 45, attendancePercentage: 86.6 },
      { code: '22CSL45', name: 'Design & Analysis of Algorithms Lab', ia1: 30, ia2: 30, ia3: 30, maxIa: 30, classesAttended: 32, totalClasses: 32, attendancePercentage: 100 },
    ],
  },
  {
    semester: 5,
    academicYear: '2024-2025',
    sgpa: 9.10,
    cgpa: 9.04,
    overallAttendance: 87.2,
    subjects: [
      { code: '22CS51', name: 'Computer Networks', ia1: 27, ia2: 28, ia3: 29, maxIa: 30, classesAttended: 42, totalClasses: 48, attendancePercentage: 87.5 },
      { code: '22CS52', name: 'Database Management Systems', ia1: 25, ia2: 26, ia3: 28, maxIa: 30, classesAttended: 39, totalClasses: 46, attendancePercentage: 84.8 },
      { code: '22CS53', name: 'Automata Theory & Computability', ia1: 24, ia2: 26, ia3: 27, maxIa: 30, classesAttended: 38, totalClasses: 46, attendancePercentage: 82.6 },
      { code: '22CS54', name: 'Artificial Intelligence & Machine Learning', ia1: 29, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 44, totalClasses: 48, attendancePercentage: 91.6 },
      { code: '22CS55', name: 'Cloud Computing & DevOps', ia1: 28, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 40, totalClasses: 44, attendancePercentage: 90.9 },
      { code: '22CSL56', name: 'DBMS & Network Lab', ia1: 30, ia2: 29, ia3: 30, maxIa: 30, classesAttended: 28, totalClasses: 30, attendancePercentage: 93.3 },
    ],
  },
  {
    semester: 6,
    academicYear: '2024-2025 (Upcoming)',
    sgpa: 0,
    cgpa: 9.04,
    overallAttendance: 0,
    subjects: [
      { code: '22CS61', name: 'Software Engineering & Agile', ia1: 0, ia2: 0, ia3: 0, maxIa: 30, classesAttended: 0, totalClasses: 45, attendancePercentage: 0 },
      { code: '22CS62', name: 'Cryptography & Network Security', ia1: 0, ia2: 0, ia3: 0, maxIa: 30, classesAttended: 0, totalClasses: 45, attendancePercentage: 0 },
      { code: '22CS63', name: 'Big Data Analytics', ia1: 0, ia2: 0, ia3: 0, maxIa: 30, classesAttended: 0, totalClasses: 45, attendancePercentage: 0 },
      { code: '22CS64', name: 'Elective 1: Mobile App Dev', ia1: 0, ia2: 0, ia3: 0, maxIa: 30, classesAttended: 0, totalClasses: 45, attendancePercentage: 0 },
    ],
  },
  {
    semester: 7,
    academicYear: '2025-2026 (Upcoming)',
    sgpa: 0,
    cgpa: 9.04,
    overallAttendance: 0,
    subjects: [
      { code: '22CS71', name: 'Deep Learning & Neural Networks', ia1: 0, ia2: 0, ia3: 0, maxIa: 30, classesAttended: 0, totalClasses: 45, attendancePercentage: 0 },
      { code: '22CS72', name: 'Internet of Things (IoT)', ia1: 0, ia2: 0, ia3: 0, maxIa: 30, classesAttended: 0, totalClasses: 45, attendancePercentage: 0 },
      { code: '22CSP73', name: 'Major Project Phase 1', ia1: 0, ia2: 0, ia3: 0, maxIa: 50, classesAttended: 0, totalClasses: 30, attendancePercentage: 0 },
    ],
  },
  {
    semester: 8,
    academicYear: '2025-2026 (Upcoming)',
    sgpa: 0,
    cgpa: 9.04,
    overallAttendance: 0,
    subjects: [
      { code: '22INT81', name: 'Full Semester Industry Internship', ia1: 0, ia2: 0, ia3: 0, maxIa: 100, classesAttended: 0, totalClasses: 100, attendancePercentage: 0 },
      { code: '22CSP82', name: 'Major Project Phase 2 & Viva', ia1: 0, ia2: 0, ia3: 0, maxIa: 100, classesAttended: 0, totalClasses: 50, attendancePercentage: 0 },
    ],
  },
];

export const INITIAL_USER_PROFILE: UserProfile = {
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
  leavesCount: 4, // 4 leaves taken -> next leave is #5 (Warden tier)
};

export const INITIAL_MY_LEAVES: LeaveApplication[] = [
  {
    id: 'LV-1004',
    registrationId: 'REG-LV-1RV22CS089-1004',
    barcode: '*REG-LV-1RV22CS089-1004*',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    leaveType: 'Home Visit',
    startDate: '2024-10-18',
    endDate: '2024-10-21',
    totalDays: 3,
    reason: 'Diwali festival family gathering',
    appliedDate: '2024-10-14',
    status: 'Approved',
    gateToken: 'TK-84920',
    tokenGeneratedAt: '2024-10-14 16:30',
    checkOutTime: '04:30 PM (2024-10-18)',
    checkOutGate: 'Campus Main Gate 2',
    checkOutGuard: 'Head Guard Somanna',
    checkInTime: '06:00 PM (2024-10-21)',
    checkInGate: 'Campus Main Gate 2',
    checkInGuard: 'Head Guard Somanna',
    cumulativeLeaveCountAtApplication: 3,
    requiredApprover: 'Warden',
    isGovtHoliday: true,
    holidayName: 'Diwali / Deepavali Holidays',
    chargedDays: 0,
    isAutoApproved: true,
    movementHistory: [
      {
        id: 'EVT-LV-1004-1',
        action: 'Check Out',
        timestamp: '2024-10-18 04:30 PM',
        gate: 'Campus Main Gate 2',
        guardName: 'Head Guard Somanna',
        remarks: 'Home Visit leave gate token verified. Departure recorded.',
        barcode: '*REG-LV-1RV22CS089-1004*',
        usn: '1RV22CS089',
      },
      {
        id: 'EVT-LV-1004-2',
        action: 'Check In',
        timestamp: '2024-10-21 06:00 PM',
        gate: 'Campus Main Gate 2',
        guardName: 'Head Guard Somanna',
        remarks: 'Return barcode scanned. Hosteller checked in from Diwali leave.',
        barcode: '*REG-LV-1RV22CS089-1004*',
        usn: '1RV22CS089',
      },
    ],
    approvalSteps: [
      { role: 'Warden', status: 'Approved', approverName: 'Mr. R. K. Gowda', timestamp: '2024-10-14 16:30', remarks: 'Parent call verified. Granted.' },
    ],
  },
  {
    id: 'LV-1003',
    registrationId: 'REG-LV-1RV22CS089-1003',
    barcode: '*REG-LV-1RV22CS089-1003*',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    leaveType: 'Academic / Hackathon',
    startDate: '2024-09-06',
    endDate: '2024-09-08',
    totalDays: 2,
    reason: 'Smart India Hackathon Regional Finals at IIT Madras',
    appliedDate: '2024-09-02',
    status: 'Approved',
    cumulativeLeaveCountAtApplication: 2,
    requiredApprover: 'Warden',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', approverName: 'Mr. R. K. Gowda', timestamp: '2024-09-03 10:15', remarks: 'Official college team. All the best!' },
    ],
  },
  {
    id: 'LV-1002',
    registrationId: 'REG-LV-1RV22CS089-1002',
    barcode: '*REG-LV-1RV22CS089-1002*',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    leaveType: 'Medical',
    startDate: '2024-08-12',
    endDate: '2024-08-14',
    totalDays: 2,
    reason: 'Severe viral fever and clinical consultation',
    appliedDate: '2024-08-11',
    status: 'Approved',
    cumulativeLeaveCountAtApplication: 1,
    requiredApprover: 'Warden',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', approverName: 'Mr. R. K. Gowda', timestamp: '2024-08-11 18:20', remarks: 'Medical rest advised by college physician.' },
    ],
  },
];

// PUBLIC OUT-PASS ROSTER: ONLY USN is disclosed!
// Names, contact numbers, and emails are strictly withheld to preserve student privacy.
export const INITIAL_PUBLIC_OUTPASS: Array<{
  id: string;
  usn: string; // The ONLY identity disclosed
  hostelBlock: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Approved' | 'Under Review' | 'Gate Exited';
}> = [
  { id: 'OUT-991', usn: '1RV22CS089', hostelBlock: 'Block B-3', leaveType: 'Home Visit', startDate: '2024-10-18', endDate: '2024-10-21', days: 3, status: 'Approved' },
  { id: 'OUT-992', usn: '1RV22EC045', hostelBlock: 'Block A-1', leaveType: 'Medical', startDate: '2024-10-19', endDate: '2024-10-22', days: 3, status: 'Approved' },
  { id: 'OUT-993', usn: '1RV23IS012', hostelBlock: 'Block C-2', leaveType: 'Hackathon', startDate: '2024-10-20', endDate: '2024-10-23', days: 3, status: 'Under Review' },
  { id: 'OUT-994', usn: '1RV21ME078', hostelBlock: 'Block B-1', leaveType: 'Home Visit', startDate: '2024-10-18', endDate: '2024-10-24', days: 6, status: 'Approved' },
  { id: 'OUT-995', usn: '1RV22AI034', hostelBlock: 'Block A-2', leaveType: 'Emergency', startDate: '2024-10-19', endDate: '2024-10-20', days: 1, status: 'Gate Exited' },
  { id: 'OUT-996', usn: '1RV23CS110', hostelBlock: 'Block B-3', leaveType: 'Home Visit', startDate: '2024-10-20', endDate: '2024-10-25', days: 5, status: 'Under Review' },
];

export const INITIAL_OUTINGS: OutingApplication[] = [
  {
    id: 'OUT-3013',
    registrationId: 'REG-OUT-1RV22CS089-3013',
    barcode: '*REG-OUT-1RV22CS089-3013*',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    hostelBlock: 'Cauvery Block B-3',
    outingType: 'Evening Dinner',
    outDate: '2024-10-25',
    outTime: '09:00 AM',
    expectedInTime: '04:00 PM',
    checkOutTime: '09:30 AM',
    checkOutGate: 'Campus Main Gate 1',
    checkOutGuard: 'Security Guard Ramu',
    destination: 'Koramangala 5th Block',
    purpose: 'Team project dinner and technical discussion',
    contactNumber: '+91 98765 43210',
    emergencyContact: '+91 98765 01234',
    appliedAt: '2024-10-25 08:40',
    status: 'Exited Gate',
    outpassToken: 'OP-59821',
    qrCodeValue: 'AIETNEST-OP-59821-1RV22CS089',
    gateSecurityRemark: 'Gate exit recorded at 09:30 AM by Guard Ramu. Must return before 04:00 PM curfew.',
    movementHistory: [
      {
        id: 'EVT-OUT-3013-1',
        action: 'Check Out',
        timestamp: '2024-10-25 09:30 AM',
        gate: 'Campus Main Gate 1',
        guardName: 'Security Guard Ramu',
        remarks: 'Digital Outpass barcode scanned. Exited campus.',
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
    outingType: 'Local City Outing',
    outDate: '2024-10-24',
    outTime: '09:00 AM',
    expectedInTime: '04:00 PM',
    checkOutTime: '09:15 AM',
    checkOutGate: 'Campus Main Gate 1',
    checkOutGuard: 'Security Guard Ramu',
    checkInTime: '03:45 PM',
    checkInGate: 'Campus Main Gate 1',
    checkInGuard: 'Security Guard Ramu',
    actualInTime: '03:45 PM',
    destination: 'Jayanagar 4th Block Shopping Complex',
    purpose: 'Purchased academic textbooks and stationery supplies',
    contactNumber: '+91 98765 43210',
    emergencyContact: '+91 98765 01234',
    appliedAt: '2024-10-24 08:30',
    status: 'Returned & Closed',
    outpassToken: 'OP-44120',
    qrCodeValue: 'AIETNEST-OP-44120-1RV22CS089',
    gateSecurityRemark: 'Gate entry verified at 8:15 PM by Guard Ramu',
    movementHistory: [
      {
        id: 'EVT-OUT-3012-1',
        action: 'Check Out',
        timestamp: '2024-10-24 04:30 PM',
        gate: 'Campus Main Gate 1',
        guardName: 'Security Guard Ramu',
        remarks: 'Digital Outpass barcode scanned. Exited campus.',
        barcode: '*REG-OUT-1RV22CS089-3012*',
        usn: '1RV22CS089',
      },
      {
        id: 'EVT-OUT-3012-2',
        action: 'Check In',
        timestamp: '2024-10-24 08:15 PM',
        gate: 'Campus Main Gate 1',
        guardName: 'Security Guard Ramu',
        remarks: 'Barcode verified at scanner. Returned safely before curfew.',
        barcode: '*REG-OUT-1RV22CS089-3012*',
        usn: '1RV22CS089',
      },
    ],
  },
];

export const INITIAL_GATE_LOGS: GateLogEntry[] = [
  {
    id: 'GLOG-505',
    registrationId: 'REG-OUT-3019',
    barcode: '*REG-OUT-3019*',
    usn: '1RV22EC045',
    studentName: 'Rohan Mehta',
    roomNumber: 'A-102',
    type: 'Outing',
    destination: 'City Center Mall',
    action: 'Check In',
    timestamp: '2026-09-28 17:15',
    station: 'Campus Main Gate 1',
    guardName: 'Security Guard Ramu',
    isLate: true,
    isLateReturn: true,
    curfewTime: '04:30 PM',
    status: 'Late Return (Curfew Breached)',
    remarks: 'Curfew Breached: Returned at 05:15 PM (+45m after 04:30 PM cutoff). Outing locked.',
  },
  {
    id: 'GLOG-504',
    registrationId: 'REG-OUT-3018',
    barcode: '*REG-OUT-3018*',
    usn: '1RV21ME078',
    studentName: 'Vignesh Rao',
    roomNumber: 'B-110',
    type: 'Outing',
    destination: 'Town Market & Book Depot',
    action: 'Check In',
    timestamp: '2026-09-27 17:40',
    station: 'Campus Main Gate 1',
    guardName: 'Security Guard Ramu',
    isLate: true,
    isLateReturn: true,
    curfewTime: '04:30 PM',
    status: 'Late Return (Curfew Breached)',
    remarks: 'Curfew Breached: Returned at 05:40 PM (+70m after 04:30 PM cutoff). Outing locked.',
  },
  {
    id: 'GLOG-503',
    registrationId: 'REG-OUT-3012',
    barcode: '*REG-OUT-3012*',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    type: 'Outing',
    destination: 'Jayanagar 4th Block Shopping Complex',
    action: 'Check In',
    timestamp: '2024-10-24 20:15',
    station: 'Campus Main Gate 1',
    guardName: 'Security Guard Ramu',
    remarks: 'Barcode verified at scanner. Returned on time.',
  },
  {
    id: 'GLOG-502',
    registrationId: 'REG-OUT-3012',
    barcode: '*REG-OUT-3012*',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    type: 'Outing',
    destination: 'Jayanagar 4th Block Shopping Complex',
    action: 'Check Out',
    timestamp: '2024-10-24 16:30',
    station: 'Campus Main Gate 1',
    guardName: 'Security Guard Ramu',
    remarks: 'Outpass barcode scanned. Departure logged.',
  },
  {
    id: 'GLOG-501',
    registrationId: 'REG-LV-1004',
    barcode: '*REG-LV-1004*',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    type: 'Leave',
    destination: 'Home (Diwali Holidays)',
    action: 'Check Out',
    timestamp: '2024-10-18 17:30',
    station: 'Campus Main Gate 2',
    guardName: 'Guard Somanna',
    remarks: 'Home visit barcode scanned. Outpass token TK-84920 verified.',
  },
  {
    id: 'GLOG-500',
    registrationId: 'REG-LV-2001',
    barcode: '*REG-LV-2001*',
    usn: '1RV22EC045',
    studentName: 'Rohan Mehta',
    roomNumber: 'A-102',
    type: 'Leave',
    destination: 'Apollo Clinic Bangalore',
    action: 'Check Out',
    timestamp: '2024-10-19 09:15',
    station: 'Campus Main Gate 2',
    guardName: 'Guard Somanna',
    remarks: 'Medical leave barcode scanned. Gate exit confirmed.',
  },
];

export const INITIAL_NOTIFICATIONS: StudentNotification[] = [
  {
    id: 'NOTIF-101',
    usn: '1RV22CS089',
    title: '⏰ Outing Curfew Timings Notice',
    message: 'Institutional Rules: Regular Outings are permitted from 09:00 AM to 04:00 PM. Grace alert window ends at 04:30 PM. Returning after 04:30 PM will suspend subsequent outings until SWO clearance.',
    timestamp: 'Today, 09:00 AM',
    type: 'curfew_warning',
    severity: 'info',
    read: false,
  },
  {
    id: 'NOTIF-102',
    usn: '1RV22CS089',
    title: '🏛️ Govt Holiday Section Active',
    message: 'Dedicated Govt Holiday Pass section is available! Apply for Holiday Outpass (09:00 AM – 02:00 PM) or instant auto-approved Holiday Homepass with 0 quota deduction.',
    timestamp: 'Yesterday, 06:00 PM',
    type: 'holiday_pass',
    severity: 'success',
    read: true,
  },
];

export const INITIAL_GRIEVANCES: GrievanceTicket[] = [
  {
    id: 'GRV-201',
    usn: '1RV22CS089',
    roomNumber: 'B-304',
    category: 'Cleanliness & Room',
    description: 'Corridor and room deep cleaning requested. Balcony drain dust clogged after monsoon rain.',
    urgency: 'Medium',
    status: 'In Progress',
    createdAt: '2024-10-16 09:30',
    photoUri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80',
    adminRemark: 'Housekeeping staff (Ramesh) assigned for 2:30 PM slot.',
  },
  {
    id: 'GRV-202',
    usn: '1RV22CS089',
    roomNumber: 'B-304',
    category: 'Electrical & Fan',
    description: 'Ceiling fan regulator speed toggle is loose and vibrating at speed 4.',
    urgency: 'Low',
    status: 'Resolved',
    createdAt: '2024-09-28 14:10',
    adminRemark: 'Regulator replaced by electrician Manjunath.',
  },
  {
    id: 'GRV-203',
    usn: '1RV22EC045',
    roomNumber: 'A-102',
    category: 'Plumbing & Water',
    description: 'Main washbasin pipe valve is leaking into the floor drain.',
    urgency: 'High',
    status: 'Submitted',
    createdAt: '2024-10-18 11:20',
    photoUri: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&auto=format&fit=crop&q=80',
    adminRemark: 'Awaiting plumber assignment.',
  },
  {
    id: 'GRV-204',
    usn: '1RV23IS012',
    roomNumber: 'C-205',
    category: 'Wi-Fi / LAN',
    description: 'Wing C Wi-Fi access point frequent packet drop during evening hours.',
    urgency: 'Medium',
    status: 'In Progress',
    createdAt: '2024-10-17 19:45',
    adminRemark: 'IT admin investigating router firmware.',
  },
  {
    id: 'GRV-205',
    usn: '1RV21ME078',
    roomNumber: 'B-110',
    category: 'Cleanliness & Room',
    description: 'Staircase garbage bin full and needs daily clearance.',
    urgency: 'Medium',
    status: 'Submitted',
    createdAt: '2024-10-18 07:15',
    adminRemark: 'Sanitation lead notified.',
  },
];

export const INITIAL_MESS_RATINGS: MessRating[] = [
  {
    id: 'MESS-101',
    usn: '1RV22CS089',
    studentName: 'Aditya Sharma',
    roomNumber: 'B-304',
    mealType: 'Lunch',
    rating: 2,
    feedback: 'Paneer curry was undercooked and chapati served cold. Quality needs urgent check.',
    photoUri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-29',
    createdAt: '2026-09-29 13:45',
  },
  {
    id: 'MESS-102',
    usn: '1RV22EC032',
    studentName: 'Pooja Hegde',
    roomNumber: 'C-112',
    mealType: 'Breakfast',
    rating: 5,
    feedback: 'Idli and Sambar were hot, fresh, and delicious today! Chutney was very good.',
    photoUri: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-29',
    createdAt: '2026-09-29 08:30',
  },
  {
    id: 'MESS-103',
    usn: '1RV22ME045',
    studentName: 'Karthik Rao',
    roomNumber: 'A-210',
    mealType: 'Dinner',
    rating: 3,
    feedback: 'Dal tadka lacked salt and rice was slightly overboiled. Vegetables were good.',
    photoUri: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80',
    date: '2026-09-28',
    createdAt: '2026-09-28 20:15',
  },
];

export const WEEKLY_MESS_SCHEDULE: MessDaySchedule[] = [
  {
    day: 'Monday',
    meals: [
      { type: 'Breakfast', timing: '7:30 AM – 9:30 AM', items: ['Idli & Crispy Vada', 'Coconut Chutney', 'Hot Sambar', 'Tea / Fresh Coffee'] },
      { type: 'Lunch', timing: '12:30 PM – 2:30 PM', items: ['Steamed Rice', 'Dal Makhani', 'Aloo Gobi Dry', 'Phulkas (3)', 'Curd', 'Papad & Salad'] },
      { type: 'Evening Snacks', timing: '5:00 PM – 6:15 PM', items: ['Onion Pakoda', 'Green Mint Chutney', 'Filter Coffee / Tea'] },
      { type: 'Dinner', timing: '7:30 PM – 9:30 PM', items: ['Jeera Rice', 'Paneer Butter Masala (Special)', 'Tandoori Roti', 'Gulab Jamun (1)', 'Warm Milk'], isSpecial: true },
    ],
  },
  {
    day: 'Tuesday',
    meals: [
      { type: 'Breakfast', timing: '7:30 AM – 9:30 AM', items: ['Poha with Sev', 'Kadhi', 'Boiled Eggs / Sprouts', 'Tea / Coffee'] },
      { type: 'Lunch', timing: '12:30 PM – 2:30 PM', items: ['Rice', 'Rasam', 'Chole Masala', 'Bhature / Poori', 'Boondi Raita'] },
      { type: 'Evening Snacks', timing: '5:00 PM – 6:15 PM', items: ['Samosa (1)', 'Tamarind Sweet Chutney', 'Masala Tea'] },
      { type: 'Dinner', timing: '7:30 PM – 9:30 PM', items: ['South Indian Thali', 'Mix Veg Kurma', 'Chapathi', 'Curd Rice', 'Semiyan Kheer'] },
    ],
  },
  {
    day: 'Wednesday',
    meals: [
      { type: 'Breakfast', timing: '7:30 AM – 9:30 AM', items: ['Masala Dosa', 'Potato Bhaji', 'Red Chutney & Sambar', 'Filter Coffee'] },
      { type: 'Lunch', timing: '12:30 PM – 2:30 PM', items: ['Veg Pulao', 'Kadai Veg Gravy', 'Dal Tadka', 'Roti', 'Fruit Salad'] },
      { type: 'Evening Snacks', timing: '5:00 PM – 6:15 PM', items: ['Veg Puff', 'Tomato Sauce', 'Tea / Lemon Juice'] },
      { type: 'Dinner', timing: '7:30 PM – 9:30 PM', items: ['Dum Biryani (Veg/Chicken Option)', 'Mirchi Ka Salan', 'Onion Raita', 'Ice Cream'], isSpecial: true },
    ],
  },
  {
    day: 'Thursday',
    meals: [
      { type: 'Breakfast', timing: '7:30 AM – 9:30 AM', items: ['Aloo Paratha with Butter', 'Plain Curd', 'Mango Pickle', 'Tea / Milk'] },
      { type: 'Lunch', timing: '12:30 PM – 2:30 PM', items: ['White Rice', 'Tomato Rasam', 'Bhindi Masala', 'Yellow Dal', 'Fresh Salad'] },
      { type: 'Evening Snacks', timing: '5:00 PM – 6:15 PM', items: ['Bhel Puri / Sev Puri', 'Masala Chai'] },
      { type: 'Dinner', timing: '7:30 PM – 9:30 PM', items: ['Methi Paratha', 'Matar Paneer', 'Moong Dal Khichdi', 'Papad', 'Cut Fruits'] },
    ],
  },
  {
    day: 'Friday',
    meals: [
      { type: 'Breakfast', timing: '7:30 AM – 9:30 AM', items: ['Rava Upma with Kesari Bath (Chow Chow Bath)', 'Coconut Chutney', 'Filter Coffee'] },
      { type: 'Lunch', timing: '12:30 PM – 2:30 PM', items: ['Rajma Chawal', 'Butter Roti', 'Crispy Papad', 'Cucumber Raita', 'Sweet Pickle'] },
      { type: 'Evening Snacks', timing: '5:00 PM – 6:15 PM', items: ['Bread Pakoda', 'Mint Chutney', 'Tea / Hot Cocoa'] },
      { type: 'Dinner', timing: '7:30 PM – 9:30 PM', items: ['Veg Fried Rice', 'Manchurian Gravy', 'Spring Rolls', 'Sweet Corn Soup'], isSpecial: true },
    ],
  },
  {
    day: 'Saturday',
    meals: [
      { type: 'Breakfast', timing: '7:30 AM – 9:30 AM', items: ['Uttapam with Onion & Tomato', 'Sambar', 'Groundnut Chutney', 'Coffee'] },
      { type: 'Lunch', timing: '12:30 PM – 2:30 PM', items: ['Lemon Rice', 'Curd Rice', 'Aloo Fry', 'Papad', 'Pickle'] },
      { type: 'Evening Snacks', timing: '5:00 PM – 6:15 PM', items: ['Sweet Corn Chaat', 'Hot Tea / Milk'] },
      { type: 'Dinner', timing: '7:30 PM – 9:30 PM', items: ['Pav Bhaji (Butter Pav)', 'Chopped Onions & Lemon', 'Jeera Pulao', 'Kheer'], isSpecial: true },
    ],
  },
  {
    day: 'Sunday',
    meals: [
      { type: 'Breakfast', timing: '8:00 AM – 10:00 AM', items: ['Poori with Aloo Sagu', 'Halwa (Sheera)', 'Tea / Fresh Filter Coffee'] },
      { type: 'Lunch', timing: '12:30 PM – 3:00 PM', items: ['Special Sunday Feast', 'Hyderabadi Veg Biryani', 'Paneer Tikka Masala', 'Butter Naan', 'Rasgulla (2)'], isSpecial: true },
      { type: 'Evening Snacks', timing: '5:00 PM – 6:15 PM', items: ['Biscuits & Cookies', 'Masala Tea / Coffee'] },
      { type: 'Dinner', timing: '7:30 PM – 9:30 PM', items: ['Light Dal Khichdi', 'Kadai Paneer', 'Phulkas', 'Warm Turmeric Milk'] },
    ],
  },
];

export const INITIAL_DOCUMENTS: StudentDocument[] = [
  {
    id: 'DOC-01',
    title: 'Semester 4 Official Grade Card',
    category: 'Marks Card',
    semester: 4,
    uploadDate: '2024-07-15',
    fileUri: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&auto=format&fit=crop&q=80',
    fileName: 'Sem4_SGPA_9.20_Official.pdf',
  },
  {
    id: 'DOC-02',
    title: 'RVCE College Student Identity Card',
    category: 'College ID',
    uploadDate: '2022-09-01',
    fileUri: 'https://images.unsplash.com/photo-1578852612716-854e527abf50?w=600&auto=format&fit=crop&q=80',
    fileName: 'RVCE_Student_ID_1RV22CS089.png',
  },
  {
    id: 'DOC-03',
    title: 'Hostel Room Allotment Letter (Cauvery Block)',
    category: 'Hostel Pass',
    uploadDate: '2024-08-01',
    fileUri: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
    fileName: 'CauveryBlock_B304_Allotment.pdf',
  },
];

export const INITIAL_HEALTH_LOGS: HealthRoomLog[] = [
  {
    id: 'HLOG-001',
    usn: '1RV22CS089',
    studentName: 'Adithya Shenoy',
    roomNumber: 'B-304',
    hostelBlock: 'Cauvery Block B-3',
    date: '2024-10-24',
    status: 'Resting in Health Room',
    location: 'Hostel Health Room / Sick Bay',
    symptomsOrDiagnosis: 'Acute viral fever (102°F), shivering and fatigue',
    doctorName: 'Dr. Preethi Rao (Hostel Physician)',
    prescribedMedicines: 'Paracetamol 650mg TDS, ORS Electrolytes, Pantoprazole 40mg',
    guardianIntimated: true,
    checkInTime: '2024-10-24 08:30 AM',
    recordedByWarden: 'Mr. R. K. Gowda (Warden)',
    remarks: 'Student advised complete bed rest in hostel sick bay. Not attending college lectures today.',
  },
  {
    id: 'HLOG-002',
    usn: '1RV22AI034',
    studentName: 'Priya Nair',
    roomNumber: 'A-212',
    hostelBlock: 'Sharavathi Block A-2',
    date: '2024-10-23',
    status: 'Referred to Hospital',
    location: 'Hospital (City / Multispeciality)',
    hospitalName: 'Apollo Speciality Hospital, Jayanagar',
    symptomsOrDiagnosis: 'Right ankle hairline fracture and severe ligament sprain',
    doctorName: 'Dr. Arvind Shenoy (Orthopedic Surgeon)',
    prescribedMedicines: 'Anti-inflammatory painkillers, Calcium supplements, Plaster cast support',
    guardianIntimated: true,
    checkInTime: '2024-10-23 04:15 PM',
    recordedByWarden: 'Mrs. Jayashree (Warden)',
    remarks: 'Shifted via college ambulance. Parent arrived at emergency ward. Condition stabilized.',
  },
  {
    id: 'HLOG-003',
    usn: '1RV21ME078',
    studentName: 'Vignesh Rao',
    roomNumber: 'B-110',
    hostelBlock: 'Krishna Block B-1',
    date: '2024-10-20',
    status: 'Discharged / Recovered',
    location: 'Hostel Health Room / Sick Bay',
    symptomsOrDiagnosis: 'Gastroenteritis, acute stomach dehydration and weakness',
    doctorName: 'Dr. Preethi Rao (Hostel Physician)',
    prescribedMedicines: 'Norflox-TZ, Oral Rehydration Salt sachets, Sporlac probiotics',
    guardianIntimated: true,
    checkInTime: '2024-10-20 09:00 AM',
    checkOutTime: '2024-10-21 06:00 PM',
    recordedByWarden: 'Mr. R. K. Gowda (Warden)',
    remarks: 'Full recovery verified by medical officer. Cleared to resume academic activities.',
  },
];

export const SEED_ADMIN_LEAVES: LeaveApplication[] = [
  // 1-5 Days Leaves (Warden Sanction Scope)
  {
    id: 'LV-2001',
    registrationId: 'REG-LV-2001',
    barcode: '*REG-LV-2001*',
    usn: '1RV22EC045',
    studentName: 'Rohan Mehta',
    roomNumber: 'A-102',
    leaveType: 'Medical',
    startDate: '2024-10-19',
    endDate: '2024-10-22',
    totalDays: 3,
    reason: 'Typhoid recovery and blood test at Apollo Clinic',
    appliedDate: '2024-10-17',
    status: 'Approved',
    gateToken: 'TK-77412',
    tokenGeneratedAt: '2024-10-17 18:00',
    cumulativeLeaveCountAtApplication: 2,
    requiredApprover: 'Warden',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', approverName: 'Mr. R. K. Gowda (Warden)', remarks: 'Medical rest approved.' },
    ],
  },
  {
    id: 'LV-2002',
    registrationId: 'REG-LV-2002',
    barcode: '*REG-LV-2002*',
    usn: '1RV23IS012',
    studentName: 'Sneha Patil',
    roomNumber: 'C-205',
    leaveType: 'Academic / Hackathon',
    startDate: '2024-10-25',
    endDate: '2024-10-28',
    totalDays: 3,
    reason: 'Smart India Hackathon finals delegation at IIT Bombay',
    appliedDate: '2024-10-23',
    status: 'Pending',
    cumulativeLeaveCountAtApplication: 3,
    requiredApprover: 'Warden',
    approvalSteps: [
      { role: 'Warden', status: 'Pending', remarks: 'Awaiting Warden Sanction (1-5 Days Tier).' },
    ],
  },
  {
    id: 'LV-2005',
    registrationId: 'REG-LV-2005',
    barcode: '*REG-LV-2005*',
    usn: '1RV22ME019',
    studentName: 'Darshan Kumar',
    roomNumber: 'B-214',
    leaveType: 'Home Visit',
    startDate: '2024-10-26',
    endDate: '2024-10-30',
    totalDays: 4,
    reason: 'Family temple festival and family function at Udupi',
    appliedDate: '2024-10-24',
    status: 'Pending',
    cumulativeLeaveCountAtApplication: 4,
    requiredApprover: 'Warden',
    approvalSteps: [
      { role: 'Warden', status: 'Pending', remarks: 'Awaiting Warden Sanction (1-5 Days Tier).' },
    ],
  },
  // 5-8 Days Leaves (SWO Sanction Scope)
  {
    id: 'LV-2003',
    registrationId: 'REG-LV-2003',
    barcode: '*REG-LV-2003*',
    usn: '1RV21ME078',
    studentName: 'Vignesh Rao',
    roomNumber: 'B-110',
    leaveType: 'Home Visit',
    startDate: '2024-10-18',
    endDate: '2024-10-24',
    totalDays: 6,
    reason: 'Sister marriage ceremony in Mangalore',
    appliedDate: '2024-10-15',
    status: 'Approved',
    gateToken: 'TK-65980',
    tokenGeneratedAt: '2024-10-16 11:20',
    cumulativeLeaveCountAtApplication: 7,
    requiredApprover: 'SWO',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', remarks: 'Invitation verified.' },
      { role: 'SWO', status: 'Approved', approverName: 'Dr. Suresh Babu (SWO)', remarks: 'Sanctioned for 6 days.' },
    ],
  },
  {
    id: 'LV-2006',
    registrationId: 'REG-LV-2006',
    barcode: '*REG-LV-2006*',
    usn: '1RV23CS015',
    studentName: 'Ananya Hegde',
    roomNumber: 'C-309',
    leaveType: 'Academic / Hackathon',
    startDate: '2024-10-27',
    endDate: '2024-11-03',
    totalDays: 7,
    reason: 'Research paper presentation at ACM International Conference in Pune',
    appliedDate: '2024-10-23',
    status: 'Pending',
    cumulativeLeaveCountAtApplication: 6,
    requiredApprover: 'SWO',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', remarks: 'Conference acceptance letter attached.' },
      { role: 'SWO', status: 'Pending', remarks: 'Awaiting SWO Sanction (5-8 Days Tier).' },
    ],
  },
  {
    id: 'LV-2008',
    registrationId: 'REG-LV-2008',
    barcode: '*REG-LV-2008*',
    usn: '1RV22EE041',
    studentName: 'Rahul Verma',
    roomNumber: 'A-308',
    leaveType: 'Personal / Emergency',
    startDate: '2024-10-28',
    endDate: '2024-11-03',
    totalDays: 6,
    reason: 'Attending grandparent golden jubilee ceremony and ancestral pooja',
    appliedDate: '2024-10-24',
    status: 'Pending',
    cumulativeLeaveCountAtApplication: 7,
    requiredApprover: 'SWO',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', remarks: 'Parent confirmation received via phone.' },
      { role: 'SWO', status: 'Pending', remarks: 'Awaiting SWO Sanction (5-8 Days Tier).' },
    ],
  },
  // 8-10+ Days Leaves (HOD Sanction Scope)
  {
    id: 'LV-2004',
    registrationId: 'REG-LV-2004',
    barcode: '*REG-LV-2004*',
    usn: '1RV22AI034',
    studentName: 'Priya Nair',
    roomNumber: 'A-212',
    leaveType: 'Medical',
    startDate: '2024-10-24',
    endDate: '2024-11-02',
    totalDays: 9,
    reason: 'Orthopedic surgery bed rest and physiotherapy rehabilitation',
    appliedDate: '2024-10-23',
    status: 'Pending',
    cumulativeLeaveCountAtApplication: 9,
    requiredApprover: 'HOD',
    medicalDocumentName: 'Apollo_Ortho_Discharge_Summary.pdf',
    medicalDocumentUri: 'https://example.com/medical/ortho_summary.pdf',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', remarks: 'Hospitalization documents verified.' },
      { role: 'SWO', status: 'Approved', remarks: 'Endorsed for departmental academic exemption.' },
      { role: 'HOD', status: 'Pending', remarks: 'Awaiting HOD Academic Sanction (8-10+ Days Tier).' },
    ],
  },
  {
    id: 'LV-2007',
    registrationId: 'REG-LV-2007',
    barcode: '*REG-LV-2007*',
    usn: '1RV21EC088',
    studentName: 'Karthik Bhat',
    roomNumber: 'B-302',
    leaveType: 'Medical',
    startDate: '2024-10-25',
    endDate: '2024-11-04',
    totalDays: 10,
    reason: 'Dengue fever recovery and platelet level monitoring at home',
    appliedDate: '2024-10-24',
    status: 'Pending',
    cumulativeLeaveCountAtApplication: 10,
    requiredApprover: 'HOD',
    medicalDocumentName: 'Lab_Report_Platelet_Count.pdf',
    approvalSteps: [
      { role: 'Warden', status: 'Approved', remarks: 'Doctor certificate verified.' },
      { role: 'SWO', status: 'Approved', remarks: 'Endorsed.' },
      { role: 'HOD', status: 'Pending', remarks: 'Awaiting HOD Academic Sanction (8-10+ Days Tier).' },
    ],
  },
];

export const CHECK_IN_COOLDOWN_MINUTES = 15;
export const CHECK_IN_COOLDOWN_MS = CHECK_IN_COOLDOWN_MINUTES * 60 * 1000;

export const StorageService = {
  getCheckInCooldown(
    application: OutingApplication | LeaveApplication | null | undefined,
    nowMs: number = Date.now()
  ): CheckInCooldownInfo {
    if (!application) {
      return {
        isRestricted: false,
        remainingMs: 0,
        remainingSeconds: 0,
        remainingFormatted: '0s',
        allowedCheckInTime: '',
      };
    }

    // Only apply restriction if application is in 'Exited Gate' status or has checked out without checkInTime
    const isExited =
      ('status' in application && application.status === 'Exited Gate') ||
      (Boolean(application.checkOutTime) && !application.checkInTime);

    if (!isExited) {
      return {
        isRestricted: false,
        remainingMs: 0,
        remainingSeconds: 0,
        remainingFormatted: '0s',
        allowedCheckInTime: '',
        checkOutTimestamp: application.checkOutTimestamp,
        checkOutTimeStr: application.checkOutTime,
      };
    }

    // Resolve checkout timestamp
    let ts = application.checkOutTimestamp;
    if (!ts && application.movementHistory && application.movementHistory.length > 0) {
      const exitEvt = [...application.movementHistory]
        .reverse()
        .find((e) => e.action === 'Check Out');
      if (exitEvt) {
        if (exitEvt.checkOutTimestamp) {
          ts = exitEvt.checkOutTimestamp;
        } else if (exitEvt.timestamp) {
          const parsed = Date.parse(exitEvt.timestamp);
          if (!isNaN(parsed)) ts = parsed;
        }
      }
    }

    if (!ts) {
      return {
        isRestricted: false,
        remainingMs: 0,
        remainingSeconds: 0,
        remainingFormatted: '0s',
        allowedCheckInTime: '',
        checkOutTimestamp: undefined,
        checkOutTimeStr: application.checkOutTime,
      };
    }

    const elapsed = nowMs - ts;
    if (elapsed >= 0 && elapsed < CHECK_IN_COOLDOWN_MS) {
      const remainingMs = CHECK_IN_COOLDOWN_MS - elapsed;
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const remainingFormatted =
        mins > 0 ? (secs > 0 ? `${mins}m ${secs}s` : `${mins}m`) : `${secs}s`;
      const allowedDate = new Date(ts + CHECK_IN_COOLDOWN_MS);
      const allowedCheckInTime = allowedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        isRestricted: true,
        remainingMs,
        remainingSeconds,
        remainingFormatted,
        allowedCheckInTime,
        checkOutTimestamp: ts,
        checkOutTimeStr: application.checkOutTime,
      };
    }

    return {
      isRestricted: false,
      remainingMs: 0,
      remainingSeconds: 0,
      remainingFormatted: '0s',
      allowedCheckInTime: '',
      checkOutTimestamp: ts,
      checkOutTimeStr: application.checkOutTime,
    };
  },

  async getProfile(): Promise<UserProfile> {
    try {
      const serverProfile = await api.getProfile();
      if (serverProfile && serverProfile.usn) {
        await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(serverProfile));
        return serverProfile;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(INITIAL_USER_PROFILE));
      return INITIAL_USER_PROFILE;
    } catch {
      return INITIAL_USER_PROFILE;
    }
  },

  async updateProfile(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    api.updateProfile(profile).catch(() => {});
  },

  async getAcademics(): Promise<SemesterRecord[]> {
    try {
      const serverAcademics = await api.getAcademics().catch(() => null);
      if (serverAcademics && Array.isArray(serverAcademics) && serverAcademics.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACADEMICS, JSON.stringify(serverAcademics));
        return serverAcademics;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ACADEMICS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.ACADEMICS, JSON.stringify(INITIAL_4YEAR_ACADEMICS));
      return INITIAL_4YEAR_ACADEMICS;
    } catch {
      return INITIAL_4YEAR_ACADEMICS;
    }
  },

  async getMyLeaves(): Promise<LeaveApplication[]> {
    try {
      const profile = await this.getProfile();
      const serverLeaves = await api.getLeaves(profile.usn);
      if (serverLeaves && Array.isArray(serverLeaves) && serverLeaves.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(serverLeaves));
        return serverLeaves;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LEAVES);
      const all: LeaveApplication[] = data ? JSON.parse(data) : INITIAL_MY_LEAVES;
      if (!data) {
        await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(INITIAL_MY_LEAVES));
      }
      return all.filter((l) => l.usn === profile.usn);
    } catch {
      return INITIAL_MY_LEAVES;
    }
  },

  async applyLeave(params: {
    leaveType: LeaveApplication['leaveType'];
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    startSession?: 'Morning' | 'Evening';
    returnSession?: 'Morning' | 'Evening';
    medicalDocumentUri?: string;
    medicalDocumentName?: string;
    isGovtHoliday?: boolean;
    holidayName?: string;
  }): Promise<{ leave: LeaveApplication; updatedLeavesCount: number }> {
    const profile = await this.getProfile();
    const currentLeaves = await this.getMyLeaves();

    const startSession = params.startSession || 'Morning';
    const returnSession = params.returnSession || 'Morning';

    // 1. Cutoff evaluation (2 days prior before 5:00 PM)
    const cutoff = getCutoffStatus(params.startDate);
    const isLateApplication = cutoff.isMissed;

    const escalation = getLeaveEscalationInfo(profile.leavesCount);
    const steps = buildApprovalSteps(escalation.requiredApprover);

    // 2. Govt Holiday Exemption Check:
    const holidayCalc = calculateChargedDays({
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: params.totalDays,
      isGovtHoliday: params.isGovtHoliday,
    });

    const isGovtHoliday = Boolean(holidayCalc.isExempt || params.isGovtHoliday);
    const holidayName = holidayCalc.holidayName || params.holidayName || (isGovtHoliday ? 'Govt Holiday Exemption' : undefined);

    // 3. Session-based quota & Saturday PM to Monday AM weekend exemption
    const sessionCalc = calculateLeaveSessionDays({
      startDate: params.startDate,
      startSession,
      endDate: params.endDate,
      returnSession,
      isGovtHoliday,
    });

    const isWeekendExempt = sessionCalc.isWeekendExempt;
    const chargedDays = isGovtHoliday ? 0 : sessionCalc.chargedDays;

    // 4. Going Home (Home Visit) or Govt Holiday Auto-Approval & Instant Outpass:
    const isGoingHome = params.leaveType === 'Home Visit';
    const isAutoApproved = isGoingHome || isGovtHoliday;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const autoGateToken = isAutoApproved
      ? (isGovtHoliday ? `TK-HP-${Math.floor(10000 + Math.random() * 90000)}` : `TK-${Math.floor(10000 + Math.random() * 90000)}`)
      : undefined;

    // Approver determination:
    const requiredApprover = isWeekendExempt
      ? 'AO'
      : isAutoApproved
      ? 'Warden'
      : escalation.requiredApprover;

    const approvalSteps = isWeekendExempt
      ? [
          {
            role: 'AO' as const,
            status: 'Pending' as const,
            approverName: 'Administrative Officer (AO)',
            remarks: 'Saturday PM to Monday AM Weekend Exemption requested (0 Quota Days). Pending AO sanction.',
          },
        ]
      : isAutoApproved
      ? [
          {
            role: 'Warden' as const,
            status: 'Approved' as const,
            timestamp: now,
            approverName: isGovtHoliday
              ? 'Auto-Sanctioned System (Govt Holiday Exemption)'
              : 'Auto-Sanction (Warden Desk)',
            remarks: isGovtHoliday
              ? `Pre-authorized institutional exemption for ${holidayName}. 0 days deducted from personal leave quota.`
              : 'Home Visit auto-approved with verified parent intimation. Digital Outpass active.',
          },
        ]
      : steps;

    const newId = `LV-${1000 + currentLeaves.length + 1}`;
    const uniqueSuffix = Math.floor(10000 + Math.random() * 90000);
    const regId = `REG-LV-${profile.usn}-${uniqueSuffix}`;
    const barcode = `*${regId}*`;
    const studentBarcode = this.getStudentBarcode(profile.usn);

    const newLeave: LeaveApplication = {
      id: newId,
      registrationId: regId,
      barcode: barcode,
      studentBarcode: studentBarcode,
      usn: profile.usn,
      studentName: profile.name,
      roomNumber: profile.roomNumber,
      leaveType: params.leaveType,
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: sessionCalc.totalCalendarDays,
      startSession,
      returnSession,
      isLateApplication,
      isWeekendExempt,
      reason: params.reason,
      appliedDate: new Date().toISOString().split('T')[0],
      status: isAutoApproved ? 'Approved' : 'Pending',
      cumulativeLeaveCountAtApplication: profile.leavesCount,
      requiredApprover,
      approvalSteps,
      medicalDocumentUri: params.medicalDocumentUri,
      medicalDocumentName: params.medicalDocumentName,
      gateToken: autoGateToken,
      tokenGeneratedAt: isAutoApproved ? now : undefined,
      isAutoApproved,
      isGovtHoliday,
      holidayName,
      chargedDays,
      movementHistory: [],
    };

    const updatedLeaves = [newLeave, ...currentLeaves];

    // Increment profile leavesCount by the computed chargedDays (0 if weekend exempt or holiday)
    const newCount = profile.leavesCount + chargedDays;
    const updatedProfile = { ...profile, leavesCount: newCount };

    await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updatedLeaves));
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));

    // Sync with backend API
    api.applyLeave(newLeave).catch(() => {});

    // Also add to public outpass board (strictly USN only!)
    const publicRoster = await this.getPublicOutpass();
    const newPublicItem = {
      id: `OUT-${Math.floor(100 + Math.random() * 900)}`,
      usn: profile.usn, // ONLY USN DISCLOSED!
      hostelBlock: profile.hostelBlock,
      leaveType: params.leaveType,
      startDate: params.startDate,
      endDate: params.endDate,
      days: params.totalDays,
      status: isAutoApproved ? ('Approved' as const) : ('Under Review' as const),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.PUBLIC_OUTPASS, JSON.stringify([newPublicItem, ...publicRoster]));

    return { leave: newLeave, updatedLeavesCount: newCount };
  },

  async getPublicOutpass() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PUBLIC_OUTPASS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.PUBLIC_OUTPASS, JSON.stringify(INITIAL_PUBLIC_OUTPASS));
      return INITIAL_PUBLIC_OUTPASS;
    } catch {
      return INITIAL_PUBLIC_OUTPASS;
    }
  },

  async getGrievances(): Promise<GrievanceTicket[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GRIEVANCES);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.GRIEVANCES, JSON.stringify(INITIAL_GRIEVANCES));
      return INITIAL_GRIEVANCES;
    } catch {
      return INITIAL_GRIEVANCES;
    }
  },

  async submitGrievance(ticket: Omit<GrievanceTicket, 'id' | 'createdAt' | 'status' | 'usn'>): Promise<GrievanceTicket> {
    const profile = await this.getProfile();
    const existing = await this.getGrievances();
    const newTicket: GrievanceTicket = {
      id: `GRV-${200 + existing.length + 1}`,
      usn: profile.usn,
      ...ticket,
      status: 'Submitted',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      adminRemark: 'Ticket submitted with live photo verification. Assigned to hostel maintenance desk.',
    };

    try {
      await api.submitGrievance(newTicket);
    } catch {
      // Fallback
    }

    const updated = [newTicket, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.GRIEVANCES, JSON.stringify(updated));
    return newTicket;
  },

  async getMessRatings(): Promise<MessRating[]> {
    try {
      const serverRatings = await api.getMessRatings();
      if (serverRatings && serverRatings.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.MESS_RATINGS, JSON.stringify(serverRatings));
        return serverRatings;
      }
    } catch {
      // Fallback
    }

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESS_RATINGS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.MESS_RATINGS, JSON.stringify(INITIAL_MESS_RATINGS));
      return INITIAL_MESS_RATINGS;
    } catch {
      return INITIAL_MESS_RATINGS;
    }
  },

  async submitMessRating(params: {
    mealType: string;
    rating: number;
    feedback?: string;
    photoUri?: string;
  }): Promise<MessRating> {
    const profile = await this.getProfile();
    const existing = await this.getMessRatings();
    const newRating: MessRating = {
      id: `MESS-${Date.now()}`,
      usn: profile.usn,
      studentName: profile.name,
      roomNumber: profile.roomNumber,
      mealType: params.mealType,
      rating: params.rating,
      feedback: params.feedback || '',
      photoUri: params.photoUri,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    try {
      await api.submitMessRating(newRating);
    } catch {
      // Fallback
    }

    const updated = [newRating, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.MESS_RATINGS, JSON.stringify(updated));
    return newRating;
  },

  async getAllMessRatingsAdmin(): Promise<MessRating[]> {
    return await this.getMessRatings();
  },

  async getDocuments(): Promise<StudentDocument[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(INITIAL_DOCUMENTS));
      return INITIAL_DOCUMENTS;
    } catch {
      return INITIAL_DOCUMENTS;
    }
  },

  async uploadDocument(doc: Omit<StudentDocument, 'id' | 'uploadDate'>): Promise<StudentDocument> {
    const existing = await this.getDocuments();
    const newDoc: StudentDocument = {
      ...doc,
      id: `DOC-${String(existing.length + 1).padStart(2, '0')}`,
      uploadDate: new Date().toISOString().split('T')[0],
    };
    const updated = [newDoc, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
    return newDoc;
  },

  async setLeaveCountForTesting(count: number): Promise<UserProfile> {
    const profile = await this.getProfile();
    const updated = { ...profile, leavesCount: count };
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    return updated;
  },

  async approveLeave(leaveId: string): Promise<LeaveApplication | null> {
    const leaves = await this.getMyLeaves();
    const token = `TK-${Math.floor(10000 + Math.random() * 90000)}`;
    const fallbackRegId = `REG-LV-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    let target: LeaveApplication | null = null;
    const updated = leaves.map((l) => {
      if (l.id === leaveId) {
        target = {
          ...l,
          status: 'Approved',
          gateToken: l.gateToken || token,
          tokenGeneratedAt: l.tokenGeneratedAt || now,
          registrationId: l.registrationId || fallbackRegId,
          barcode: l.barcode || `*${l.registrationId || fallbackRegId}*`,
          approvalSteps: l.approvalSteps.map((s) => ({ ...s, status: 'Approved' })),
        };
        return target;
      }
      return l;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updated));
    return target;
  },

  async extendLeave(params: {
    leaveId: string;
    additionalDays: number;
    extensionReason: string;
    medicalDocumentUri?: string;
    medicalDocumentName?: string;
  }): Promise<{ leave: LeaveApplication; updatedLeavesCount: number }> {
    const profile = await this.getProfile();
    const leaves = await this.getMyLeaves();
    const targetLeave = leaves.find((l) => l.id === params.leaveId);
    if (!targetLeave) throw new Error('Leave not found');

    const newCumulativeLeaves = profile.leavesCount + params.additionalDays;
    const escalation = getLeaveEscalationInfo(newCumulativeLeaves);

    const currentEnd = new Date(targetLeave.endDate);
    currentEnd.setDate(currentEnd.getDate() + params.additionalDays);
    const newEndDateStr = currentEnd.toISOString().split('T')[0];

    const updatedLeave: LeaveApplication = {
      ...targetLeave,
      totalDays: targetLeave.totalDays + params.additionalDays,
      endDate: newEndDateStr,
      isExtended: true,
      extendedDays: (targetLeave.extendedDays || 0) + params.additionalDays,
      extensionReason: params.extensionReason,
      extensionStatus: 'Approved',
      gateToken: targetLeave.gateToken || `TK-${Math.floor(10000 + Math.random() * 90000)}`,
      tokenGeneratedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      medicalDocumentUri: params.medicalDocumentUri || targetLeave.medicalDocumentUri,
      medicalDocumentName: params.medicalDocumentName || targetLeave.medicalDocumentName,
      requiredApprover: escalation.requiredApprover,
    };

    const updatedLeaves = leaves.map((l) => (l.id === params.leaveId ? updatedLeave : l));
    const updatedProfile = { ...profile, leavesCount: newCumulativeLeaves };

    await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updatedLeaves));
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));

    return { leave: updatedLeave, updatedLeavesCount: newCumulativeLeaves };
  },

  async getAllGrievancesAdmin(): Promise<GrievanceTicket[]> {
    return await this.getGrievances();
  },

  async adminAssignGrievance(ticketId: string, assignedStaff: string, status: GrievanceTicket['status']): Promise<GrievanceTicket[]> {
    const grievances = await this.getGrievances();
    const updated = grievances.map((g) =>
      g.id === ticketId
        ? {
            ...g,
            status,
            adminRemark: `Assigned to: ${assignedStaff}. Status updated to ${status}.`,
          }
        : g
    );
    await AsyncStorage.setItem(STORAGE_KEYS.GRIEVANCES, JSON.stringify(updated));
    return updated;
  },

  async getAllLeavesAdmin(): Promise<LeaveApplication[]> {
    try {
      const serverLeaves = await api.getAdminLeaves().catch(() => null);
      if (serverLeaves && Array.isArray(serverLeaves) && serverLeaves.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_LEAVES, JSON.stringify(serverLeaves));
        return serverLeaves;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_LEAVES);
      let adminLeaves: LeaveApplication[] = stored ? JSON.parse(stored) : null;
      const myLeaves = await this.getMyLeaves();

      if (!adminLeaves) {
        adminLeaves = [...myLeaves, ...SEED_ADMIN_LEAVES];
        await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_LEAVES, JSON.stringify(adminLeaves));
      } else {
        // Sync any new myLeaves into adminLeaves if missing
        let hasNew = false;
        myLeaves.forEach((ml) => {
          if (!adminLeaves!.some((al) => al.id === ml.id)) {
            adminLeaves = [ml, ...adminLeaves!];
            hasNew = true;
          }
        });
        if (hasNew) {
          await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_LEAVES, JSON.stringify(adminLeaves));
        }
      }
      return adminLeaves;
    } catch {
      const myLeaves = await this.getMyLeaves();
      return [...myLeaves, ...SEED_ADMIN_LEAVES];
    }
  },

  async sanctionLeaveByRole(params: {
    leaveId: string;
    role: AdminRole;
    action: 'Approve' | 'Reject';
    approverName: string;
    remarks?: string;
  }): Promise<LeaveApplication[]> {
    const allLeaves = await this.getAllLeavesAdmin();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = allLeaves.map((l) => {
      if (l.id !== params.leaveId) return l;

      const existingSteps = l.approvalSteps || [];
      const updatedSteps = existingSteps.map((step) => {
        if (step.role === params.role || (params.role === 'AO' && step.status === 'Pending')) {
          return {
            ...step,
            status: (params.action === 'Approve' ? 'Approved' : 'Rejected') as 'Approved' | 'Rejected',
            timestamp: now,
            approverName: params.approverName,
            remarks: params.remarks || `${params.role} ${params.action.toLowerCase()}d leave.`,
          };
        }
        return step;
      });

      if (!existingSteps.some((s) => s.role === params.role)) {
        updatedSteps.push({
          role: params.role as any,
          status: (params.action === 'Approve' ? 'Approved' : 'Rejected') as 'Approved' | 'Rejected',
          timestamp: now,
          approverName: params.approverName,
          remarks: params.remarks || `${params.role} ${params.action.toLowerCase()}d leave.`,
        });
      }

      if (params.action === 'Reject') {
        api.rejectLeaveAdmin(params.leaveId, {
          approverRole: params.role,
          approverName: params.approverName,
          remarks: params.remarks,
        }).catch(() => {});
        return {
          ...l,
          status: 'Rejected' as const,
          approvalSteps: updatedSteps,
        };
      }

      const isApproved =
        params.role === 'AO' ||
        (params.role === 'Warden' && l.totalDays <= 5) ||
        (params.role === 'SWO' && l.totalDays <= 8) ||
        params.role === 'HOD' ||
        l.requiredApprover === params.role;

      const token = l.gateToken || `TK-${Math.floor(10000 + Math.random() * 90000)}`;
      const fallbackRegId = l.registrationId || `REG-LV-${Math.floor(10000 + Math.random() * 90000)}`;

      if (isApproved) {
        api.approveLeaveAdmin(params.leaveId, {
          approverRole: params.role,
          approverName: params.approverName,
          remarks: params.remarks,
        }).catch(() => {});
      }

      return {
        ...l,
        status: isApproved ? ('Approved' as const) : ('Pending' as const),
        gateToken: isApproved ? token : l.gateToken,
        tokenGeneratedAt: isApproved ? (l.tokenGeneratedAt || now) : l.tokenGeneratedAt,
        registrationId: l.registrationId || fallbackRegId,
        barcode: l.barcode || `*${l.registrationId || fallbackRegId}*`,
        approvalSteps: updatedSteps,
      };
    });

    await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_LEAVES, JSON.stringify(updated));

    try {
      const myLeaves = await this.getMyLeaves();
      const updatedMyLeaves = myLeaves.map((ml) => {
        const found = updated.find((u) => u.id === ml.id);
        return found || ml;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updatedMyLeaves));
    } catch {
      // ignore
    }

    return updated;
  },

  async wardenApproveLeave(leaveId: string, wardenName = 'Mr. R. K. Gowda (Warden)', remarks = 'Sanctioned by Warden (1-5 Days Leave Desk)'): Promise<LeaveApplication[]> {
    return await this.sanctionLeaveByRole({ leaveId, role: 'Warden', action: 'Approve', approverName: wardenName, remarks });
  },

  async wardenRejectLeave(leaveId: string, wardenName = 'Mr. R. K. Gowda (Warden)', remarks = 'Rejected by Warden due to attendance/disciplinary grounds'): Promise<LeaveApplication[]> {
    return await this.sanctionLeaveByRole({ leaveId, role: 'Warden', action: 'Reject', approverName: wardenName, remarks });
  },

  async swoApproveLeave(leaveId: string, swoName = 'Dr. Suresh Babu (SWO)', remarks = 'Sanctioned by Student Welfare Officer (5-8 Days Tier)'): Promise<LeaveApplication[]> {
    return await this.sanctionLeaveByRole({ leaveId, role: 'SWO', action: 'Approve', approverName: swoName, remarks });
  },

  async swoRejectLeave(leaveId: string, swoName = 'Dr. Suresh Babu (SWO)', remarks = 'Rejected by SWO after student welfare review'): Promise<LeaveApplication[]> {
    return await this.sanctionLeaveByRole({ leaveId, role: 'SWO', action: 'Reject', approverName: swoName, remarks });
  },

  async hodApproveLeave(leaveId: string, hodName = 'Dr. M. K. Sridhar (HOD CSE)', remarks = 'Sanctioned by Head of Department with academic attendance exemption'): Promise<LeaveApplication[]> {
    return await this.sanctionLeaveByRole({ leaveId, role: 'HOD', action: 'Approve', approverName: hodName, remarks });
  },

  async hodRejectLeave(leaveId: string, hodName = 'Dr. M. K. Sridhar (HOD CSE)', remarks = 'Rejected by HOD due to internal assessment exam schedule'): Promise<LeaveApplication[]> {
    return await this.sanctionLeaveByRole({ leaveId, role: 'HOD', action: 'Reject', approverName: hodName, remarks });
  },

  async adminApproveLeave(leaveId: string, roleName: string, remarks: string): Promise<void> {
    await this.sanctionLeaveByRole({
      leaveId,
      role: 'AO',
      action: 'Approve',
      approverName: roleName || 'Administrative Officer',
      remarks,
    });
  },

  async getHealthLogs(): Promise<HealthRoomLog[]> {
    try {
      const serverLogs = await api.getHealthLogs().catch(() => null);
      if (serverLogs && Array.isArray(serverLogs) && serverLogs.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_LOGS, JSON.stringify(serverLogs));
        return serverLogs;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HEALTH_LOGS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_LOGS, JSON.stringify(INITIAL_HEALTH_LOGS));
      return INITIAL_HEALTH_LOGS;
    } catch {
      return INITIAL_HEALTH_LOGS;
    }
  },

  async addHealthRoomLog(entry: Omit<HealthRoomLog, 'id'>): Promise<HealthRoomLog> {
    const logs = await this.getHealthLogs();
    const newLog: HealthRoomLog = {
      ...entry,
      id: `HLOG-${String(logs.length + 1).padStart(3, '0')}`,
    };
    const updated = [newLog, ...logs];
    await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_LOGS, JSON.stringify(updated));
    api.addHealthLog(newLog).catch(() => {});
    return newLog;
  },

  async dischargeHealthRoomLog(id: string, checkOutTime?: string, remarks?: string): Promise<HealthRoomLog | null> {
    const logs = await this.getHealthLogs();
    const nowTime = checkOutTime || new Date().toISOString().replace('T', ' ').substring(0, 16);
    let target: HealthRoomLog | null = null;
    const updated = logs.map((item) => {
      if (item.id === id) {
        target = {
          ...item,
          status: 'Discharged / Recovered' as const,
          checkOutTime: nowTime,
          remarks: remarks ? `${item.remarks || ''} • Discharge note: ${remarks}` : item.remarks,
        };
        return target;
      }
      return item;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_LOGS, JSON.stringify(updated));
    api.dischargeHealthLog(id, { checkOutTime: nowTime, remarks }).catch(() => {});
    return target;
  },

  async updateHealthRoomLog(id: string, updates: Partial<HealthRoomLog>): Promise<HealthRoomLog | null> {
    const logs = await this.getHealthLogs();
    let target: HealthRoomLog | null = null;
    const updated = logs.map((item) => {
      if (item.id === id) {
        target = { ...item, ...updates };
        return target;
      }
      return item;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.HEALTH_LOGS, JSON.stringify(updated));
    return target;
  },

  async updateStudentMarksAndAttendance(params: {
    usn: string;
    semester: number;
    subjectCode: string;
    attendancePercentage?: number;
    classesAttended?: number;
    totalClasses?: number;
    ia1?: number;
    ia2?: number;
    ia3?: number;
  }): Promise<SemesterRecord[]> {
    const records = await this.getAcademics();
    const updated = records.map((sem) => {
      if (sem.semester === params.semester) {
        const updatedSubjects = sem.subjects.map((sub) => {
          if (sub.code === params.subjectCode) {
            const newAttended = params.classesAttended !== undefined ? params.classesAttended : sub.classesAttended;
            const newTotal = params.totalClasses !== undefined ? params.totalClasses : sub.totalClasses;
            const attPct =
              params.attendancePercentage !== undefined
                ? params.attendancePercentage
                : Math.round((newAttended / (newTotal || 1)) * 1000) / 10;
            return {
              ...sub,
              ia1: params.ia1 !== undefined ? params.ia1 : sub.ia1,
              ia2: params.ia2 !== undefined ? params.ia2 : sub.ia2,
              ia3: params.ia3 !== undefined ? params.ia3 : sub.ia3,
              classesAttended: newAttended,
              totalClasses: newTotal,
              attendancePercentage: attPct,
            };
          }
          return sub;
        });

        const avgAttendance =
          Math.round(
            (updatedSubjects.reduce((acc, s) => acc + s.attendancePercentage, 0) / (updatedSubjects.length || 1)) * 10
          ) / 10;

        return {
          ...sem,
          subjects: updatedSubjects,
          overallAttendance: avgAttendance,
        };
      }
      return sem;
    });

    await AsyncStorage.setItem(STORAGE_KEYS.ACADEMICS, JSON.stringify(updated));
    api.updateAcademics(params).catch(() => {});
    return updated;
  },

  async getMasterActivityFeed(): Promise<MasterActivityItem[]> {
    const feed: MasterActivityItem[] = [];

    // 1. Gate Logs
    try {
      const gateLogs = await this.getGateLogs();
      gateLogs.slice(0, 15).forEach((entry) => {
        const isExit = entry.action === 'Check Out';
        const isLate = Boolean(entry.isLate);
        feed.push({
          id: `ACT-GATE-${entry.id}`,
          type: 'Gate Scan',
          title: isLate ? `🚨 Late Gate Entry: ${entry.studentName} (${entry.usn})` : `${entry.action}: ${entry.studentName} (${entry.usn})`,
          description: `Station: ${entry.station} • Guard: ${entry.guardName}${entry.remarks ? ` • Note: ${entry.remarks}` : ''}${entry.destination ? ` • Destination: ${entry.destination}` : ''}`,
          timestamp: entry.timestamp,
          badge: isLate ? 'LATE ENTRY VIOLATION' : isExit ? 'GATE EXIT' : 'GATE ENTRY',
          severity: isLate ? 'critical' : isExit ? 'warning' : 'success',
          actor: entry.guardName,
          targetUsn: entry.usn,
        });
      });
    } catch {
      // ignore
    }

    // 2. Leave Sanctions
    try {
      const allLeaves = await this.getAllLeavesAdmin();
      allLeaves.slice(0, 15).forEach((leave) => {
        const isApproved = leave.status === 'Approved';
        const isRejected = leave.status === 'Rejected';
        feed.push({
          id: `ACT-LV-${leave.id}`,
          type: 'Leave Sanction',
          title: `Leave ${leave.status}: ${leave.studentName} (${leave.totalDays} Days - ${leave.leaveType})`,
          description: `${leave.startDate} to ${leave.endDate} • Tier: ${leave.requiredApprover} • Reason: ${leave.reason}${leave.gateToken ? ` • Token: ${leave.gateToken}` : ''}`,
          timestamp: leave.tokenGeneratedAt || `${leave.appliedDate} 12:00`,
          badge: `${leave.requiredApprover.toUpperCase()} (${leave.totalDays}D)`,
          severity: isApproved ? 'success' : isRejected ? 'critical' : 'warning',
          actor: `${leave.requiredApprover} Desk`,
          targetUsn: leave.usn,
        });
      });
    } catch {
      // ignore
    }

    // 3. Health Bay & Hospital Cases
    try {
      const healthLogs = await this.getHealthLogs();
      healthLogs.slice(0, 10).forEach((hl) => {
        feed.push({
          id: `ACT-HL-${hl.id}`,
          type: 'Health Case',
          title: `${hl.status}: ${hl.studentName} (Room ${hl.roomNumber})`,
          description: `${hl.symptomsOrDiagnosis} • Location: ${hl.location}${hl.hospitalName ? ` (${hl.hospitalName})` : ''} • Dr: ${hl.doctorName || 'Hostel Doctor'}`,
          timestamp: hl.checkOutTime || hl.checkInTime,
          badge: hl.status === 'Referred to Hospital' ? 'HOSPITAL' : hl.status === 'Resting in Health Room' ? 'SICK BAY' : 'DISCHARGED',
          severity: hl.status === 'Referred to Hospital' ? 'critical' : hl.status === 'Resting in Health Room' ? 'warning' : 'success',
          actor: hl.recordedByWarden,
          targetUsn: hl.usn,
        });
      });
    } catch {
      // ignore
    }

    // 4. Hostel Grievances
    try {
      const grievances = await this.getGrievances();
      grievances.slice(0, 10).forEach((g) => {
        feed.push({
          id: `ACT-GRV-${g.id}`,
          type: 'Hostel Issue',
          title: `Grievance #${g.id}: ${g.category} (${g.roomNumber})`,
          description: `${g.description} • Urgency: ${g.urgency} • Status: ${g.status}${g.adminRemark ? ` • ${g.adminRemark}` : ''}`,
          timestamp: g.createdAt,
          badge: g.category.toUpperCase(),
          severity: g.urgency === 'Emergency' || g.urgency === 'High' ? 'critical' : 'normal',
          actor: 'Student Care',
          targetUsn: g.usn,
        });
      });
    } catch {
      // ignore
    }

    // 5. Academic & Attendance Flags
    try {
      const academics = await this.getAcademics();
      academics.forEach((sem) => {
        sem.subjects.forEach((sub) => {
          if (sub.attendancePercentage < 75) {
            feed.push({
              id: `ACT-ACAD-${sem.semester}-${sub.code}`,
              type: 'Academic Update',
              title: `Low Attendance Alert: Sem ${sem.semester} - ${sub.name} (${sub.code})`,
              description: `Attendance dropped to ${sub.attendancePercentage}% (< 75% VTU threshold). ${sub.classesAttended}/${sub.totalClasses} classes attended.`,
              timestamp: '2024-10-24 11:30',
              badge: 'ATTENDANCE < 75%',
              severity: 'warning',
              actor: 'HOD Academic Monitoring',
              targetUsn: '1RV22CS089',
            });
          }
        });
      });
    } catch {
      // ignore
    }

    // Sort newest timestamp first
    feed.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return feed;
  },

  async getAllStudents(): Promise<Array<{
    usn: string;
    name: string;
    branch: string;
    roomNumber: string;
    hostelBlock: string;
    contactNumber: string;
    guardianContact: string;
    activeDeviceId: string;
    deviceModel: string;
    deviceStatus: 'Active & Bound' | 'Reset Required';
    leavesCount: number;
    overallAttendance: number;
    isOutingBlocked?: boolean;
    outingBlockReason?: string;
  }>> {
    try {
      const serverStudents = await api.getStudents().catch(() => null);
      if (serverStudents && Array.isArray(serverStudents) && serverStudents.length > 0) {
        return serverStudents;
      }
    } catch {
      // fallback
    }

    const profile = await this.getProfile();
    return [
      {
        usn: profile.usn,
        name: profile.name,
        branch: profile.branch,
        roomNumber: profile.roomNumber,
        hostelBlock: profile.hostelBlock,
        contactNumber: profile.contactNumber,
        guardianContact: profile.guardianContact,
        activeDeviceId: profile.activeDeviceId || 'DEV-SM-S23-9941',
        deviceModel: profile.deviceModel || 'Samsung Galaxy S23 (Primary)',
        deviceStatus: 'Active & Bound',
        leavesCount: profile.leavesCount,
        overallAttendance: 87.2,
        isOutingBlocked: Boolean(profile.isOutingBlocked),
        outingBlockReason: profile.outingBlockReason,
      },
      {
        usn: '1RV22EC045',
        name: 'Rohan Mehta',
        branch: 'Electronics & Communication',
        roomNumber: 'A-102',
        hostelBlock: 'Sharavathi Block A-1',
        contactNumber: '+91 98765 11223',
        guardianContact: '+91 98765 22334',
        activeDeviceId: 'DEV-PIXEL7-8812',
        deviceModel: 'Google Pixel 7 (Bound)',
        deviceStatus: 'Active & Bound',
        leavesCount: 2,
        overallAttendance: 89.5,
        isOutingBlocked: true,
        outingBlockReason: 'Late Return Curfew Violation: Returned at 05:15 PM (Breached 04:30 PM cutoff by 45m).',
      },
      {
        usn: '1RV23IS012',
        name: 'Sneha Patil',
        branch: 'Information Science',
        roomNumber: 'C-205',
        hostelBlock: 'Krishna Block C-2',
        contactNumber: '+91 98765 44556',
        guardianContact: '+91 98765 55667',
        activeDeviceId: 'DEV-IPHONE14-5541',
        deviceModel: 'Apple iPhone 14 (Bound)',
        deviceStatus: 'Active & Bound',
        leavesCount: 6,
        overallAttendance: 91.0,
      },
      {
        usn: '1RV21ME078',
        name: 'Vignesh Rao',
        branch: 'Mechanical Engineering',
        roomNumber: 'B-110',
        hostelBlock: 'Cauvery Block B-1',
        contactNumber: '+91 98765 77889',
        guardianContact: '+91 98765 88990',
        activeDeviceId: 'DEV-ONEPLUS11-3321',
        deviceModel: 'OnePlus 11 5G (Bound)',
        deviceStatus: 'Active & Bound',
        leavesCount: 7,
        overallAttendance: 78.4,
      },
      {
        usn: '1RV22AI034',
        name: 'Priya Nair',
        branch: 'Artificial Intelligence & ML',
        roomNumber: 'A-212',
        hostelBlock: 'Sharavathi Block A-2',
        contactNumber: '+91 98765 99001',
        guardianContact: '+91 98765 00112',
        activeDeviceId: 'DEV-REDMI12-6643',
        deviceModel: 'Xiaomi Redmi Note 12 (Bound)',
        deviceStatus: 'Active & Bound',
        leavesCount: 11,
        overallAttendance: 84.0,
      },
    ];
  },

  async resetStudentDevice(usn: string): Promise<void> {
    const profile = await this.getProfile();
    if (profile.usn === usn) {
      const updated = {
        ...profile,
        activeDeviceId: `DEV-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
        deviceModel: 'New Authorized Device (Device Binding Reset)',
      };
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    }
  },

  simulateSecondaryDeviceLogin(attemptedDeviceModel: string = 'Apple iPhone 15 Pro'): {
    blocked: boolean;
    activeDeviceId: string;
    activeDeviceModel: string;
    message: string;
  } {
    return {
      blocked: true,
      activeDeviceId: 'DEV-SM-S23-9941',
      activeDeviceModel: 'Samsung Galaxy S23 (Primary)',
      message: `⛔ ACCESS DENIED: Single-Device Policy Enforced!\n\nThis account is already registered and active on:\n📱 Samsung Galaxy S23 (DEV-SM-S23-9941)\n\nSimultaneous login from secondary device "${attemptedDeviceModel}" is strictly blocked. Students cannot log in on multiple devices under hostel security rules.\n\nAll device re-authorizations are handled by Admin. If you have replaced your phone, submit a reset request to the Warden Desk.`,
    };
  },

  async requestAdminDeviceReset(usn: string, reason: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Device reset request submitted to Hostel Admin Desk for USN ${usn}.\nReason: "${reason}".\nThe Hostel Warden will review and authorize your new hardware.`,
    };
  },

  // ==========================================
  // HOSTEL OUTING & DAY OUTPASS SERVICES
  // ==========================================
  async getOutings(): Promise<OutingApplication[]> {
    try {
      const remote = await api.getOutings();
      if (remote && Array.isArray(remote) && remote.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.OUTINGS, JSON.stringify(remote));
        return remote;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OUTINGS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.OUTINGS, JSON.stringify(INITIAL_OUTINGS));
      return INITIAL_OUTINGS;
    } catch {
      return INITIAL_OUTINGS;
    }
  },

  async getMyOutings(): Promise<OutingApplication[]> {
    try {
      const profile = await this.getProfile();
      const all = await this.getOutings();
      return all.filter((o) => o.usn === profile.usn);
    } catch {
      return INITIAL_OUTINGS;
    }
  },

  async getActiveOuting(): Promise<OutingApplication | null> {
    const outings = await this.getMyOutings();
    return (
      outings.find(
        (o) => o.status === 'Outpass Generated' || o.status === 'Exited Gate'
      ) || null
    );
  },

  async applyOuting(params: {
    outingType: OutingType;
    outDate: string;
    outTime: string;
    expectedInTime: string;
    destination: string;
    purpose: string;
    contactNumber?: string;
    emergencyContact?: string;
    isGovtHolidayOuting?: boolean;
  }): Promise<OutingApplication> {
    const profile = await this.getProfile();
    if (profile.isOutingBlocked) {
      throw new Error(
        `⛔ Outing Privileges Suspended by SWO Disciplinary Desk.\n\nReason: ${profile.outingBlockReason || 'Previous late entry curfew breach'}.\n\nYou cannot apply for another outing until the Student Welfare Officer (SWO) reviews your case and grants clearance.`
      );
    }

    const isHoliday = Boolean(params.isGovtHolidayOuting);
    const curfewTime = isHoliday ? CURFEW_CONFIG.HOLIDAY.curfewTime : CURFEW_CONFIG.REGULAR.curfewTime;
    const graceCurfewTime = isHoliday ? CURFEW_CONFIG.HOLIDAY.graceEndTime : CURFEW_CONFIG.REGULAR.graceEndTime;

    const existing = await this.getOutings();
    const tokenNumber = `OP-${Math.floor(10000 + Math.random() * 90000)}`;
    const newId = `OUT-${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueSuffix = Math.floor(10000 + Math.random() * 90000);
    const regId = `REG-OUT-${profile.usn}-${uniqueSuffix}`;
    const barcode = `*${regId}*`;
    const studentBarcode = this.getStudentBarcode(profile.usn);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newOuting: OutingApplication = {
      id: newId,
      registrationId: regId,
      barcode: barcode,
      studentBarcode: studentBarcode,
      usn: profile.usn,
      studentName: profile.name,
      roomNumber: profile.roomNumber,
      hostelBlock: profile.hostelBlock,
      outingType: params.outingType,
      outDate: params.outDate,
      outTime: params.outTime || (isHoliday ? CURFEW_CONFIG.HOLIDAY.startTime : CURFEW_CONFIG.REGULAR.startTime),
      expectedInTime: params.expectedInTime || curfewTime,
      destination: params.destination,
      purpose: params.purpose,
      contactNumber: params.contactNumber || profile.contactNumber,
      emergencyContact: params.emergencyContact || profile.guardianContact,
      appliedAt: now,
      status: 'Outpass Generated',
      outpassToken: tokenNumber,
      qrCodeValue: `AIETNEST-${tokenNumber}-${profile.usn}`,
      gateSecurityRemark: `Digital Outpass generated (${isHoliday ? 'Govt Holiday Outpass' : 'Regular Day Outing'}). Curfew: ${curfewTime}, Grace Cutoff: ${graceCurfewTime}.`,
      movementHistory: [],
      isGovtHolidayOuting: isHoliday,
      curfewTime,
      graceCurfewTime,
    };

    const updated = [newOuting, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.OUTINGS, JSON.stringify(updated));
    await api.applyOuting(newOuting).catch(() => {});
    return newOuting;
  },

  async applyHolidayOutpass(params: {
    destination: string;
    purpose: string;
    outDate?: string;
    contactNumber?: string;
    emergencyContact?: string;
  }): Promise<OutingApplication> {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.applyOuting({
      outingType: 'Local City Outing',
      outDate: params.outDate || todayStr,
      outTime: CURFEW_CONFIG.HOLIDAY.startTime,
      expectedInTime: CURFEW_CONFIG.HOLIDAY.curfewTime,
      destination: params.destination,
      purpose: params.purpose,
      contactNumber: params.contactNumber,
      emergencyContact: params.emergencyContact,
      isGovtHolidayOuting: true,
    });
  },

  async applyHolidayHomepass(params: {
    holidayName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    destinationAddress: string;
    reason: string;
  }): Promise<LeaveApplication> {
    const profile = await this.getProfile();
    const tokenNumber = `TK-HP-${Math.floor(10000 + Math.random() * 90000)}`;
    const newId = `LV-HP-${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueSuffix = Math.floor(10000 + Math.random() * 90000);
    const regId = `REG-LV-${profile.usn}-${uniqueSuffix}`;
    const barcode = `*${regId}*`;
    const studentBarcode = this.getStudentBarcode(profile.usn);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newLeave: LeaveApplication = {
      id: newId,
      registrationId: regId,
      barcode: barcode,
      studentBarcode: studentBarcode,
      usn: profile.usn,
      studentName: profile.name,
      roomNumber: profile.roomNumber,
      leaveType: 'Home Visit',
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: params.totalDays,
      reason: `Govt Holiday Homepass [${params.holidayName}]: ${params.reason} (Destination: ${params.destinationAddress})`,
      appliedDate: now.split(' ')[0],
      status: 'Approved',
      cumulativeLeaveCountAtApplication: profile.leavesCount,
      requiredApprover: 'Warden',
      approvalSteps: [
        {
          role: 'Warden',
          status: 'Approved',
          timestamp: now,
          approverName: 'Auto-Sanctioned System (Govt Holiday Exemption)',
          remarks: `Pre-authorized institutional exemption for ${params.holidayName}. 0 days deducted from personal leave quota.`,
        },
      ],
      gateToken: tokenNumber,
      tokenGeneratedAt: now,
      isGovtHoliday: true,
      holidayName: params.holidayName,
      chargedDays: 0,
      isAutoApproved: true,
      movementHistory: [],
    };

    const existingLeaves = await this.getMyLeaves();
    const updated = [newLeave, ...existingLeaves];
    await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updated));

    // Also add to public outpass board (strictly USN only!)
    const publicRoster = await this.getPublicOutpass();
    const newPublicItem = {
      id: `OUT-${Math.floor(100 + Math.random() * 900)}`,
      usn: profile.usn,
      hostelBlock: profile.hostelBlock,
      leaveType: 'Home Visit',
      startDate: params.startDate,
      endDate: params.endDate,
      days: params.totalDays,
      status: 'Approved' as const,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.PUBLIC_OUTPASS, JSON.stringify([newPublicItem, ...publicRoster]));

    // Send notification to student
    await this.addNotification({
      usn: profile.usn,
      title: `🎉 Holiday Homepass Auto-Approved (${params.holidayName})`,
      message: `Your Govt Holiday Homepass (${params.startDate} to ${params.endDate}) has been automatically generated with 0 quota deduction. Gate token: ${tokenNumber}.`,
      type: 'holiday_pass',
      severity: 'success',
    });

    return newLeave;
  },

  async markOutingExited(outingId: string, gate: string = 'Campus Main Gate 1', guard: string = 'Security Guard Ramu'): Promise<OutingApplication | null> {
    const outings = await this.getOutings();
    const now = new Date();
    const checkOutTimestamp = now.getTime();
    const exitTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${now.toISOString().split('T')[0]} ${exitTime}`;
    let updatedTarget: OutingApplication | null = null;
    const updated = outings.map((o) => {
      if (o.id === outingId) {
        const exitEvent: GateCheckEvent = {
          id: `EVT-${Date.now()}-OUT`,
          action: 'Check Out',
          timestamp: fullTimestamp,
          checkOutTimestamp,
          gate,
          guardName: guard,
          remarks: 'Digital Outpass barcode verified at gate scanner. Student checked out.',
          barcode: o.barcode,
          usn: o.usn,
        };
        updatedTarget = {
          ...o,
          status: 'Exited Gate' as const,
          checkOutTime: exitTime,
          checkOutTimestamp,
          checkOutGate: gate,
          checkOutGuard: guard,
          gateSecurityRemark: `Security exit recorded at ${exitTime} by ${guard} at ${gate} (Barcode Verified)`,
          movementHistory: [...(o.movementHistory || []), exitEvent],
        };
        return updatedTarget;
      }
      return o;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.OUTINGS, JSON.stringify(updated));
    if (updatedTarget) {
      const tgt = updatedTarget as OutingApplication;
      await api.markOutingExit(outingId, gate, guard).catch(() => {});
      await this.recordGateLog({
        registrationId: tgt.registrationId || `REG-OUT-${tgt.id}`,
        barcode: tgt.barcode || `*REG-OUT-${tgt.id}*`,
        usn: tgt.usn,
        studentName: tgt.studentName,
        roomNumber: tgt.roomNumber,
        type: 'Outing',
        destination: tgt.destination,
        action: 'Check Out',
        station: gate,
        guardName: guard,
        remarks: 'Digital Outpass barcode scanned. Exited campus.',
      });
    }
    return updatedTarget;
  },

  async markOutingReturned(outingId: string, gate: string = 'Campus Main Gate 1', guard: string = 'Security Guard Ramu'): Promise<OutingApplication | null> {
    const outings = await this.getOutings();
    const target = outings.find((o) => o.id === outingId);
    if (target) {
      const cooldown = this.getCheckInCooldown(target);
      if (cooldown.isRestricted) {
        throw new Error(
          `Check-in blocked: 15-minute security cooldown is in effect.\n\nYou checked out at ${target.checkOutTime || 'recently'}. Please wait ${cooldown.remainingFormatted} before checking back in (Available at ${cooldown.allowedCheckInTime}).`
        );
      }
    }
    const now = new Date();
    const returnTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${now.toISOString().split('T')[0]} ${returnTime}`;

    // Evaluate curfew rules (9-4 with 4-4:30 grace for regular; 9-2 with 2-2:30 grace for holiday)
    const curfewEval = getCurfewStatus(target, returnTime);
    const isLate = curfewEval.isLate;
    const lateMinutes = curfewEval.minutesPastCurfew;

    let updatedTarget: OutingApplication | null = null;
    const updated = outings.map((o) => {
      if (o.id === outingId) {
        const returnRemarks = isLate
          ? `LATE ENTRY BREACH: Returned at ${returnTime} (+${lateMinutes}m past grace cutoff). Outing blocked pending SWO clearance.`
          : curfewEval.isGraceAlert
          ? `GRACE ALERT: Returned at ${returnTime} during grace period. Curfew was at ${curfewEval.curfewTime}.`
          : 'Barcode verified at entry scanner. Returned safely before curfew.';

        const returnEvent: GateCheckEvent = {
          id: `EVT-${Date.now()}-IN`,
          action: 'Check In',
          timestamp: fullTimestamp,
          gate,
          guardName: guard,
          remarks: returnRemarks,
          barcode: o.barcode,
          usn: o.usn,
        };
        updatedTarget = {
          ...o,
          status: 'Returned & Closed' as const,
          checkInTime: returnTime,
          checkInGate: gate,
          checkInGuard: guard,
          actualInTime: returnTime,
          isLateEntry: isLate,
          lateMinutes: isLate ? lateMinutes : 0,
          gateSecurityRemark: `Hosteller checked back into campus at ${returnTime} via ${gate}. ${returnRemarks}`,
          movementHistory: [...(o.movementHistory || []), returnEvent],
        };
        return updatedTarget;
      }
      return o;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.OUTINGS, JSON.stringify(updated));

    if (updatedTarget) {
      const tgt = updatedTarget as OutingApplication;
      await this.recordGateLog({
        registrationId: tgt.registrationId || `REG-OUT-${tgt.id}`,
        barcode: tgt.barcode || `*REG-OUT-${tgt.id}*`,
        usn: tgt.usn,
        studentName: tgt.studentName,
        roomNumber: tgt.roomNumber,
        type: 'Outing',
        destination: tgt.destination,
        action: 'Check In',
        station: gate,
        guardName: guard,
        isLate,
        curfewTime: curfewEval.curfewTime,
        remarks: isLate
          ? `LATE ENTRY VIOLATION (+${lateMinutes}m late). Next outing blocked pending SWO permission.`
          : curfewEval.isGraceAlert
          ? `Grace period return (${returnTime}). Curfew was ${curfewEval.curfewTime}.`
          : 'Barcode verified at scanner. Returned safely before curfew.',
      });
      await api.markOutingReturn(outingId, gate, guard).catch(() => {});

      // Handle Late Entry Disciplinary Action & Notifications
      if (isLate) {
        // 1. Block student's next outing
        const profile = await this.getProfile();
        if (profile.usn === tgt.usn) {
          profile.isOutingBlocked = true;
          profile.outingBlockReason = `Late Return Curfew Violation on ${tgt.outDate}: Checked in at ${returnTime}, exceeding the ${curfewEval.graceEndTime} cutoff by ${lateMinutes} minutes.`;
          profile.outingBlockedAt = fullTimestamp;
          await this.updateProfile(profile);
        }

        // 2. Dispatch notification to student
        await this.addNotification({
          usn: tgt.usn,
          title: '🚨 Late Entry Recorded: Next Outing Blocked',
          message: `You returned to campus at ${returnTime}, exceeding the ${curfewEval.graceEndTime} grace cutoff (+${lateMinutes} min late). Your next outing is suspended until permission is granted by the Student Welfare Officer (SWO).`,
          type: 'outing_blocked',
          severity: 'critical',
        });
      } else if (curfewEval.isGraceAlert) {
        // Dispatch warning notification to student
        await this.addNotification({
          usn: tgt.usn,
          title: '⚠️ Returned During Grace Window',
          message: `You returned to campus at ${returnTime}. Please note that regular curfew was ${curfewEval.curfewTime} (Grace ended at ${curfewEval.graceEndTime}). Return earlier next time to prevent outing suspension.`,
          type: 'curfew_warning',
          severity: 'warning',
        });
      }
    }
    return updatedTarget;
  },

  async markLeaveExited(leaveId: string, gate: string = 'Campus Main Gate 2', guard: string = 'Head Guard Somanna'): Promise<LeaveApplication | null> {
    const rawLeaves = await AsyncStorage.getItem(STORAGE_KEYS.LEAVES);
    const leaves: LeaveApplication[] = rawLeaves ? JSON.parse(rawLeaves) : INITIAL_MY_LEAVES;
    const now = new Date();
    const checkOutTimestamp = now.getTime();
    const exitTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${now.toISOString().split('T')[0]} ${exitTime}`;
    let target: LeaveApplication | null = null;
    const updated = leaves.map((l) => {
      if (l.id === leaveId) {
        const exitEvent: GateCheckEvent = {
          id: `EVT-${Date.now()}-LV-OUT`,
          action: 'Check Out',
          timestamp: fullTimestamp,
          checkOutTimestamp,
          gate,
          guardName: guard,
          remarks: 'Leave outpass barcode verified at gate. Departure recorded.',
          barcode: l.barcode,
          usn: l.usn,
        };
        target = {
          ...l,
          checkOutTime: exitTime,
          checkOutTimestamp,
          checkOutGate: gate,
          checkOutGuard: guard,
          movementHistory: [...(l.movementHistory || []), exitEvent],
        };
        return target;
      }
      return l;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updated));
    if (target) {
      const tgt = target as LeaveApplication;
      await this.recordGateLog({
        registrationId: tgt.registrationId || `REG-LV-${tgt.id}`,
        barcode: tgt.barcode || `*REG-LV-${tgt.id}*`,
        usn: tgt.usn,
        studentName: tgt.studentName,
        roomNumber: tgt.roomNumber,
        type: 'Leave',
        destination: tgt.leaveType === 'Home Visit' ? 'Home' : tgt.leaveType,
        action: 'Check Out',
        station: gate,
        guardName: guard,
        remarks: 'Leave outpass barcode scanned. Departure recorded.',
      });
    }
    return target;
  },

  async markLeaveReturned(leaveId: string, gate: string = 'Campus Main Gate 2', guard: string = 'Head Guard Somanna'): Promise<LeaveApplication | null> {
    const rawLeaves = await AsyncStorage.getItem(STORAGE_KEYS.LEAVES);
    const leaves: LeaveApplication[] = rawLeaves ? JSON.parse(rawLeaves) : INITIAL_MY_LEAVES;
    const targetLeave = leaves.find((l) => l.id === leaveId);
    if (targetLeave) {
      const cooldown = this.getCheckInCooldown(targetLeave);
      if (cooldown.isRestricted) {
        throw new Error(
          `Check-in blocked: 15-minute security cooldown is in effect.\n\nChecked out at ${targetLeave.checkOutTime || 'recently'}. Please wait ${cooldown.remainingFormatted} before checking back in (Available at ${cooldown.allowedCheckInTime}).`
        );
      }
    }
    const now = new Date();
    const returnTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTimestamp = `${now.toISOString().split('T')[0]} ${returnTime}`;
    let target: LeaveApplication | null = null;
    const updated = leaves.map((l) => {
      if (l.id === leaveId) {
        const returnEvent: GateCheckEvent = {
          id: `EVT-${Date.now()}-LV-IN`,
          action: 'Check In',
          timestamp: fullTimestamp,
          gate,
          guardName: guard,
          remarks: 'Return barcode scanned. Hosteller checked in from leave.',
          barcode: l.barcode,
          usn: l.usn,
        };
        target = {
          ...l,
          checkInTime: returnTime,
          checkInGate: gate,
          checkInGuard: guard,
          movementHistory: [...(l.movementHistory || []), returnEvent],
        };
        return target;
      }
      return l;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updated));
    if (target) {
      const tgt = target as LeaveApplication;
      await this.recordGateLog({
        registrationId: tgt.registrationId || `REG-LV-${tgt.id}`,
        barcode: tgt.barcode || `*REG-LV-${tgt.id}*`,
        usn: tgt.usn,
        studentName: tgt.studentName,
        roomNumber: tgt.roomNumber,
        type: 'Leave',
        destination: tgt.leaveType === 'Home Visit' ? 'Home' : tgt.leaveType,
        action: 'Check In',
        station: gate,
        guardName: guard,
        remarks: 'Return barcode scanned. Hosteller checked in from leave.',
      });
      await api.markLeaveReturn(leaveId, gate, guard).catch(() => {});
    }
    return target;
  },

  // ==========================================
  // GATE SCANNER & REGISTRATION SERVICES
  // ==========================================
  async getGateLogs(): Promise<GateLogEntry[]> {
    try {
      const serverLogs = await api.getGateLogs().catch(() => null);
      if (serverLogs && Array.isArray(serverLogs) && serverLogs.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.GATE_LOGS, JSON.stringify(serverLogs));
        return serverLogs;
      }
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GATE_LOGS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.GATE_LOGS, JSON.stringify(INITIAL_GATE_LOGS));
      return INITIAL_GATE_LOGS;
    } catch {
      return INITIAL_GATE_LOGS;
    }
  },

  async getMyGateLogs(usn?: string): Promise<GateLogEntry[]> {
    try {
      let targetUsn = usn?.trim().toUpperCase();
      if (!targetUsn) {
        const profile = await this.getProfile();
        targetUsn = profile.usn.trim().toUpperCase();
      }
      const logs = await this.getGateLogs();
      return logs.filter((l) => l.usn.trim().toUpperCase() === targetUsn);
    } catch {
      return [];
    }
  },

  async recordGateLog(entry: Omit<GateLogEntry, 'id' | 'timestamp'>): Promise<GateLogEntry> {
    const logs = await this.getGateLogs();
    const newLog: GateLogEntry = {
      id: `GLOG-${600 + logs.length + 1}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      ...entry,
    };
    const updated = [newLog, ...logs];
    await AsyncStorage.setItem(STORAGE_KEYS.GATE_LOGS, JSON.stringify(updated));
    await api.recordGateLog(newLog).catch(() => {});
    return newLog;
  },

  getStudentBarcode(usn: string): string {
    return `*STU-${usn.toUpperCase().trim()}*`;
  },

  async getStudentScanDossier(query: string): Promise<StudentScanDossier | null> {
    if (!query) return null;
    const clean = query.replace(/[*]/g, '').trim().toUpperCase();

    const allStudents = await this.getAllStudents();
    const allOutings = await this.getOutings();
    const allLeaves = await this.getAllLeavesAdmin();

    let targetUsn = '';

    // Direct student match (USN or STU-USN or BAR-USN)
    const directStudent = allStudents.find(
      (s) =>
        s.usn.toUpperCase() === clean ||
        clean === `STU-${s.usn.toUpperCase()}` ||
        clean === `BAR-${s.usn.toUpperCase()}` ||
        clean.includes(s.usn.toUpperCase())
    );

    if (directStudent) {
      targetUsn = directStudent.usn;
    } else {
      // Search outings by registrationId, barcode, or token
      const matchedOuting = allOutings.find(
        (o) =>
          (o.registrationId && o.registrationId.toUpperCase().includes(clean)) ||
          (o.barcode && o.barcode.replace(/[*]/g, '').toUpperCase().includes(clean)) ||
          (o.studentBarcode && o.studentBarcode.replace(/[*]/g, '').toUpperCase().includes(clean)) ||
          o.id.toUpperCase().includes(clean) ||
          o.outpassToken.toUpperCase().includes(clean)
      );
      if (matchedOuting) {
        targetUsn = matchedOuting.usn;
      } else {
        // Search leaves by registrationId, barcode, or token
        const matchedLeave = allLeaves.find(
          (l) =>
            (l.registrationId && l.registrationId.toUpperCase().includes(clean)) ||
            (l.barcode && l.barcode.replace(/[*]/g, '').toUpperCase().includes(clean)) ||
            (l.studentBarcode && l.studentBarcode.replace(/[*]/g, '').toUpperCase().includes(clean)) ||
            l.id.toUpperCase().includes(clean) ||
            (l.gateToken && l.gateToken.toUpperCase().includes(clean))
        );
        if (matchedLeave) {
          targetUsn = matchedLeave.usn;
        }
      }
    }

    if (!targetUsn) {
      const prof = await this.getProfile();
      if (clean.includes(prof.usn) || clean === '1RV22CS089') {
        targetUsn = prof.usn;
      } else {
        return null;
      }
    }

    const profile = await this.getProfile();
    const stdInfo = allStudents.find((s) => s.usn.toUpperCase() === targetUsn.toUpperCase()) || {
      usn: profile.usn,
      name: profile.name,
      branch: profile.branch,
      roomNumber: profile.roomNumber,
      hostelBlock: profile.hostelBlock,
      contactNumber: profile.contactNumber,
      guardianContact: profile.guardianContact,
      leavesCount: profile.leavesCount,
      overallAttendance: 87.2,
      activeDeviceId: 'DEV-SM-S23-9941',
      deviceModel: 'Samsung Galaxy S23 (Primary)',
      deviceStatus: 'Active & Bound' as const,
    };

    const studentOutings = allOutings.filter((o) => o.usn.toUpperCase() === targetUsn.toUpperCase());
    const studentLeaves = allLeaves.filter((l) => l.usn.toUpperCase() === targetUsn.toUpperCase());

    // 1. Outing Outpass (Active + History)
    const activeOuting =
      studentOutings.find((o) => o.status === 'Outpass Generated' || o.status === 'Exited Gate') || null;

    // 2. Home Going during Government Holidays (Active + History)
    const govtHolidayPasses = studentLeaves.filter(
      (l) => l.leaveType === 'Home Visit' || Boolean(l.isGovtHoliday)
    );
    const activeHolidayPass =
      govtHolidayPasses.find((l) => l.status === 'Approved' && (!l.checkInTime || l.checkOutTime)) || null;

    const exemptDaysSaved = govtHolidayPasses.reduce((acc, curr) => {
      if (curr.isGovtHoliday || curr.leaveType === 'Home Visit') {
        return acc + (curr.totalDays || 0);
      }
      return acc;
    }, 0);

    // 3. Regular Leave Outpasses (Medical, Academic, Personal requiring Warden approval)
    const regularLeavePasses = studentLeaves.filter(
      (l) => l.leaveType !== 'Home Visit' && !l.isGovtHoliday
    );
    const activeRegularLeave =
      regularLeavePasses.find((l) => l.status === 'Approved' && (!l.checkInTime || l.checkOutTime)) || null;

    // Compile movement history
    const combinedHistory: GateCheckEvent[] = [];
    studentOutings.forEach((o) => {
      if (o.movementHistory && o.movementHistory.length > 0) {
        combinedHistory.push(...o.movementHistory);
      } else if (o.checkOutTime) {
        combinedHistory.push({
          id: `EVT-${o.id}-OUT`,
          action: 'Check Out',
          timestamp: `${o.outDate} ${o.checkOutTime}`,
          gate: o.checkOutGate || 'Campus Main Gate 1',
          guardName: o.checkOutGuard || 'Security Guard Ramu',
          remarks: `Outing exit scanned for ${o.destination}`,
          barcode: `*STU-${targetUsn}*`,
          usn: targetUsn,
        });
        if (o.checkInTime) {
          combinedHistory.push({
            id: `EVT-${o.id}-IN`,
            action: 'Check In',
            timestamp: `${o.outDate} ${o.checkInTime}`,
            gate: o.checkInGate || 'Campus Main Gate 1',
            guardName: o.checkInGuard || 'Security Guard Ramu',
            remarks: 'Outing return verified. Hosteller checked in.',
            barcode: `*STU-${targetUsn}*`,
            usn: targetUsn,
          });
        }
      }
    });

    studentLeaves.forEach((l) => {
      if (l.movementHistory && l.movementHistory.length > 0) {
        combinedHistory.push(...l.movementHistory);
      } else if (l.checkOutTime) {
        combinedHistory.push({
          id: `EVT-${l.id}-OUT`,
          action: 'Check Out',
          timestamp: l.checkOutTime,
          gate: l.checkOutGate || 'Campus Main Gate 2',
          guardName: l.checkOutGuard || 'Head Guard Somanna',
          remarks: `${l.leaveType} departure scanned`,
          barcode: `*STU-${targetUsn}*`,
          usn: targetUsn,
        });
        if (l.checkInTime) {
          combinedHistory.push({
            id: `EVT-${l.id}-IN`,
            action: 'Check In',
            timestamp: l.checkInTime,
            gate: l.checkInGate || 'Campus Main Gate 2',
            guardName: l.checkInGuard || 'Head Guard Somanna',
            remarks: `Return from ${l.leaveType} verified`,
            barcode: `*STU-${targetUsn}*`,
            usn: targetUsn,
          });
        }
      }
    });

    // Sort newest first
    combinedHistory.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const isOutside =
      (activeOuting && activeOuting.status === 'Exited Gate') ||
      Boolean(activeHolidayPass && activeHolidayPass.checkOutTime && !activeHolidayPass.checkInTime) ||
      Boolean(activeRegularLeave && activeRegularLeave.checkOutTime && !activeRegularLeave.checkInTime);

    const campusStatus = isOutside ? 'OUTSIDE CAMPUS' : 'INSIDE CAMPUS';

    let activePassType: StudentScanDossier['activePassType'] = 'None';
    let activePass: OutingApplication | LeaveApplication | null = null;
    if (activeOuting) {
      activePassType = 'Outing';
      activePass = activeOuting;
    } else if (activeHolidayPass) {
      activePassType = 'Home Going (Govt Holiday)';
      activePass = activeHolidayPass;
    } else if (activeRegularLeave) {
      activePassType = 'Regular Leave';
      activePass = activeRegularLeave;
    }

    return {
      student: {
        usn: targetUsn,
        name: stdInfo.name,
        branch: stdInfo.branch,
        roomNumber: stdInfo.roomNumber,
        hostelBlock: stdInfo.hostelBlock,
        contactNumber: stdInfo.contactNumber,
        guardianContact: stdInfo.guardianContact,
        avatarUri: targetUsn === profile.usn ? profile.avatarUri : undefined,
        leavesCount: stdInfo.leavesCount,
        overallAttendance: stdInfo.overallAttendance,
        academicYear: targetUsn === profile.usn ? profile.academicYear : '3rd Year',
      },
      barcode: this.getStudentBarcode(targetUsn),
      campusStatus,
      activePassType,
      activePass,
      outingOutpass: {
        active: activeOuting,
        history: studentOutings,
        totalCount: studentOutings.length,
      },
      govtHolidayHomePass: {
        active: activeHolidayPass,
        history: govtHolidayPasses,
        totalCount: govtHolidayPasses.length,
        exemptDaysSaved,
      },
      regularLeavePass: {
        active: activeRegularLeave,
        history: regularLeavePasses,
        totalCount: regularLeavePasses.length,
      },
      movementHistory: combinedHistory,
      lastMovement: combinedHistory[0] || null,
      checkInCooldown: this.getCheckInCooldown(activePass),
      isOutingBlocked: Boolean(stdInfo.usn === profile.usn ? profile.isOutingBlocked : (stdInfo as any).isOutingBlocked),
      outingBlockReason: stdInfo.usn === profile.usn ? profile.outingBlockReason : (stdInfo as any).outingBlockReason,
    };
  },

  async checkInOutByBarcode(
    barcodeOrId: string,
    action: 'Check Out' | 'Check In',
    guardName: string = 'Security Guard Ramu',
    gate: string = 'Campus Main Gate 1'
  ): Promise<{
    success: boolean;
    message: string;
    registration?: OutingApplication | LeaveApplication;
    dossier?: StudentScanDossier | null;
    log?: GateLogEntry;
  }> {
    const cleanSearch = barcodeOrId.replace(/\*/g, '').trim().toUpperCase();
    if (!cleanSearch) {
      return { success: false, message: 'Please provide a valid Barcode or Registration ID.' };
    }

    // 1. Search Outings
    const outings = await this.getOutings();
    const matchedOuting = outings.find(
      (o) =>
        (o.registrationId && o.registrationId.toUpperCase().includes(cleanSearch)) ||
        (o.barcode && o.barcode.replace(/\*/g, '').toUpperCase().includes(cleanSearch)) ||
        (o.studentBarcode && o.studentBarcode.replace(/\*/g, '').toUpperCase().includes(cleanSearch)) ||
        o.id.toUpperCase().includes(cleanSearch) ||
        o.outpassToken.toUpperCase().includes(cleanSearch) ||
        o.usn.toUpperCase().includes(cleanSearch)
    );

    if (matchedOuting) {
      if (action === 'Check Out') {
        if (matchedOuting.status === 'Exited Gate') {
          return {
            success: false,
            message: `${matchedOuting.studentName} has already checked out of campus at ${matchedOuting.checkOutTime || 'earlier'}.`,
          };
        }
        const updatedOuting = await this.markOutingExited(matchedOuting.id, gate, guardName);
        const latestLogs = await this.getGateLogs();
        const updatedDossier = await this.getStudentScanDossier(matchedOuting.usn);
        return {
          success: true,
          message: `Check Out successfully verified for ${matchedOuting.studentName} (${matchedOuting.registrationId || matchedOuting.id})!`,
          registration: updatedOuting || matchedOuting,
          dossier: updatedDossier,
          log: latestLogs[0],
        };
      } else {
        // Check In
        const cooldown = this.getCheckInCooldown(matchedOuting);
        if (cooldown.isRestricted) {
          return {
            success: false,
            message: `⛔ Gate Check-In Blocked: 15-Minute Cooldown Policy Active.\n\n${matchedOuting.studentName} checked out at ${matchedOuting.checkOutTime || 'recently'}. Students cannot check in within 15 minutes of checking out.\n\n⏳ Time remaining: ${cooldown.remainingFormatted}\nEligible check-in time: ${cooldown.allowedCheckInTime}`,
          };
        }
        let updatedOuting: OutingApplication | null = null;
        try {
          updatedOuting = await this.markOutingReturned(matchedOuting.id, gate, guardName);
        } catch (err: any) {
          return { success: false, message: err.message || 'Failed to complete check-in.' };
        }
        const latestLogs = await this.getGateLogs();
        const updatedDossier = await this.getStudentScanDossier(matchedOuting.usn);
        return {
          success: true,
          message: `Check In successfully verified for ${matchedOuting.studentName} (${matchedOuting.registrationId || matchedOuting.id})!`,
          registration: updatedOuting || matchedOuting,
          dossier: updatedDossier,
          log: latestLogs[0],
        };
      }
    }

    // 2. Search Leaves
    const leaves = await this.getAllLeavesAdmin();
    const matchedLeave = leaves.find(
      (l) =>
        (l.registrationId && l.registrationId.toUpperCase().includes(cleanSearch)) ||
        (l.barcode && l.barcode.replace(/\*/g, '').toUpperCase().includes(cleanSearch)) ||
        (l.studentBarcode && l.studentBarcode.replace(/\*/g, '').toUpperCase().includes(cleanSearch)) ||
        l.id.toUpperCase().includes(cleanSearch) ||
        (l.gateToken && l.gateToken.toUpperCase().includes(cleanSearch)) ||
        l.usn.toUpperCase().includes(cleanSearch)
    );

    if (matchedLeave) {
      if (action === 'Check Out') {
        if (matchedLeave.checkOutTime && !matchedLeave.checkInTime) {
          return {
            success: false,
            message: `${matchedLeave.studentName} is already checked out for leave at ${matchedLeave.checkOutTime}.`,
          };
        }
        const updatedLeave = await this.markLeaveExited(matchedLeave.id, gate, guardName);
        const latestLogs = await this.getGateLogs();
        const updatedDossier = await this.getStudentScanDossier(matchedLeave.usn);
        return {
          success: true,
          message: `Check Out successfully recorded for ${matchedLeave.studentName} (${matchedLeave.registrationId || matchedLeave.id})!`,
          registration: updatedLeave || matchedLeave,
          dossier: updatedDossier,
          log: latestLogs[0],
        };
      } else {
        // Check In
        const cooldown = this.getCheckInCooldown(matchedLeave);
        if (cooldown.isRestricted) {
          return {
            success: false,
            message: `⛔ Gate Check-In Blocked: 15-Minute Cooldown Policy Active.\n\n${matchedLeave.studentName} checked out at ${matchedLeave.checkOutTime || 'recently'}. Students cannot check in within 15 minutes of checking out.\n\n⏳ Time remaining: ${cooldown.remainingFormatted}\nEligible check-in time: ${cooldown.allowedCheckInTime}`,
          };
        }
        let updatedLeave: LeaveApplication | null = null;
        try {
          updatedLeave = await this.markLeaveReturned(matchedLeave.id, gate, guardName);
        } catch (err: any) {
          return { success: false, message: err.message || 'Failed to complete check-in.' };
        }
        const latestLogs = await this.getGateLogs();
        const updatedDossier = await this.getStudentScanDossier(matchedLeave.usn);
        return {
          success: true,
          message: `Check In successfully recorded for ${matchedLeave.studentName} (${matchedLeave.registrationId || matchedLeave.id})!`,
          registration: updatedLeave || matchedLeave,
          dossier: updatedDossier,
          log: latestLogs[0],
        };
      }
    }

    return {
      success: false,
      message: `No active hostel pass found matching barcode or Registration ID "${cleanSearch}". Please verify the pass code.`,
    };
  },

  async getAllRegistrations(): Promise<Array<{
    id: string;
    registrationId: string;
    barcode: string;
    studentBarcode: string;
    type: 'Outing' | 'Home Going (Govt Holiday)' | 'Leave';
    usn: string;
    studentName: string;
    roomNumber: string;
    destination: string;
    purpose: string;
    status: string;
    departureTime: string;
    returnTime: string;
    checkOutTime?: string;
    checkInTime?: string;
    token: string;
  }>> {
    const outings = await this.getOutings();
    const leaves = await this.getAllLeavesAdmin();

    const outingRegistrations = outings.map((o) => ({
      id: o.id,
      registrationId: o.registrationId || `REG-OUT-${o.id.replace(/[^0-9]/g, '') || '9901'}`,
      barcode: o.barcode || `*${o.registrationId || `REG-OUT-${o.id.replace(/[^0-9]/g, '') || '9901'}`}*`,
      studentBarcode: this.getStudentBarcode(o.usn),
      type: 'Outing' as const,
      usn: o.usn,
      studentName: o.studentName,
      roomNumber: o.roomNumber,
      destination: o.destination,
      purpose: o.purpose,
      status: o.status,
      departureTime: `${o.outDate} ${o.outTime}`,
      returnTime: o.expectedInTime,
      checkOutTime: o.checkOutTime,
      checkInTime: o.checkInTime,
      token: o.outpassToken,
    }));

    const leaveRegistrations = leaves
      .filter((l) => l.status === 'Approved')
      .map((l) => {
        const isHoliday = l.leaveType === 'Home Visit' || Boolean(l.isGovtHoliday);
        return {
          id: l.id,
          registrationId: l.registrationId || `REG-LV-${l.id.replace(/[^0-9]/g, '') || '8801'}`,
          barcode: l.barcode || `*${l.registrationId || `REG-LV-${l.id.replace(/[^0-9]/g, '') || '8801'}`}*`,
          studentBarcode: this.getStudentBarcode(l.usn),
          type: (isHoliday ? 'Home Going (Govt Holiday)' : 'Leave') as 'Home Going (Govt Holiday)' | 'Leave',
          usn: l.usn,
          studentName: l.studentName,
          roomNumber: l.roomNumber,
          destination: l.leaveType === 'Home Visit' ? 'Home' : l.leaveType,
          purpose: l.reason,
          status: l.checkInTime ? 'Returned & Closed' : l.checkOutTime ? 'Exited Gate' : 'Outpass Generated',
          departureTime: l.startDate,
          returnTime: l.endDate,
          checkOutTime: l.checkOutTime,
          checkInTime: l.checkInTime,
          token: l.gateToken || 'TK-84920',
        };
      });

    return [...outingRegistrations, ...leaveRegistrations];
  },

  async getAllOutingsAdmin(): Promise<OutingApplication[]> {
    return await this.getOutings();
  },

  // ==========================================
  // NOTIFICATION & DISCIPLINARY CLEARANCE
  // ==========================================
  async getNotifications(usn?: string): Promise<StudentNotification[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      const all: StudentNotification[] = data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
      if (usn) {
        return all.filter((n) => n.usn.toUpperCase() === usn.toUpperCase());
      }
      return all;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  async addNotification(notif: Omit<StudentNotification, 'id' | 'timestamp' | 'read'>): Promise<StudentNotification> {
    const all = await this.getNotifications();
    const now = new Date();
    const timeStr = `${now.getHours() % 12 || 12}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
    const newNotif: StudentNotification = {
      id: `NOTIF-${Date.now()}`,
      timestamp: `Today, ${timeStr}`,
      read: false,
      ...notif,
    };
    const updated = [newNotif, ...all];
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
    return newNotif;
  },

  async markNotificationsAsRead(usn?: string): Promise<void> {
    const all = await this.getNotifications();
    const updated = all.map((n) => {
      if (!usn || n.usn.toUpperCase() === usn.toUpperCase()) {
        return { ...n, read: true };
      }
      return n;
    });
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  },

  async clearNotifications(usn?: string): Promise<void> {
    if (!usn) {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      return;
    }
    const all = await this.getNotifications();
    const filtered = all.filter((n) => n.usn.toUpperCase() !== usn.toUpperCase());
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(filtered));
  },

  async swoLockOuting(
    usn: string,
    reason: string = 'Curfew breach / Late check-in disciplinary suspension by SWO',
    swoOfficerName: string = 'Dr. Suresh Babu (SWO)'
  ): Promise<{ success: boolean; message: string }> {
    const cleanUsn = usn.trim().toUpperCase();
    const profile = await this.getProfile();
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    if (profile.usn.toUpperCase() === cleanUsn) {
      profile.isOutingBlocked = true;
      profile.outingBlockReason = reason;
      profile.outingBlockedAt = nowStr;
      await this.updateProfile(profile);
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKED_STUDENTS);
      let list = stored ? JSON.parse(stored) : [];
      const exists = list.find((b: any) => b.usn.toUpperCase() === cleanUsn);
      if (!exists) {
        const allStudents = await this.getAllStudents();
        const std = allStudents.find((s) => s.usn.toUpperCase() === cleanUsn) || {
          name: cleanUsn === profile.usn.toUpperCase() ? profile.name : 'Hosteller',
          roomNumber: cleanUsn === profile.usn.toUpperCase() ? profile.roomNumber : 'Hostel Block',
          hostelBlock: cleanUsn === profile.usn.toUpperCase() ? profile.hostelBlock : 'Cauvery Block',
          branch: cleanUsn === profile.usn.toUpperCase() ? profile.branch : 'Engineering',
        };
        list.unshift({
          usn: cleanUsn,
          name: std.name,
          roomNumber: std.roomNumber,
          hostelBlock: std.hostelBlock,
          branch: std.branch,
          blockedAt: nowStr,
          reason,
        });
        await AsyncStorage.setItem(STORAGE_KEYS.BLOCKED_STUDENTS, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('swoLockOuting storage error:', e);
    }

    api.swoLockOuting({ usn: cleanUsn, reason }).catch(() => {});

    await this.addNotification({
      usn: cleanUsn,
      title: 'Outing Privileges Suspended by SWO',
      message: `Your outing privileges have been suspended by ${swoOfficerName}.\n\nReason: "${reason}"\n\nYou cannot generate subsequent outpasses until cleared by the Student Welfare Officer.`,
      type: 'swo_cleared',
      severity: 'critical',
    });

    return {
      success: true,
      message: `Outing access locked for ${cleanUsn} by ${swoOfficerName}.`,
    };
  },

  async swoPermitOuting(
    usn: string,
    swoOfficerName: string = 'Dr. Suresh Babu (SWO)',
    remarks: string = 'Approved for subsequent outings after student counseling.'
  ): Promise<{ success: boolean; message: string }> {
    const cleanUsn = usn.trim().toUpperCase();
    const profile = await this.getProfile();

    if (profile.usn.toUpperCase() === cleanUsn) {
      profile.isOutingBlocked = false;
      profile.outingBlockReason = undefined;
      profile.outingBlockedAt = undefined;
      await this.updateProfile(profile);
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKED_STUDENTS);
      if (stored) {
        const list = JSON.parse(stored).filter((b: any) => b.usn.toUpperCase() !== cleanUsn);
        await AsyncStorage.setItem(STORAGE_KEYS.BLOCKED_STUDENTS, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('swoPermitOuting storage error:', e);
    }

    api.swoPermitOuting(cleanUsn).catch(() => {});

    // Dispatch clear notification to student
    await this.addNotification({
      usn: cleanUsn,
      title: 'Outing Permission Restored by SWO',
      message: `Your outing restriction has been cleared by ${swoOfficerName}.\n\nRemarks: "${remarks}"\n\nYou are now permitted to apply for regular day outings and govt holiday passes. Please maintain punctuality.`,
      type: 'swo_cleared',
      severity: 'success',
    });

    return {
      success: true,
      message: `Outing clearance granted for ${cleanUsn} by ${swoOfficerName}. Student can now generate new outpasses.`,
    };
  },

  async getBlockedOutingStudents(): Promise<Array<{
    usn: string;
    name: string;
    roomNumber: string;
    hostelBlock: string;
    branch: string;
    blockedAt: string;
    reason: string;
  }>> {
    try {
      const serverBlocked = await api.getBlockedStudents().catch(() => null);
      if (serverBlocked && Array.isArray(serverBlocked) && serverBlocked.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.BLOCKED_STUDENTS, JSON.stringify(serverBlocked));
        return serverBlocked;
      }
    } catch {
      // fallback
    }

    const profile = await this.getProfile();
    let blockedList: Array<any> = [];

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.BLOCKED_STUDENTS);
      if (stored) {
        blockedList = JSON.parse(stored);
      } else {
        blockedList = [
          {
            usn: '1RV22EC045',
            name: 'Rohan Mehta',
            roomNumber: 'A-102',
            hostelBlock: 'Sharavathi Block A-1',
            branch: 'Electronics & Communication',
            blockedAt: '2026-09-28 17:15',
            reason: 'Late Return Curfew Violation: Returned at 05:15 PM (Breached 04:30 PM cutoff by 45m).',
          },
        ];
        await AsyncStorage.setItem(STORAGE_KEYS.BLOCKED_STUDENTS, JSON.stringify(blockedList));
      }
    } catch {
      blockedList = [];
    }

    if (profile.isOutingBlocked && !blockedList.some((b) => b.usn.toUpperCase() === profile.usn.toUpperCase())) {
      blockedList.unshift({
        usn: profile.usn,
        name: profile.name,
        roomNumber: profile.roomNumber,
        hostelBlock: profile.hostelBlock,
        branch: profile.branch,
        blockedAt: profile.outingBlockedAt || 'Recent Violation',
        reason: profile.outingBlockReason || 'Late Return Curfew Violation',
      });
    }

    return blockedList;
  },

  // ==========================================
  // AO EMERGENCY LEAVE GRANT SERVICE
  // ==========================================
  async grantEmergencyLeaveByAO(params: {
    usn: string;
    studentName?: string;
    roomNumber?: string;
    hostelBlock?: string;
    reason: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    destination: string;
    emergencyContact?: string;
    guardianIntimated?: boolean;
    remarks?: string;
    aoOfficerName?: string;
  }): Promise<LeaveApplication> {
    const cleanUsn = params.usn.trim().toUpperCase();
    const profile = await this.getProfile();
    const allStudents = await this.getAllStudents();
    const matchedStudent = allStudents.find((s) => s.usn.toUpperCase() === cleanUsn);

    const studentName =
      params.studentName ||
      (profile.usn.toUpperCase() === cleanUsn ? profile.name : matchedStudent?.name || `Hosteller (${cleanUsn})`);
    const roomNumber =
      params.roomNumber ||
      (profile.usn.toUpperCase() === cleanUsn ? profile.roomNumber : matchedStudent?.roomNumber || 'Room B-101');
    const hostelBlock =
      params.hostelBlock ||
      (profile.usn.toUpperCase() === cleanUsn ? profile.hostelBlock : matchedStudent?.hostelBlock || 'Cauvery Block');
    const emergencyContact =
      params.emergencyContact ||
      (profile.usn.toUpperCase() === cleanUsn ? profile.guardianContact : matchedStudent?.guardianContact || '+91 98765 43210');

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const tokenNumber = `EMG-${Math.floor(10000 + Math.random() * 90000)}`;
    const newId = `EMG-${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueSuffix = Math.floor(10000 + Math.random() * 90000);
    const regId = `REG-EMG-${cleanUsn}-${uniqueSuffix}`;
    const barcode = `*${regId}*`;
    const studentBarcode = this.getStudentBarcode(cleanUsn);
    const aoOfficer = params.aoOfficerName || 'Administrative Officer (AO)';

    const newLeave: LeaveApplication = {
      id: newId,
      registrationId: regId,
      barcode: barcode,
      studentBarcode: studentBarcode,
      usn: cleanUsn,
      studentName: studentName,
      roomNumber: roomNumber,
      leaveType: 'Emergency Leave (AO Sanctioned)',
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: params.totalDays || 1,
      reason: params.reason,
      destination: params.destination,
      emergencyContact: emergencyContact,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Approved',
      cumulativeLeaveCountAtApplication: profile.usn.toUpperCase() === cleanUsn ? profile.leavesCount : 0,
      requiredApprover: 'AO',
      isEmergency: true,
      isAutoApproved: true,
      sanctionedBy: aoOfficer,
      gateToken: tokenNumber,
      tokenGeneratedAt: now,
      approvalSteps: [
        {
          role: 'AO',
          status: 'Approved',
          timestamp: now,
          approverName: aoOfficer,
          remarks:
            params.remarks ||
            `Direct discretionary emergency grant by ${aoOfficer}. Parent/Guardian intimated. Instant gate exit clearance sanctioned.`,
        },
      ],
      movementHistory: [],
    };

    // 1. Save to Student Leaves Storage
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LEAVES);
      const allMyLeaves: LeaveApplication[] = data ? JSON.parse(data) : [];
      const updatedMyLeaves = [newLeave, ...allMyLeaves];
      await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updatedMyLeaves));
    } catch {
      // ignore
    }

    // 2. Save to Admin Master Leaves Storage
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_LEAVES);
      const adminLeaves: LeaveApplication[] = stored ? JSON.parse(stored) : [];
      const updatedAdminLeaves = [newLeave, ...adminLeaves];
      await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_LEAVES, JSON.stringify(updatedAdminLeaves));
    } catch {
      // ignore
    }

    // 3. Save to Public Outpass Roster
    try {
      const publicRoster = await this.getPublicOutpass();
      const newPublicItem = {
        id: `OUT-EMG-${Math.floor(100 + Math.random() * 900)}`,
        usn: cleanUsn,
        hostelBlock: hostelBlock,
        leaveType: 'Emergency Leave (AO Sanctioned)' as any,
        startDate: params.startDate,
        endDate: params.endDate,
        days: params.totalDays || 1,
        status: 'Approved' as const,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.PUBLIC_OUTPASS, JSON.stringify([newPublicItem, ...publicRoster]));
    } catch {
      // ignore
    }

    // 4. Send High-Priority In-App Notification to the Student
    await this.addNotification({
      usn: cleanUsn,
      title: '🚨 Emergency Leave Granted by AO',
      message: `${aoOfficer} has sanctioned an Emergency Leave Pass (${tokenNumber}) to ${params.destination}.\nDuration: ${params.startDate} to ${params.endDate}.\n\nYour Digital Gate Pass and Barcode are ready for immediate departure.`,
      type: 'emergency_leave',
      severity: 'critical',
    });

    api.grantEmergencyLeaveByAO({
      usn: cleanUsn,
      studentName,
      roomNumber,
      reason: params.reason,
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: params.totalDays,
      destination: params.destination,
      remarks: params.remarks,
    }).catch(() => {});

    return newLeave;
  },

  async issueDuplicateCouponByAO(params: {
    usn: string;
    studentName?: string;
    roomNumber?: string;
    hostelBlock?: string;
    startDate: string;
    startSession?: 'Morning' | 'Evening';
    departureTime?: string;
    endDate: string;
    returnSession?: 'Morning' | 'Evening';
    expectedReturnTime?: string;
    leaveType?: LeaveApplication['leaveType'];
    reason: string;
    destination?: string;
    remarks?: string;
    aoOfficerName?: string;
    isCompensationPass?: boolean;
  }): Promise<LeaveApplication> {
    const cleanUsn = params.usn.trim().toUpperCase();
    const profile = await this.getProfile();
    const allStudents = await this.getAllStudents();
    const matchedStudent = allStudents.find((s) => s.usn.toUpperCase() === cleanUsn);

    const studentName =
      params.studentName ||
      (profile.usn.toUpperCase() === cleanUsn ? profile.name : matchedStudent?.name || `Hosteller (${cleanUsn})`);
    const roomNumber =
      params.roomNumber ||
      (profile.usn.toUpperCase() === cleanUsn ? profile.roomNumber : matchedStudent?.roomNumber || 'Room B-101');
    const hostelBlock =
      params.hostelBlock ||
      (profile.usn.toUpperCase() === cleanUsn ? profile.hostelBlock : matchedStudent?.hostelBlock || 'Cauvery Block');

    const startSession = params.startSession || 'Morning';
    const returnSession = params.returnSession || 'Morning';
    const departureTime = params.departureTime || (startSession === 'Evening' ? '05:00 PM' : '09:00 AM');
    const expectedReturnTime = params.expectedReturnTime || (returnSession === 'Evening' ? '06:00 PM' : '08:30 AM');
    const destination = params.destination || 'Home / Authorized Destination';
    const leaveType = params.leaveType || 'Home Visit';
    const aoOfficer = params.aoOfficerName || 'Administrative Officer (AO)';
    const isCompensation = params.isCompensationPass !== false;

    // Compute session days and weekend exemption (Saturday PM to Monday AM is 0 days)
    const sessionCalc = calculateLeaveSessionDays({
      startDate: params.startDate,
      startSession,
      endDate: params.endDate,
      returnSession,
    });

    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const passCode = isCompensation ? `COMP-PASS-${Math.floor(10000 + Math.random() * 90000)}` : `COUPON-${Math.floor(10000 + Math.random() * 90000)}`;
    const tokenNumber = isCompensation ? `TK-CP-${Math.floor(10000 + Math.random() * 90000)}` : `DUP-${Math.floor(10000 + Math.random() * 90000)}`;
    const newId = `DUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueSuffix = Math.floor(10000 + Math.random() * 90000);
    const regId = `REG-DUP-${cleanUsn}-${uniqueSuffix}`;
    const barcode = `*${regId}*`;
    const studentBarcode = this.getStudentBarcode(cleanUsn);

    const newLeave: LeaveApplication = {
      id: newId,
      registrationId: regId,
      barcode: barcode,
      studentBarcode: studentBarcode,
      usn: cleanUsn,
      studentName: studentName,
      roomNumber: roomNumber,
      leaveType: leaveType,
      startDate: params.startDate,
      startSession: startSession,
      departureTime: departureTime,
      endDate: params.endDate,
      returnSession: returnSession,
      expectedReturnTime: expectedReturnTime,
      totalDays: sessionCalc.totalCalendarDays,
      chargedDays: sessionCalc.chargedDays,
      isWeekendExempt: sessionCalc.isWeekendExempt,
      isLateApplication: true,
      isDuplicateCoupon: true,
      duplicateCouponNumber: passCode,
      isCompensationPass: isCompensation,
      compensationPassNumber: passCode,
      reason: params.reason,
      destination: destination,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'Approved',
      cumulativeLeaveCountAtApplication: profile.usn.toUpperCase() === cleanUsn ? profile.leavesCount : 0,
      requiredApprover: 'AO',
      sanctionedBy: aoOfficer,
      gateToken: tokenNumber,
      tokenGeneratedAt: now,
      approvalSteps: [
        {
          role: 'AO',
          status: 'Approved',
          timestamp: now,
          approverName: aoOfficer,
          remarks:
            params.remarks ||
            `Late leave deadline override sanctioned by ${aoOfficer}. AO Duplicate / Compensation Pass #${passCode} issued for ${departureTime} departure. Immediate gate clearance approved.`,
        },
      ],
      movementHistory: [],
    };

    // 1. Save to Student Leaves Storage
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LEAVES);
      const allMyLeaves: LeaveApplication[] = data ? JSON.parse(data) : [];
      const updatedMyLeaves = [newLeave, ...allMyLeaves];
      await AsyncStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(updatedMyLeaves));
    } catch {
      // ignore
    }

    // 2. Save to Admin Master Leaves Storage
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_LEAVES);
      const adminLeaves: LeaveApplication[] = stored ? JSON.parse(stored) : [];
      const updatedAdminLeaves = [newLeave, ...adminLeaves];
      await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_LEAVES, JSON.stringify(updatedAdminLeaves));
    } catch {
      // ignore
    }

    // 3. Save to Public Outpass Roster
    try {
      const publicRoster = await this.getPublicOutpass();
      const newPublicItem = {
        id: `OUT-DUP-${Math.floor(100 + Math.random() * 900)}`,
        usn: cleanUsn,
        hostelBlock: hostelBlock,
        leaveType: leaveType,
        startDate: params.startDate,
        endDate: params.endDate,
        days: sessionCalc.totalCalendarDays,
        status: 'Approved' as const,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.PUBLIC_OUTPASS, JSON.stringify([newPublicItem, ...publicRoster]));
    } catch {
      // ignore
    }

    // 4. Update profile quota if current logged-in student
    if (profile.usn.toUpperCase() === cleanUsn) {
      const newCount = profile.leavesCount + sessionCalc.chargedDays;
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify({ ...profile, leavesCount: newCount }));
    }

    // 5. Send High-Priority Notification to Student
    await this.addNotification({
      usn: cleanUsn,
      title: isCompensation ? '🎫 AO Duplicate / Compensation Pass Issued' : '🎫 AO Duplicate Coupon Issued',
      message: `${aoOfficer} has issued an AO Compensation Pass (${passCode}) overriding the missed 2-day 5:00 PM cutoff for departure on ${params.startDate} (${departureTime}) to ${params.endDate} (${expectedReturnTime}).\nCharged Quota: ${sessionCalc.chargedDays} Days.\nDigital Gate Pass Token (${tokenNumber}) is now active on your portal.`,
      type: 'duplicate_coupon',
      severity: 'warning',
    });

    api.issueDuplicateCouponByAO({
      usn: cleanUsn,
      studentName,
      roomNumber,
      startDate: params.startDate,
      startSession,
      departureTime,
      endDate: params.endDate,
      returnSession,
      expectedReturnTime,
      leaveType,
      reason: params.reason,
      destination,
      remarks: params.remarks,
    }).catch(() => {});

    return newLeave;
  },

  // =========================================================
  // VEHICLE BOOKING & TRANSIT METHODS (Vidyagiri & Health Center)
  // =========================================================
  async getVehicleSlots(): Promise<VehicleSlot[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VEHICLE_SLOTS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.VEHICLE_SLOTS, JSON.stringify(INITIAL_VEHICLE_SLOTS));
      return INITIAL_VEHICLE_SLOTS;
    } catch {
      return INITIAL_VEHICLE_SLOTS;
    }
  },

  async getVehicleBookings(): Promise<VehicleBooking[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VEHICLE_BOOKINGS);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(STORAGE_KEYS.VEHICLE_BOOKINGS, JSON.stringify(INITIAL_VEHICLE_BOOKINGS));
      return INITIAL_VEHICLE_BOOKINGS;
    } catch {
      return INITIAL_VEHICLE_BOOKINGS;
    }
  },

  async getMyVehicleBookings(usn: string): Promise<VehicleBooking[]> {
    const all = await this.getVehicleBookings();
    const cleanUsn = usn.trim().toUpperCase();
    return all.filter((b) => b.usn.toUpperCase() === cleanUsn);
  },

  async getVehicleStats(): Promise<{ vidyagiriTotal: number; healthCenterTotal: number; totalBooked: number }> {
    const all = await this.getVehicleBookings();
    const active = all.filter((b) => b.status === 'Confirmed' || b.status === 'Boarded');
    const vidyagiriTotal = active.filter((b) => b.destination === 'Vidyagiri').length;
    const healthCenterTotal = active.filter((b) => b.destination === 'Health Center').length;
    return {
      vidyagiriTotal,
      healthCenterTotal,
      totalBooked: active.length,
    };
  },

  checkVehicleSlotCutoff(departureTime: string, departureDateStr?: string): {
    canApply: boolean;
    minutesRemaining: number;
    message: string;
  } {
    const clean = departureTime.trim().toUpperCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (!match) {
      return { canApply: false, minutesRemaining: 0, message: 'Invalid timing. Format: 09:30 AM or 02:30 PM.' };
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3];
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    const depMinutes = hours * 60 + minutes;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const targetDate = departureDateStr || todayStr;

    // Advance date booking
    if (targetDate > todayStr) {
      return { canApply: true, minutesRemaining: 9999, message: 'Advance booking open (prior to 15 min cutoff).' };
    }
    if (targetDate < todayStr) {
      return { canApply: false, minutesRemaining: -9999, message: 'Departure date has already passed.' };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const diffMinutes = depMinutes - currentMinutes;

    if (diffMinutes < 0) {
      return {
        canApply: false,
        minutesRemaining: diffMinutes,
        message: `⛔ Trip departed at ${departureTime}. Please select the next scheduled vehicle.`,
      };
    }

    if (diffMinutes < 15) {
      return {
        canApply: false,
        minutesRemaining: diffMinutes,
        message: `⛔ Booking Closed: Departs in ${diffMinutes} min. AIET rule requires booking at least 15 minutes before assigned timing (${departureTime}).`,
      };
    }

    return {
      canApply: true,
      minutesRemaining: diffMinutes,
      message: `✅ Booking Open (${diffMinutes} min before departure).`,
    };
  },

  async bookVehicle(params: {
    usn: string;
    studentName: string;
    roomNumber: string;
    contactNumber: string;
    destination: VehicleDestination;
    vehicleType: VehicleType;
    departureTime: string;
    departureDate?: string;
    reason: string;
    pickupPoint?: string;
    driverName?: string;
    driverContact?: string;
    vehiclePlate?: string;
    isHealthCareEmergency?: boolean;
  }): Promise<{ success: boolean; message: string; booking?: VehicleBooking }> {
    const departureDate = params.departureDate || new Date().toISOString().split('T')[0];

    // Enforce 15-minute cutoff rule
    const cutoffCheck = this.checkVehicleSlotCutoff(params.departureTime, departureDate);
    if (!cutoffCheck.canApply) {
      return {
        success: false,
        message: cutoffCheck.message,
      };
    }

    const allBookings = await this.getVehicleBookings();
    const cleanUsn = params.usn.trim().toUpperCase();

    // Prevent duplicate active booking on same time slot
    const existing = allBookings.find(
      (b) =>
        b.usn.toUpperCase() === cleanUsn &&
        b.departureDate === departureDate &&
        b.departureTime === params.departureTime &&
        b.status === 'Confirmed'
    );
    if (existing) {
      return {
        success: false,
        message: `You already have an active booking (${existing.bookingToken}) for this timing.`,
      };
    }

    const destCode = params.destination === 'Vidyagiri' ? 'VID' : 'HLT';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const token = `VB-${destCode}-${randomNum}`;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Calculate seat number
    const sameSlotBookings = allBookings.filter(
      (b) =>
        b.destination === params.destination &&
        b.departureTime === params.departureTime &&
        b.departureDate === departureDate &&
        b.status === 'Confirmed'
    );
    const seatNumber = sameSlotBookings.length + 1;

    const newBooking: VehicleBooking = {
      id: `VB-ID-${Date.now()}`,
      bookingToken: token,
      usn: cleanUsn,
      studentName: params.studentName,
      roomNumber: params.roomNumber,
      contactNumber: params.contactNumber,
      destination: params.destination,
      vehicleType: params.vehicleType,
      departureTime: params.departureTime,
      departureDate,
      pickupPoint: params.pickupPoint || (params.destination === 'Health Center' ? 'Hostel Health Room Gate' : 'Hostel Gate 1 Porch'),
      driverName: params.driverName || 'Campus Transport Pilot',
      driverContact: params.driverContact || '+91 98450 12345',
      vehiclePlate: params.vehiclePlate || (params.vehicleType === 'Eeco' ? 'KA-19-E-5511' : params.vehicleType === 'TT' ? 'KA-19-M-3912' : 'KA-19-B-7102'),
      seatNumber,
      reason: params.reason,
      status: 'Confirmed',
      bookedAt: `Today ${nowTimeStr}`,
      isHealthCareEmergency: params.isHealthCareEmergency || false,
    };

    const updated = [newBooking, ...allBookings];
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLE_BOOKINGS, JSON.stringify(updated));

    // Send student confirmation notification
    await this.addNotification({
      usn: cleanUsn,
      title: `🚐 ${params.vehicleType} Booked for ${params.destination}`,
      message: `Your seat (#${seatNumber}) has been reserved for ${params.departureTime}. Boarding Pass: ${token}. Pickup: ${newBooking.pickupPoint}. Driver: ${newBooking.driverName} (${newBooking.driverContact}).`,
      type: 'general',
      severity: 'success',
    });

    return {
      success: true,
      message: `Seat #${seatNumber} confirmed on ${params.vehicleType} for ${params.destination} at ${params.departureTime}. Boarding Pass: ${token}.`,
      booking: newBooking,
    };
  },

  async cancelVehicleBooking(bookingId: string): Promise<void> {
    const all = await this.getVehicleBookings();
    const updated = all.map((b) => (b.id === bookingId ? { ...b, status: 'Cancelled' as const } : b));
    await AsyncStorage.setItem(STORAGE_KEYS.VEHICLE_BOOKINGS, JSON.stringify(updated));
  },

  // =========================================================
  // AO SPECIAL PETITIONS (Fees Delay, Mess Reduction, Study Cert, Marks Card)
  // ONLY AO CAN APPROVE THIS
  // =========================================================
  async getAoPetitions(usn?: string): Promise<AoStudentPetition[]> {
    try {
      const serverPetitions = await api.getAoPetitions(usn).catch(() => null);
      if (serverPetitions && Array.isArray(serverPetitions) && serverPetitions.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.AO_PETITIONS, JSON.stringify(serverPetitions));
        return serverPetitions;
      }
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.AO_PETITIONS);
      let list: AoStudentPetition[] = [];
      if (stored) {
        list = JSON.parse(stored);
      } else {
        list = INITIAL_AO_PETITIONS;
        await AsyncStorage.setItem(STORAGE_KEYS.AO_PETITIONS, JSON.stringify(list));
      }
      if (usn) {
        return list.filter((p) => p.usn.toUpperCase() === usn.trim().toUpperCase());
      }
      return list;
    } catch (e) {
      console.warn('getAoPetitions error:', e);
      return INITIAL_AO_PETITIONS;
    }
  },

  async submitAoPetition(
    data: Omit<AoStudentPetition, 'id' | 'requestedDate' | 'status'>
  ): Promise<AoStudentPetition> {
    const all = await this.getAoPetitions();
    const newPetition: AoStudentPetition = {
      ...data,
      id: `AO-PET-${Date.now().toString().slice(-5)}`,
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'Pending AO Approval',
    };
    const updated = [newPetition, ...all];
    await AsyncStorage.setItem(STORAGE_KEYS.AO_PETITIONS, JSON.stringify(updated));
    api.submitAoPetition(newPetition).catch(() => {});

    // Notify student
    await this.addNotification({
      usn: newPetition.usn,
      title: `Petition Submitted: ${newPetition.type}`,
      message: `Your application (${newPetition.id}) for ${newPetition.type} has been forwarded to the Administrative Officer (AO Desk). Only the AO can review and sanction this request.`,
      type: 'general',
      severity: 'info',
    });

    return newPetition;
  },

  async approveAoPetition(
    petitionId: string,
    aoRemarks: string = 'Approved by Administrative Officer with institutional compliance.',
    certRef?: string
  ): Promise<{ success: boolean; message: string; petition?: AoStudentPetition }> {
    const all = await this.getAoPetitions();
    let approvedItem: AoStudentPetition | null = null;
    const refNumber = certRef || `AIET/AO/${Date.now().toString().slice(-6)}`;

    const updated = all.map((p) => {
      if (p.id === petitionId) {
        approvedItem = {
          ...p,
          status: 'Approved by AO' as const,
          aoRemarks,
          approvedDate: new Date().toISOString().split('T')[0],
          certificateRefNumber: refNumber,
          dispatchedDocumentTitle:
            p.type === 'Study Certificate'
              ? `Official_Study_Certificate_${p.usn}.pdf`
              : p.type === 'Marks Card / Grade Transcript'
              ? `Verified_Transcript_Sem${p.targetSemester || 4}_${p.usn}.pdf`
              : undefined,
        };
        return approvedItem;
      }
      return p;
    });

    await AsyncStorage.setItem(STORAGE_KEYS.AO_PETITIONS, JSON.stringify(updated));
    api.approveAoPetition(petitionId, { aoRemarks, certificateRefNumber: refNumber }).catch(() => {});

    if (approvedItem) {
      const item: AoStudentPetition = approvedItem;
      // Student notification
      await this.addNotification({
        usn: item.usn,
        title: `AO Approved: ${item.type}`,
        message: `Your request for ${item.type} (Ref: ${refNumber}) has been approved by the Administrative Officer.\n\nAO Remarks: "${aoRemarks}"\nOfficial document / permission token is now live in your account.`,
        type: 'general',
        severity: 'success',
      });
    }

    return {
      success: true,
      message: `Petition ${petitionId} approved by Administrative Officer. Official Reference: ${refNumber}.`,
      petition: approvedItem || undefined,
    };
  },

  async rejectAoPetition(
    petitionId: string,
    aoRemarks: string = 'Rejected by Administrative Officer after institutional verification.'
  ): Promise<{ success: boolean; message: string }> {
    const all = await this.getAoPetitions();
    let rejectedItem: AoStudentPetition | null = null;

    const updated = all.map((p) => {
      if (p.id === petitionId) {
        rejectedItem = {
          ...p,
          status: 'Rejected by AO' as const,
          aoRemarks,
          approvedDate: new Date().toISOString().split('T')[0],
        };
        return rejectedItem;
      }
      return p;
    });

    await AsyncStorage.setItem(STORAGE_KEYS.AO_PETITIONS, JSON.stringify(updated));
    api.rejectAoPetition(petitionId, { aoRemarks }).catch(() => {});

    if (rejectedItem) {
      const item: AoStudentPetition = rejectedItem;

      await this.addNotification({
        usn: item.usn,
        title: `Petition Rejected: ${item.type}`,
        message: `Your request for ${item.type} was declined by the Administrative Officer.\n\nReason: "${aoRemarks}"`,
        type: 'general',
        severity: 'critical',
      });
    }

    return {
      success: true,
      message: `Petition ${petitionId} rejected by Administrative Officer.`,
    };
  },

  async resetAllData(): Promise<void> {
    await AsyncStorage.clear();
  },
};
