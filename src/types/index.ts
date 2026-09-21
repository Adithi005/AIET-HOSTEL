export interface UserProfile {
  usn: string; // University Seat Number (Primary ID)
  name: string;
  branch: string;
  mail: string;
  contactNumber: string;
  guardianContact: string;
  hostelBlock: string;
  roomNumber: string;
  currentSemester: number; // 1 to 8
  academicYear: string;
  avatarUri?: string;
  leavesCount: number; // Total cumulative leaves taken
  role?: 'student' | 'admin';
  activeDeviceId?: string; // Enforces single device policy
  deviceModel?: string;
  lastLoginAt?: string;
  isOutingBlocked?: boolean;
  outingBlockReason?: string;
  outingBlockedAt?: string;
}

export interface SubjectRecord {
  code: string;
  name: string;
  ia1: number; // e.g. 26/30
  ia2: number; // e.g. 28/30
  ia3: number; // e.g. 29/30
  maxIa: number; // 30
  classesAttended: number;
  totalClasses: number;
  attendancePercentage: number;
}

export interface SemesterRecord {
  semester: number; // 1 to 8
  academicYear: string;
  sgpa: number;
  cgpa: number;
  overallAttendance: number;
  subjects: SubjectRecord[];
}

export type ApproverTier = 'Warden' | 'SWO' | 'HOD' | 'AO' | 'HOD/AO' | 'Principal' | 'Chief Warden';

export interface ApprovalStep {
  role: ApproverTier;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp?: string;
  approverName?: string;
  remarks?: string;
}

export interface LeaveApplication {
  id: string;
  usn: string; // Public identifier
  studentName: string; // Confidential - not shown in public outpass roster
  roomNumber: string;
  leaveType: 'Home Visit' | 'Medical' | 'Academic / Hackathon' | 'Personal / Emergency' | 'Emergency Leave (AO Sanctioned)';
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  appliedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Escalated';
  cumulativeLeaveCountAtApplication: number;
  requiredApprover: ApproverTier;
  approvalSteps: ApprovalStep[];
  medicalDocumentUri?: string; // Required for > 10 leaves
  medicalDocumentName?: string;
  gateToken?: string; // Generated on approval (e.g., TK-84920)
  tokenGeneratedAt?: string;
  isExtended?: boolean;
  extendedDays?: number;
  extensionReason?: string;
  extensionStatus?: 'Pending' | 'Approved';
  // Government Holiday Exemption & Auto-Approval
  isGovtHoliday?: boolean;
  holidayName?: string;
  chargedDays?: number; // Days counted towards student's personal quota (0 for Govt Holidays)
  isAutoApproved?: boolean; // For Home Visit (Going Home) instant outpasses
  isEmergency?: boolean; // Granted directly by Administrative Officer (AO)
  startSession?: 'Morning' | 'Evening'; // Departure session (Evening excludes departure day)
  returnSession?: 'Morning' | 'Evening'; // Return session
  isLateApplication?: boolean; // Applied after 2-day 5 PM cutoff
  isDuplicateCoupon?: boolean; // Issued via AO override coupon
  duplicateCouponNumber?: string; // e.g. COUPON-74920
  isWeekendExempt?: boolean; // Saturday PM to Monday AM weekend exemption
  destination?: string;
  emergencyContact?: string;
  sanctionedBy?: string;
  // Registration ID & Barcode for Gate Check-In / Check-Out
  registrationId?: string;
  barcode?: string;
  barcodeNumber?: string;
  studentBarcode?: string;
  checkOutTime?: string;
  checkOutTimestamp?: number;
  checkOutGate?: string;
  checkOutGuard?: string;
  checkInTime?: string;
  checkInGate?: string;
  checkInGuard?: string;
  movementHistory?: GateCheckEvent[];
}

export interface GateCheckEvent {
  id: string;
  action: 'Check Out' | 'Check In';
  timestamp: string;
  checkOutTimestamp?: number;
  gate: string;
  guardName: string;
  remarks?: string;
  barcode?: string;
  usn?: string;
}

export interface GovtHoliday {
  date: string; // YYYY-MM-DD
  endDate?: string; // If multi-day festival
  name: string;
  description: string;
  isInstitutional?: boolean;
}

export type OutingType =
  | 'Local City Outing'
  | 'Market / Shopping'
  | 'Library / Study'
  | 'Evening Dinner'
  | 'Medical / Clinic'
  | 'Personal';

export interface OutingApplication {
  id: string; // e.g. "OUT-7892"
  usn: string;
  studentName: string;
  roomNumber: string;
  hostelBlock: string;
  outingType: OutingType;
  outDate: string; // e.g. "2024-10-25" or today
  outTime: string; // e.g. "04:30 PM"
  expectedInTime: string; // e.g. "08:30 PM"
  actualInTime?: string;
  destination: string; // e.g. "Jayanagar 4th Block / Orion Mall"
  purpose: string;
  contactNumber: string;
  emergencyContact: string;
  appliedAt: string;
  status: 'Outpass Generated' | 'Exited Gate' | 'Returned & Closed';
  outpassToken: string; // e.g. "OP-89214"
  qrCodeValue: string; // e.g. "AIETNEST-OP-89214-1RV22CS089"
  gateSecurityRemark?: string;
  // Registration ID & Barcode for Gate Check-In / Check-Out
  registrationId?: string;
  barcode?: string;
  barcodeNumber?: string;
  studentBarcode?: string;
  checkOutTime?: string;
  checkOutTimestamp?: number;
  checkOutGate?: string;
  checkOutGuard?: string;
  checkInTime?: string;
  checkInGate?: string;
  checkInGuard?: string;
  movementHistory?: GateCheckEvent[];
  // Curfew & Holiday Rules
  isGovtHolidayOuting?: boolean;
  curfewTime?: string;
  graceCurfewTime?: string;
  isLateEntry?: boolean;
  lateMinutes?: number;
}

export interface GateLogEntry {
  id: string;
  registrationId: string;
  barcode: string;
  usn: string;
  studentName: string;
  roomNumber: string;
  type: 'Outing' | 'Leave' | 'Resident Pass';
  destination?: string;
  action: 'Check Out' | 'Check In';
  timestamp: string;
  station: string;
  guardName: string;
  remarks?: string;
  isLate?: boolean;
  curfewTime?: string;
}

export interface StudentNotification {
  id: string;
  usn: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'curfew_warning' | 'outing_blocked' | 'swo_cleared' | 'gate_event' | 'holiday_pass' | 'emergency_leave' | 'duplicate_coupon' | 'general';
  severity: 'info' | 'warning' | 'critical' | 'success';
  read: boolean;
}

export interface GrievanceTicket {
  id: string;
  usn: string; // Stored with ticket
  roomNumber: string;
  category: 'Cleanliness & Room' | 'Electrical & Fan' | 'Plumbing & Water' | 'Wi-Fi / LAN' | 'Furniture' | 'Pest Control' | 'General';
  description: string;
  photoUri?: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: 'Submitted' | 'Warden Assigned' | 'In Progress' | 'Resolved';
  createdAt: string;
  adminRemark?: string;
}

export interface MessMeal {
  type: 'Breakfast' | 'Lunch' | 'Evening Snacks' | 'Dinner';
  timing: string;
  items: string[];
  isSpecial?: boolean;
}

export interface MessDaySchedule {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  meals: MessMeal[];
}

export interface MessRating {
  id: string;
  date: string;
  mealType: string;
  rating: number; // 1 to 5
  feedback: string;
}

export interface StudentDocument {
  id: string;
  title: string;
  category: 'Marks Card' | 'College ID' | 'Hostel Pass' | 'Medical Certificate' | 'Other';
  semester?: number;
  uploadDate: string;
  fileUri: string;
  fileName: string;
}

export interface StudentScanDossier {
  student: {
    usn: string;
    name: string;
    branch: string;
    roomNumber: string;
    hostelBlock: string;
    contactNumber: string;
    guardianContact: string;
    avatarUri?: string;
    leavesCount: number;
    overallAttendance: number;
    academicYear?: string;
  };
  barcode: string; // Unified student barcode e.g. *STU-1RV22CS089*
  campusStatus: 'INSIDE CAMPUS' | 'OUTSIDE CAMPUS';
  activePassType: 'Outing' | 'Home Going (Govt Holiday)' | 'Regular Leave' | 'None';
  activePass: OutingApplication | LeaveApplication | null;
  outingOutpass: {
    active: OutingApplication | null;
    history: OutingApplication[];
    totalCount: number;
  };
  govtHolidayHomePass: {
    active: LeaveApplication | null;
    history: LeaveApplication[];
    totalCount: number;
    exemptDaysSaved: number;
  };
  regularLeavePass: {
    active: LeaveApplication | null;
    history: LeaveApplication[];
    totalCount: number;
  };
  movementHistory: GateCheckEvent[];
  lastMovement?: GateCheckEvent | null;
  checkInCooldown?: CheckInCooldownInfo;
  isOutingBlocked?: boolean;
  outingBlockReason?: string;
}

export interface CheckInCooldownInfo {
  isRestricted: boolean;
  remainingMs: number;
  remainingSeconds: number;
  remainingFormatted: string;
  allowedCheckInTime: string;
  checkOutTimestamp?: number;
  checkOutTimeStr?: string;
}

export interface HealthRoomLog {
  id: string;
  usn: string;
  studentName: string;
  roomNumber: string;
  hostelBlock: string;
  date: string;
  status: 'Resting in Health Room' | 'Referred to Hospital' | 'Discharged / Recovered';
  location: 'Hostel Health Room / Sick Bay' | 'Campus Clinic' | 'Hospital (City / Multispeciality)';
  hospitalName?: string;
  symptomsOrDiagnosis: string;
  doctorName?: string;
  prescribedMedicines?: string;
  guardianIntimated: boolean;
  checkInTime: string;
  checkOutTime?: string;
  recordedByWarden: string;
  remarks?: string;
}

export type AdminRole = 'AO' | 'Warden' | 'SWO' | 'HOD';

export interface MasterActivityItem {
  id: string;
  type: 'Gate Scan' | 'Leave Sanction' | 'Health Case' | 'Hostel Issue' | 'Academic Update';
  title: string;
  description: string;
  timestamp: string;
  badge: string;
  severity: 'normal' | 'warning' | 'critical' | 'success';
  actor: string;
  targetUsn?: string;
}


