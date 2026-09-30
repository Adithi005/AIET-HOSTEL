import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import {
  ShieldAlert,
  Shield,
  CheckCircle2,
  XCircle,
  Wrench,
  CalendarDays,
  Users,
  Smartphone,
  QrCode,
  FileText,
  Clock,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  Lock,
  RefreshCw,
  X,
  LogOut,
  LogIn,
  Search,
  MapPin,
  Compass,
  Sparkles,
  Activity,
  Plus,
  Award,
  BookOpen,
  HeartPulse,
  Stethoscope,
  GraduationCap,
  Ticket,
  Utensils,
  Star,
  Eye,
  Camera,
  EyeOff,
  Mail,
  Key,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import {
  LeaveApplication,
  GrievanceTicket,
  GateLogEntry,
  StudentScanDossier,
  OutingApplication,
  HealthRoomLog,
  MasterActivityItem,
  SemesterRecord,
  AdminRole,
  MessRating,
  AoPetitionType,
  AoStudentPetition,
} from '../types';
import { StorageService } from '../services/storage';
import { BarcodeView } from '../components/BarcodeView';
import { calculateLeaveSessionDays } from '../utils/leaveTiming';

export interface AdminCredential {
  role: AdminRole;
  roleName: string;
  department: string;
  adminName: string;
  email: string;
  password: string;
  icon: string;
  themeColor: string;
  scope: string;
  color: string;
  emoji: string;
  title: string;
  jurisdiction: string;
}

export const ADMIN_CREDENTIALS: Record<AdminRole, AdminCredential> = {
  AO: {
    role: 'AO',
    roleName: 'Administrative Officer (AO)',
    department: 'Central Administration & Institutional Oversight',
    adminName: 'Dr. Prabhakar Rao',
    email: 'ao@aiet.edu.in',
    password: 'ao@aiet2026',
    icon: 'award',
    themeColor: '#4F46E5',
    color: '#4F46E5',
    emoji: '',
    title: 'Administrative Officer',
    scope: 'Master institutional feed, gate barcode scanner, emergency leave passes, duplicate coupons, and student directory.',
    jurisdiction: 'Master feed, scanner, duplicate passes & directory',
  },
  Warden: {
    role: 'Warden',
    roleName: 'Hostel Chief Warden',
    department: 'Hostel Administration & Resident Care',
    adminName: 'Mr. R. K. Gowda',
    email: 'warden@aiet.edu.in',
    password: 'warden@aiet2026',
    icon: 'shield',
    themeColor: '#D97706',
    color: '#D97706',
    emoji: '',
    title: 'Hostel Chief Warden',
    scope: '1–5 Days leave sanctioning, sick bay & hospital care, and mess food quality plate inspections.',
    jurisdiction: '1–5d leaves, sick bay & mess inspections',
  },
  SWO: {
    role: 'SWO',
    roleName: 'Student Welfare Officer (SWO)',
    department: 'Student Welfare & Disciplinary Board',
    adminName: 'Dr. Suresh Babu',
    email: 'swo@aiet.edu.in',
    password: 'swo@aiet2026',
    icon: 'users',
    themeColor: '#059669',
    color: '#059669',
    emoji: '',
    title: 'Student Welfare Officer',
    scope: '5–8 Days leave sanctioning, hostel maintenance grievances, and curfew breach clearance.',
    jurisdiction: '5–8d leaves, grievances & curfew clearance',
  },
  HOD: {
    role: 'HOD',
    roleName: 'Head of Department (HOD)',
    department: 'Department of Computer Science & Engineering',
    adminName: 'Dr. K. N. Subramanya',
    email: 'hod@aiet.edu.in',
    password: 'hod@aiet2026',
    icon: 'graduation-cap',
    themeColor: '#7C3AED',
    color: '#7C3AED',
    emoji: '',
    title: 'Head of Department - CSE',
    scope: '8–10 Days academic leave sanctioning, CIE marks edit, and attendance percentage monitoring.',
    jurisdiction: '8–10d academic leaves, CIE marks & attendance',
  },
};

export const renderRoleIcon = (role: AdminRole, size = 18, color = '#FFFFFF') => {
  switch (role) {
    case 'AO':
      return <Award size={size} color={color} />;
    case 'Warden':
      return <Shield size={size} color={color} />;
    case 'SWO':
      return <Users size={size} color={color} />;
    case 'HOD':
      return <GraduationCap size={size} color={color} />;
    default:
      return <Award size={size} color={color} />;
  }
};

export const AdminPortalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  // Admin Authentication State: null means on Login Screen
  const [authenticatedRole, setAuthenticatedRole] = useState<AdminRole | null>(null);
  const [loginRole, setLoginRole] = useState<AdminRole>('AO');
  const [loginEmail, setLoginEmail] = useState(ADMIN_CREDENTIALS.AO.email);
  const [loginPassword, setLoginPassword] = useState(ADMIN_CREDENTIALS.AO.password);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 4 Primary Roles: AO (Master Activities) | Warden (1-5d & Health) | SWO (5-8d & Issues) | HOD (8-10d & Academics)
  const [activeRole, setActiveRole] = useState<AdminRole>('AO');

  // Sub-tabs per role
  const [aoSubTab, setAoSubTab] = useState<'directory' | 'latecomers' | 'issues' | 'emergency' | 'duplicate_coupon' | 'petitions' | 'feed' | 'gate'>('directory');
  const [aoStudentSearch, setAoStudentSearch] = useState('');
  const [aoIssueFilter, setAoIssueFilter] = useState<'all' | 'hostel' | 'mess'>('all');
  const [emergencyPassType, setEmergencyPassType] = useState<LeaveApplication['leaveType']>('Emergency Leave (AO Sanctioned)');

  // AO Petitions & Approvals State (Fees delay, mess bill reduction, study cert, marks card)
  const [aoPetitions, setAoPetitions] = useState<AoStudentPetition[]>([]);
  const [aoPetitionFilter, setAoPetitionFilter] = useState<string>('all');
  const [selectedPetitionToReview, setSelectedPetitionToReview] = useState<AoStudentPetition | null>(null);
  const [aoPetitionRemarks, setAoPetitionRemarks] = useState('');

  const [swoSubTab, setSwoSubTab] = useState<'leaves' | 'issues' | 'clearance'>('leaves');
  const [blockedStudents, setBlockedStudents] = useState<any[]>([]);
  const [selectedStudentToLock, setSelectedStudentToLock] = useState<{ usn: string; name: string } | null>(null);
  const [lockReason, setLockReason] = useState('Late return curfew breach (overdue check-in)');

  const [hodSubTab, setHodSubTab] = useState<'leaves' | 'academics'>('leaves');
  const [selectedHodLeaveToApprove, setSelectedHodLeaveToApprove] = useState<LeaveApplication | null>(null);
  const [hodExemptionReason, setHodExemptionReason] = useState('Paper Presentation at IEEE Technical Conference');
  const [hodCustomReason, setHodCustomReason] = useState('');

  // Main data collections
  const [allLeaves, setAllLeaves] = useState<LeaveApplication[]>([]);
  const [allGrievances, setAllGrievances] = useState<GrievanceTicket[]>([]);
  const [allMessRatings, setAllMessRatings] = useState<MessRating[]>([]);
  const [messFilter, setMessFilter] = useState<'all' | 'Breakfast' | 'Lunch' | 'Evening Snacks' | 'Dinner'>('all');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{ uri: string; title: string; subtitle: string } | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [gateLogs, setGateLogs] = useState<GateLogEntry[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthRoomLog[]>([]);
  const [activityFeed, setActivityFeed] = useState<MasterActivityItem[]>([]);
  const [academics, setAcademics] = useState<SemesterRecord[]>([]);

  // Gate Scanner / Barcode Dossier
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [studentDossier, setStudentDossier] = useState<StudentScanDossier | null>(null);
  const [dossierCategory, setDossierCategory] = useState<'outing' | 'holiday' | 'leave' | 'history'>('outing');
  const [regFilter, setRegFilter] = useState<'all' | 'inside' | 'outside'>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [grievanceFilter, setGrievanceFilter] = useState<string>('all');

  // SWO Staff Assignment Modal
  const [selectedTicket, setSelectedTicket] = useState<GrievanceTicket | null>(null);
  const [staffName, setStaffName] = useState('Housekeeping Lead (Ramesh)');
  const [assignStatus, setAssignStatus] = useState<GrievanceTicket['status']>('In Progress');

  // Warden Log Sick Student Modal
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthUsn, setHealthUsn] = useState('1RV22CS089');
  const [healthName, setHealthName] = useState('Adithya Shenoy');
  const [healthRoom, setHealthRoom] = useState('B-304');
  const [healthBlock, setHealthBlock] = useState('Cauvery Block B-3');
  const [healthStatus, setHealthStatus] = useState<'Resting in Health Room' | 'Referred to Hospital'>('Resting in Health Room');
  const [healthLocation, setHealthLocation] = useState<'Hostel Health Room / Sick Bay' | 'Campus Clinic' | 'Hospital (City / Multispeciality)'>('Hostel Health Room / Sick Bay');
  const [healthHospital, setHealthHospital] = useState('');
  const [healthSymptoms, setHealthSymptoms] = useState('');
  const [healthDoctor, setHealthDoctor] = useState('Dr. Preethi Rao (Hostel Physician)');
  const [healthMedicines, setHealthMedicines] = useState('Paracetamol 650mg TDS, ORS');
  const [healthGuardianIntimated, setHealthGuardianIntimated] = useState(true);
  const [healthRemarks, setHealthRemarks] = useState('');

  // Warden Discharge Modal
  const [selectedHealthToDischarge, setSelectedHealthToDischarge] = useState<HealthRoomLog | null>(null);
  const [dischargeRemarks, setDischargeRemarks] = useState('Vitals stable, fever subsided. Medically fit to resume college.');

  // HOD Academic Marks & Attendance Edit Modal
  const [selectedSubjectToEdit, setSelectedSubjectToEdit] = useState<{
    semester: number;
    code: string;
    name: string;
    attendancePercentage: number;
    classesAttended: number;
    totalClasses: number;
    ia1: number;
    ia2: number;
    ia3: number;
  } | null>(null);
  const [editAttendancePct, setEditAttendancePct] = useState('');
  const [editClassesAttended, setEditClassesAttended] = useState('');
  const [editTotalClasses, setEditTotalClasses] = useState('');
  const [editIa1, setEditIa1] = useState('');
  const [editIa2, setEditIa2] = useState('');
  const [editIa3, setEditIa3] = useState('');

  // AO Emergency Leave Grant State
  const [emergencyUsn, setEmergencyUsn] = useState('1RV22CS089');
  const [emergencyReason, setEmergencyReason] = useState('Urgent Family Medical Emergency');
  const [emergencyDestination, setEmergencyDestination] = useState('Home / Mangalore');
  const [emergencyStartDate, setEmergencyStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [emergencyEndDate, setEmergencyEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [emergencyTotalDays, setEmergencyTotalDays] = useState('3');
  const [emergencyParentIntimated, setEmergencyParentIntimated] = useState(true);
  const [emergencyRemarks, setEmergencyRemarks] = useState('Approved under AO discretionary emergency powers. Immediate hostel gate clearance authorized.');
  const [isGrantingEmergency, setIsGrantingEmergency] = useState(false);
  const [lastGrantedEmergencyPass, setLastGrantedEmergencyPass] = useState<LeaveApplication | null>(null);

  // AO Duplicate / Compensation Pass Issuance State
  const [couponUsn, setCouponUsn] = useState('1RV22CS089');
  const [couponStartDate, setCouponStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [couponStartSession, setCouponStartSession] = useState<'Morning' | 'Evening'>('Evening');
  const [couponDepartureTime, setCouponDepartureTime] = useState('05:00 PM');
  const [couponEndDate, setCouponEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [couponReturnSession, setCouponReturnSession] = useState<'Morning' | 'Evening'>('Morning');
  const [couponReturnTime, setCouponReturnTime] = useState('08:30 AM');
  const [couponLeaveType, setCouponLeaveType] = useState<LeaveApplication['leaveType']>('Home Visit');
  const [couponReason, setCouponReason] = useState('Late Leave Application - Urgent Home Visit');
  const [couponDestination, setCouponDestination] = useState('Home');
  const [couponRemarks, setCouponRemarks] = useState('AO Compensation Pass sanctioned overriding 2-day 5 PM cutoff.');
  const [isIssuingCoupon, setIsIssuingCoupon] = useState(false);
  const [lastIssuedCouponPass, setLastIssuedCouponPass] = useState<LeaveApplication | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      const leaves = await StorageService.getAllLeavesAdmin();
      const grievances = await StorageService.getAllGrievancesAdmin();
      const messRatings = await StorageService.getAllMessRatingsAdmin();
      const stdList = await StorageService.getAllStudents();
      const logs = await StorageService.getGateLogs();
      const regs = await StorageService.getAllRegistrations();
      const health = await StorageService.getHealthLogs();
      const feed = await StorageService.getMasterActivityFeed();
      const acads = await StorageService.getAcademics();

      setAllLeaves(leaves);
      setAllGrievances(grievances);
      setAllMessRatings(messRatings);
      setStudents(stdList);
      setGateLogs(logs);
      setRegistrations(regs);
      setHealthLogs(health);
      setActivityFeed(feed);
      setAcademics(acads);
      const blocked = await StorageService.getBlockedOutingStudents();
      setBlockedStudents(blocked);
      const petitions = await StorageService.getAoPetitions();
      setAoPetitions(petitions);

      const usnToLoad = studentDossier?.student?.usn || '1RV22CS089';
      const dossier = await StorageService.getStudentScanDossier(usnToLoad);
      if (dossier) setStudentDossier(dossier);
    } catch (err) {
      console.warn('Admin load error', err);
    }
  }, [studentDossier?.student?.usn]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Admin Authentication Actions
  const handleSelectLoginRole = (role: AdminRole) => {
    setLoginRole(role);
    setLoginEmail(ADMIN_CREDENTIALS[role].email);
    setLoginPassword(ADMIN_CREDENTIALS[role].password);
    setLoginError('');
  };

  const handleQuickFill = (role: AdminRole) => {
    setLoginRole(role);
    setLoginEmail(ADMIN_CREDENTIALS[role].email);
    setLoginPassword(ADMIN_CREDENTIALS[role].password);
    setLoginError('');
  };

  const handleAdminLogin = () => {
    setLoginError('');
    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPassword.trim();

    if (!emailTrim || !passTrim) {
      setLoginError('Please enter both official institutional email and password.');
      return;
    }

    setIsLoggingIn(true);

    setTimeout(() => {
      const expectedCred = ADMIN_CREDENTIALS[loginRole];
      let matchedRole: AdminRole | null = null;

      if (emailTrim === expectedCred.email.toLowerCase() && passTrim === expectedCred.password) {
        matchedRole = loginRole;
      } else {
        const anyMatch = (Object.keys(ADMIN_CREDENTIALS) as AdminRole[]).find(
          (r) =>
            ADMIN_CREDENTIALS[r].email.toLowerCase() === emailTrim &&
            ADMIN_CREDENTIALS[r].password === passTrim
        );
        if (anyMatch) {
          matchedRole = anyMatch;
        }
      }

      setIsLoggingIn(false);

      if (matchedRole) {
        setAuthenticatedRole(matchedRole);
        setActiveRole(matchedRole);
        setLoginError('');
        Alert.alert(
          'Access Granted',
          `Welcome, ${ADMIN_CREDENTIALS[matchedRole].adminName}!\n\nAuthenticated for: ${ADMIN_CREDENTIALS[matchedRole].roleName}\nDepartment: ${ADMIN_CREDENTIALS[matchedRole].department}`
        );
      } else {
        setLoginError(
          `Invalid credentials for ${ADMIN_CREDENTIALS[loginRole].roleName}.\nRequired: ${expectedCred.email} / ${expectedCred.password}`
        );
      }
    }, 200);
  };

  const handleAdminLogout = () => {
    const currentName = authenticatedRole ? ADMIN_CREDENTIALS[authenticatedRole].roleName : 'Admin';
    Alert.alert(
      'Logout from Admin Portal',
      `Are you sure you want to log out of the ${currentName} dashboard?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            const previousRole = authenticatedRole || 'AO';
            setAuthenticatedRole(null);
            setLoginRole(previousRole);
            setLoginEmail(ADMIN_CREDENTIALS[previousRole].email);
            setLoginPassword(ADMIN_CREDENTIALS[previousRole].password);
            setLoginError('');
          },
        },
      ]
    );
  };

  const handleSwitchRoleTab = (targetRole: AdminRole) => {
    if (targetRole === authenticatedRole) {
      setActiveRole(targetRole);
      return;
    }

    Alert.alert(
      `${ADMIN_CREDENTIALS[targetRole].roleName} Locked`,
      `You are currently logged into the ${ADMIN_CREDENTIALS[authenticatedRole!].roleName} dashboard as ${ADMIN_CREDENTIALS[authenticatedRole!].adminName}.\n\nTo access the ${ADMIN_CREDENTIALS[targetRole].roleName} dashboard, please authenticate with ${targetRole} credentials.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Login to ${targetRole}`,
          onPress: () => {
            setAuthenticatedRole(null);
            setLoginRole(targetRole);
            setLoginEmail(ADMIN_CREDENTIALS[targetRole].email);
            setLoginPassword(ADMIN_CREDENTIALS[targetRole].password);
            setLoginError('');
          },
        },
      ]
    );
  };

  // SWO Late Outing Permit Action
  const handleSwoPermitOuting = async (usn: string) => {
    try {
      const res = await StorageService.swoPermitOuting(
        usn,
        'Dr. Suresh Babu (SWO)',
        'Cleared by Student Welfare Officer for subsequent day outings.'
      );
      await loadAdminData();
      Alert.alert('Outing Privilege Restored', res.message);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not grant clearance.');
    }
  };

  // Leave Actions: Role-based sanctioning
  const handleWardenApprove = async (leaveId: string) => {
    await StorageService.wardenApproveLeave(leaveId, 'Mr. R. K. Gowda (Warden)', 'Sanctioned by Warden (1-5 Days Tier). Gate token active.');
    await loadAdminData();
    Alert.alert('Leave Sanctioned by Warden', 'Approved under 1–5 days jurisdiction. Gate pass barcode generated.');
  };

  const handleWardenReject = async (leaveId: string) => {
    await StorageService.wardenRejectLeave(leaveId, 'Mr. R. K. Gowda (Warden)', 'Rejected by Warden due to disciplinary/attendance grounds.');
    await loadAdminData();
    Alert.alert('Leave Rejected', 'Application marked as Rejected by Warden.');
  };

  const handleSwoApprove = async (leaveId: string) => {
    await StorageService.swoApproveLeave(leaveId, 'Dr. Suresh Babu (SWO)', 'Sanctioned by Student Welfare Officer (5-8 Days Tier). Welfare verified.');
    await loadAdminData();
    Alert.alert('Leave Sanctioned by SWO', 'Approved under 5–8 days jurisdiction. Gate token active.');
  };

  const handleSwoReject = async (leaveId: string) => {
    await StorageService.swoRejectLeave(leaveId, 'Dr. Suresh Babu (SWO)', 'Rejected by SWO after student welfare review.');
    await loadAdminData();
    Alert.alert('Leave Rejected', 'Application marked as Rejected by SWO.');
  };

  // HOD Academic Exemption Flow: Requires Specific Reason
  const handleHodApproveClick = (leave: LeaveApplication) => {
    setSelectedHodLeaveToApprove(leave);
    setHodExemptionReason('Paper Presentation at IEEE Technical Conference');
    setHodCustomReason('');
  };

  const handleConfirmHodApprove = async () => {
    if (!selectedHodLeaveToApprove) return;
    const finalReason =
      hodExemptionReason === 'Other (Enter Custom Specific Reason)'
        ? (hodCustomReason.trim() || 'Official Academic Department Exemption')
        : hodExemptionReason;

    await StorageService.hodApproveLeave(
      selectedHodLeaveToApprove.id,
      'Dr. M. K. Sridhar (HOD CSE)',
      `Sanctioned by HOD with Academic Attendance Exemption: ${finalReason}`
    );
    setSelectedHodLeaveToApprove(null);
    await loadAdminData();
    Alert.alert(
      'Academic Leave Sanctioned by HOD',
      `Leave for USN: ${selectedHodLeaveToApprove.usn} has been approved under 8–10 Days Jurisdiction.\n\nSpecific Exemption Reason: "${finalReason}"\nAttendance concession applied.`
    );
  };

  const handleHodReject = async (leaveId: string) => {
    await StorageService.hodRejectLeave(leaveId, 'Dr. M. K. Sridhar (HOD CSE)', 'Rejected by HOD due to internal assessment test schedule.');
    await loadAdminData();
    Alert.alert('Leave Rejected', 'Application marked as Rejected by HOD.');
  };

  // SWO Lock Outpass for Latecomer
  const handleSwoLockOuting = async (usnToLock?: string, reasonToLock?: string) => {
    const targetUsn = (usnToLock || selectedStudentToLock?.usn || '').trim().toUpperCase();
    const finalReason = (reasonToLock || lockReason).trim() || 'Late return curfew breach (overdue check-in past cutoff)';

    if (!targetUsn) {
      Alert.alert('Missing Student USN', 'Please select or enter the student USN to lock outpass.');
      return;
    }

    try {
      const res = await StorageService.swoLockOuting(
        targetUsn,
        finalReason,
        'Dr. Suresh Babu (SWO)'
      );
      setSelectedStudentToLock(null);
      await loadAdminData();
      Alert.alert(
        'Outpass Locked & Curfew Suspended',
        `Outpass privileges for ${targetUsn} have been suspended.\nReason: "${finalReason}"\nStudent has been notified and cannot generate subsequent passes.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not lock outpass.');
    }
  };

  // AO Student Petition Handlers (Only AO Can Approve)
  const handleApprovePetition = async (petition: AoStudentPetition, customRemarks?: string) => {
    const remarks = customRemarks || aoPetitionRemarks.trim() || 'Sanctioned by Administrative Officer. Official institutional clearance / certificate recorded.';
    await StorageService.approveAoPetition(petition.id, remarks);
    setSelectedPetitionToReview(null);
    setAoPetitionRemarks('');
    await loadAdminData();
    Alert.alert(
      'Petition Sanctioned by AO',
      `${petition.type} for USN: ${petition.usn} has been approved.\n\nInstitutional confirmation and active token dispatched to the student.`
    );
  };

  const handleRejectPetition = async (petition: AoStudentPetition, customRemarks?: string) => {
    const remarks = customRemarks || aoPetitionRemarks.trim() || 'Declined by Administrative Officer after institutional compliance review.';
    await StorageService.rejectAoPetition(petition.id, remarks);
    setSelectedPetitionToReview(null);
    setAoPetitionRemarks('');
    await loadAdminData();
    Alert.alert(
      'Petition Declined by AO',
      `Application for ${petition.type} has been marked as Rejected by AO.`
    );
  };

  // SWO Staff Assignment
  const handleConfirmAssign = async () => {
    if (!selectedTicket) return;
    await StorageService.adminAssignGrievance(selectedTicket.id, staffName, assignStatus);
    setSelectedTicket(null);
    await loadAdminData();
    Alert.alert('Staff Assigned', `Ticket ${selectedTicket.id} assigned to ${staffName} (${assignStatus}).`);
  };

  // Warden Sick Student Logger
  const handleSaveHealthRoomLog = async () => {
    if (!healthUsn.trim()) {
      Alert.alert('Missing Field', 'Please enter or select Student USN.');
      return;
    }
    if (!healthSymptoms.trim()) {
      Alert.alert('Missing Field', 'Please enter symptoms or medical diagnosis.');
      return;
    }

    await StorageService.addHealthRoomLog({
      usn: healthUsn.trim().toUpperCase(),
      studentName: healthName.trim(),
      roomNumber: healthRoom.trim(),
      hostelBlock: healthBlock.trim(),
      date: new Date().toISOString().split('T')[0],
      status: healthStatus,
      location: healthStatus === 'Referred to Hospital' ? 'Hospital (City / Multispeciality)' : healthLocation,
      hospitalName: healthStatus === 'Referred to Hospital' ? (healthHospital.trim() || 'Apollo Speciality Hospital') : undefined,
      symptomsOrDiagnosis: healthSymptoms.trim(),
      doctorName: healthDoctor.trim(),
      prescribedMedicines: healthMedicines.trim(),
      guardianIntimated: healthGuardianIntimated,
      checkInTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      recordedByWarden: 'Mr. R. K. Gowda (Warden)',
      remarks: healthRemarks.trim() || (healthStatus === 'Resting in Health Room' ? 'Student resting in hostel health room. Meals provided.' : 'Referred to hospital for treatment.'),
    });

    setShowHealthModal(false);
    setHealthSymptoms('');
    setHealthRemarks('');
    setHealthHospital('');
    await loadAdminData();
    Alert.alert(
      'Health Room Entry Logged',
      `${healthName} (${healthUsn}) recorded as "${healthStatus}". Visible in Warden registry & AO Master Feed.`
    );
  };

  // Warden Discharge / Recovery
  const handleConfirmDischarge = async () => {
    if (!selectedHealthToDischarge) return;
    const checkOut = new Date().toISOString().replace('T', ' ').substring(0, 16);
    await StorageService.dischargeHealthRoomLog(selectedHealthToDischarge.id, checkOut, dischargeRemarks);
    setSelectedHealthToDischarge(null);
    await loadAdminData();
    Alert.alert(
      'Student Discharged',
      `${selectedHealthToDischarge.studentName} discharged from health care. Recovery note logged.`
    );
  };

  // Warden Transfer Sick Bay -> Hospital
  const handleTransferToHospital = async (log: HealthRoomLog) => {
    await StorageService.updateHealthRoomLog(log.id, {
      status: 'Referred to Hospital',
      location: 'Hospital (City / Multispeciality)',
      hospitalName: 'Apollo Speciality Hospital, Jayanagar',
      remarks: `${log.remarks || ''} • Transferred to hospital via college vehicle. Condition monitored.`,
    });
    await loadAdminData();
    Alert.alert('Referred to Hospital', `${log.studentName} has been transferred from Sick Bay to Hospital.`);
  };

  // HOD Marks & Attendance Edit
  const openEditAcademicsModal = (sem: number, sub: any) => {
    setSelectedSubjectToEdit({
      semester: sem,
      code: sub.code,
      name: sub.name,
      attendancePercentage: sub.attendancePercentage,
      classesAttended: sub.classesAttended,
      totalClasses: sub.totalClasses,
      ia1: sub.ia1,
      ia2: sub.ia2,
      ia3: sub.ia3,
    });
    setEditAttendancePct(String(sub.attendancePercentage));
    setEditClassesAttended(String(sub.classesAttended));
    setEditTotalClasses(String(sub.totalClasses));
    setEditIa1(String(sub.ia1));
    setEditIa2(String(sub.ia2));
    setEditIa3(String(sub.ia3));
  };

  const handleSaveMarksAndAttendance = async () => {
    if (!selectedSubjectToEdit) return;

    await StorageService.updateStudentMarksAndAttendance({
      usn: '1RV22CS089',
      semester: selectedSubjectToEdit.semester,
      subjectCode: selectedSubjectToEdit.code,
      attendancePercentage: editAttendancePct ? parseFloat(editAttendancePct) : undefined,
      classesAttended: editClassesAttended ? parseInt(editClassesAttended, 10) : undefined,
      totalClasses: editTotalClasses ? parseInt(editTotalClasses, 10) : undefined,
      ia1: editIa1 ? parseFloat(editIa1) : undefined,
      ia2: editIa2 ? parseFloat(editIa2) : undefined,
      ia3: editIa3 ? parseFloat(editIa3) : undefined,
    });

    setSelectedSubjectToEdit(null);
    await loadAdminData();
    Alert.alert(
      'Attendance & IA Marks Updated',
      `Academic records for ${selectedSubjectToEdit.name} saved. Overall semester attendance updated.`
    );
  };

  // Barcode Check-In / Check-Out
  const handleBarcodeCheckInOut = async (barcodeOrId: string, action: 'Check Out' | 'Check In') => {
    try {
      const res = await StorageService.checkInOutByBarcode(barcodeOrId, action, 'Security Guard Ramu', 'Campus Main Gate 1');
      if (res.success) {
        Alert.alert(`Gate ${action} Successful`, res.message);
        if (res.dossier) {
          setStudentDossier(res.dossier);
        } else {
          const fresh = await StorageService.getStudentScanDossier(barcodeOrId);
          if (fresh) setStudentDossier(fresh);
        }
        await loadAdminData();
      } else {
        Alert.alert(action === 'Check In' ? 'Gate Check-In Blocked' : 'Scan Result', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record gate scan.');
    }
  };

  // Search Barcode
  const handleSearchBarcode = async () => {
    const query = barcodeSearch.trim();
    if (!query) {
      Alert.alert('Barcode Scanner', 'Please enter a Student Barcode, Registration ID, or USN to scan.');
      return;
    }
    const dossier = await StorageService.getStudentScanDossier(query);
    if (dossier) {
      setStudentDossier(dossier);
      if (dossier.activePassType === 'Home Going (Govt Holiday)') {
        setDossierCategory('holiday');
      } else if (dossier.activePassType === 'Regular Leave') {
        setDossierCategory('leave');
      } else {
        setDossierCategory('outing');
      }
    } else {
      Alert.alert('Student Not Found', `No registered student or pass matching "${query}".`);
    }
  };

  const handleSelectRegistration = async (reg: any) => {
    setBarcodeSearch(reg.barcode || reg.registrationId);
    const dossier = await StorageService.getStudentScanDossier(reg.usn);
    if (dossier) {
      setStudentDossier(dossier);
      if (reg.type === 'Home Going (Govt Holiday)') {
        setDossierCategory('holiday');
      } else if (reg.type === 'Leave') {
        setDossierCategory('leave');
      } else {
        setDossierCategory('outing');
      }
    }
  };

  // Device simulation & reset
  const handleSimulateDeviceConflict = (studentName: string) => {
    const result = StorageService.simulateSecondaryDeviceLogin('Apple iPhone 15 Pro');
    Alert.alert('Single Device Policy Enforced', `Login Attempt Blocked for ${studentName}!\n\n${result.message}`);
  };

  const handleResetDevice = async (usn: string) => {
    await StorageService.resetStudentDevice(usn);
    await loadAdminData();
    Alert.alert('Device Binding Cleared', `Student USN ${usn} may now bind a new primary smartphone.`);
  };

  const handleGrantEmergencyLeave = async () => {
    const cleanUsn = emergencyUsn.trim().toUpperCase();
    if (!cleanUsn) {
      Alert.alert('Missing USN', 'Please enter or select a valid Student USN.');
      return;
    }
    if (!emergencyDestination.trim()) {
      Alert.alert('Missing Destination', 'Please specify the emergency departure destination.');
      return;
    }
    if (!emergencyReason.trim()) {
      Alert.alert('Missing Reason', 'Please enter the nature or reason for emergency leave.');
      return;
    }

    try {
      setIsGrantingEmergency(true);
      const days = parseInt(emergencyTotalDays, 10) || 1;
      const grantedLeave = await StorageService.grantEmergencyLeaveByAO({
        usn: cleanUsn,
        reason: emergencyReason.trim(),
        startDate: emergencyStartDate.trim(),
        endDate: emergencyEndDate.trim(),
        totalDays: days,
        destination: emergencyDestination.trim(),
        guardianIntimated: emergencyParentIntimated,
        remarks: emergencyRemarks.trim(),
      });

      setLastGrantedEmergencyPass(grantedLeave);
      await loadAdminData();

      Alert.alert(
        'Emergency Leave Granted!',
        `Digital Outpass Token: ${grantedLeave.gateToken}\nRegistration: ${grantedLeave.registrationId}\n\nStudent: ${grantedLeave.studentName} (${grantedLeave.usn})\nDestination: ${grantedLeave.destination}\nDuration: ${grantedLeave.startDate} to ${grantedLeave.endDate} (${grantedLeave.totalDays} Days)\n\nThe approved emergency pass and digital barcode are now live on the student's page and available for security gate departure.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to grant emergency leave.');
    } finally {
      setIsGrantingEmergency(false);
    }
  };

  const handleIssueDuplicateCoupon = async () => {
    const cleanUsn = couponUsn.trim().toUpperCase();
    if (!cleanUsn) {
      Alert.alert('Missing USN', 'Please enter or select a valid Student USN.');
      return;
    }
    if (!couponReason.trim()) {
      Alert.alert('Missing Reason', 'Please enter a valid reason for late leave application.');
      return;
    }

    try {
      setIsIssuingCoupon(true);
      const pass = await StorageService.issueDuplicateCouponByAO({
        usn: cleanUsn,
        startDate: couponStartDate.trim(),
        startSession: couponStartSession,
        departureTime: couponDepartureTime.trim() || (couponStartSession === 'Evening' ? '05:00 PM' : '09:00 AM'),
        endDate: couponEndDate.trim(),
        returnSession: couponReturnSession,
        expectedReturnTime: couponReturnTime.trim() || (couponReturnSession === 'Evening' ? '06:00 PM' : '08:30 AM'),
        leaveType: couponLeaveType,
        reason: couponReason.trim(),
        destination: couponDestination.trim(),
        remarks: couponRemarks.trim(),
        aoOfficerName: 'Administrative Officer (AO)',
        isCompensationPass: true,
      });

      setLastIssuedCouponPass(pass);
      await loadAdminData();

      Alert.alert(
        'AO Duplicate / Compensation Pass Issued!',
        `Pass Number: ${pass.duplicateCouponNumber}\nGate Token: ${pass.gateToken}\nRegistration: ${pass.registrationId}\n\nStudent: ${pass.studentName} (${pass.usn})\nDeparture: ${pass.startDate} (${pass.departureTime})\nReturn: ${pass.endDate} (${pass.expectedReturnTime})\nCharged Quota: ${pass.chargedDays} Days\n\nThe approved Duplicate / Compensation Pass and Barcode are now active on the student's portal.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to issue pass.');
    } finally {
      setIsIssuingCoupon(false);
    }
  };

  // Filtered lists by role tier
  const wardenLeaves = allLeaves.filter((l) => (l.totalDays || 1) <= 5);
  const swoLeaves = allLeaves.filter((l) => (l.totalDays || 1) > 5 && (l.totalDays || 1) <= 8);
  const hodLeaves = allLeaves.filter((l) => (l.totalDays || 1) > 8);

  const pendingWarden = wardenLeaves.filter((l) => l.status === 'Pending').length;
  const pendingSwo = swoLeaves.filter((l) => l.status === 'Pending').length;
  const pendingHod = hodLeaves.filter((l) => l.status === 'Pending').length;

  const activeHealthCases = healthLogs.filter((h) => h.status !== 'Discharged / Recovered');
  const openGrievances = allGrievances.filter((g) => g.status !== 'Resolved');

  // Latecomers logs (Curfew breaches > 04:30 PM & late check-ins)
  const latecomersList = gateLogs.filter(
    (g) =>
      g.isLate ||
      g.isLateReturn ||
      (g.action === 'Check In' &&
        (g.remarks?.toLowerCase().includes('curfew') ||
          g.remarks?.toLowerCase().includes('late') ||
          (g.status && g.status.toLowerCase().includes('late'))))
  );

  // Low attendance check (< 75%)
  const lowAttendanceSubjects: Array<{ sem: number; sub: any }> = [];
  academics.forEach((sem) => {
    sem.subjects.forEach((s) => {
      if (s.attendancePercentage < 75) {
        lowAttendanceSubjects.push({ sem: sem.semester, sub: s });
      }
    });
  });

  // ========================================================
  // IF NOT AUTHENTICATED: RENDER ADMIN LOGIN PAGE
  // ========================================================
  if (!authenticatedRole) {
    const targetDesk = ADMIN_CREDENTIALS[loginRole];
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#0B132B' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.loginScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Return to Student App */}
            <View style={styles.loginNavRow}>
              <TouchableOpacity
                style={styles.loginBackBtn}
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
                activeOpacity={0.75}
              >
                <ChevronLeft size={16} color="#94A3B8" />
                <Text style={styles.loginBackText}>Student Portal</Text>
              </TouchableOpacity>
              <View style={styles.loginSecurityPill}>
                <Lock size={12} color="#10B981" />
                <Text style={styles.loginSecurityText}>AIET Secure SSL</Text>
              </View>
            </View>

            {/* Institution Brand Card */}
            <View style={styles.loginBrandCard}>
              <View style={styles.loginLogoWrap}>
                <Image
                  source={require('../../assets/alvas-logo.png')}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.loginInstitutionTitle}>ALVA'S INSTITUTE OF ENGINEERING & TECHNOLOGY</Text>
              <Text style={styles.loginPortalTitle}>Admin Dashboard Gateway</Text>
              <Text style={styles.loginPortalSub}>Select administrative desk and sign in with official credentials</Text>
            </View>

            {/* Desk Role Selector Grid */}
            <View style={styles.loginDeskSection}>
              <Text style={styles.loginSectionHeading}>SELECT ADMIN DESK TO ACCESS</Text>
              <View style={styles.loginDeskGrid}>
                {(['AO', 'Warden', 'SWO', 'HOD'] as AdminRole[]).map((r) => {
                  const info = ADMIN_CREDENTIALS[r];
                  const isSelected = loginRole === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.loginDeskCard,
                        isSelected && { borderColor: info.color, backgroundColor: `${info.color}18` },
                      ]}
                      onPress={() => handleSelectLoginRole(r)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.loginDeskBadge, { backgroundColor: info.color }]}>
                        {renderRoleIcon(r, 16, '#FFFFFF')}
                      </View>
                      <Text style={[styles.loginDeskTitle, isSelected && { color: info.color }]}>{info.roleName}</Text>
                      <Text style={styles.loginDeskSub} numberOfLines={1}>{info.title}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Active Selected Desk Detail Card */}
            <View style={[styles.loginActiveDeskCard, { borderColor: `${targetDesk.color}45`, backgroundColor: `${targetDesk.color}12` }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.activeDeskDot, { backgroundColor: targetDesk.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeDeskName, { color: targetDesk.color }]}>{targetDesk.adminName}</Text>
                  <Text style={styles.activeDeskRole}>{targetDesk.title} • {targetDesk.department}</Text>
                  <Text style={styles.activeDeskScope}>Jurisdiction: {targetDesk.jurisdiction}</Text>
                </View>
              </View>
            </View>

            {/* Login Form Box */}
            <View style={styles.loginFormCard}>
              <View style={styles.loginFormHeaderRow}>
                <View>
                  <Text style={styles.loginFormTitle}>{targetDesk.roleName} Login</Text>
                  <Text style={styles.loginFormSub}>Provide designated institutional email & password</Text>
                </View>
                <View style={[styles.deskBadgePill, { backgroundColor: `${targetDesk.color}25` }]}>
                  <Text style={[styles.deskBadgePillText, { color: targetDesk.color }]}>{loginRole}</Text>
                </View>
              </View>

              {/* Error Banner */}
              {!!loginError && (
                <View style={styles.loginErrorBanner}>
                  <AlertCircle size={18} color="#EF4444" />
                  <Text style={styles.loginErrorText}>{loginError}</Text>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.loginInputGroup}>
                <Text style={styles.loginInputLabel}>Institutional Officer Email</Text>
                <View style={styles.loginInputWrap}>
                  <Mail size={18} color="#64748B" style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.loginInputField}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    placeholder={`e.g. ${targetDesk.email}`}
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.loginInputGroup}>
                <Text style={styles.loginInputLabel}>Secure Desk Password</Text>
                <View style={styles.loginInputWrap}>
                  <Key size={18} color="#64748B" style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.loginInputField}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="Enter desk password"
                    placeholderTextColor="#64748B"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.loginEyeBtn}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.loginSubmitBtn, { backgroundColor: targetDesk.color }]}
                onPress={handleAdminLogin}
                activeOpacity={0.8}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Lock size={18} color="#FFFFFF" />
                    <Text style={styles.loginSubmitText}>Sign In to {targetDesk.roleName} Dashboard</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Quick Fill Demo Credentials */}
              <View style={styles.loginQuickFillSection}>
                <Text style={styles.loginQuickFillHeading}>Demo Credentials (Tap to Auto-fill):</Text>
                <View style={styles.loginQuickFillGrid}>
                  {(['AO', 'Warden', 'SWO', 'HOD'] as AdminRole[]).map((r) => {
                    const c = ADMIN_CREDENTIALS[r];
                    const isCur = loginRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.loginQuickFillBtn,
                          isCur && { borderColor: c.color, backgroundColor: `${c.color}22` },
                        ]}
                        onPress={() => handleQuickFill(r)}
                        activeOpacity={0.7}
                      >
                        {renderRoleIcon(r, 14, isCur ? c.color : '#94A3B8')}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.loginQuickFillRole, isCur && { color: c.color }]}>{r} Desk</Text>
                          <Text style={styles.loginQuickFillEmail} numberOfLines={1}>{c.email}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Institutional Security Notice Box */}
            <View style={styles.loginNoticeBox}>
              <ShieldAlert size={16} color="#94A3B8" />
              <Text style={styles.loginNoticeText}>
                Official Access Only: Every authorization, late-leave override, and student clearance is logged with cryptographic officer hash and real-time security gate notification.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  const currentOfficer = ADMIN_CREDENTIALS[authenticatedRole];

  return (
    <View style={styles.container}>
      {/* Top Admin Header */}
      <View style={styles.adminHeader}>
        <View style={styles.adminHeaderLeft}>
          <View style={styles.adminBadge}>
            <Image
              source={require('../../assets/alvas-logo.png')}
              style={{ width: 28, height: 28 }}
              resizeMode="contain"
            />
          </View>
          <View style={styles.adminTitleWrap}>
            <Text style={styles.adminTitle} numberOfLines={1} ellipsizeMode="tail">AIET Multi-Role Admin</Text>
            <Text style={styles.adminSub} numberOfLines={1} ellipsizeMode="tail">
              {currentOfficer.roleName} • {currentOfficer.adminName}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={styles.adminLogoutBtn}
            onPress={handleAdminLogout}
            activeOpacity={0.75}
          >
            <LogOut size={13} color="#EF4444" />
            <Text style={styles.adminLogoutBtnText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchRoleBtn}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
            activeOpacity={0.75}
          >
            <Text style={styles.switchRoleText}>← Student</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Officer Session Verification Strip */}
      <View style={styles.officerSessionStrip}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <View style={[styles.sessionDot, { backgroundColor: currentOfficer.color }]} />
          <Text style={styles.sessionText} numberOfLines={1}>
            <Text style={{ fontWeight: '700', color: currentOfficer.color }}>{currentOfficer.adminName}</Text> ({currentOfficer.email})
          </Text>
        </View>
        <View style={styles.sessionBadge}>
          <Lock size={10} color="#10B981" />
          <Text style={styles.sessionBadgeText}>Active Session</Text>
        </View>
      </View>

      {/* Global Institutional KPIs */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{activityFeed.length}</Text>
          <Text style={styles.metricLbl}>AO Feed</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: activeHealthCases.length > 0 ? '#DC2626' : colors.primary }]}>
            {activeHealthCases.length}
          </Text>
          <Text style={styles.metricLbl}>Sick / Hospital</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{pendingWarden + pendingSwo + pendingHod}</Text>
          <Text style={styles.metricLbl}>Pending Leaves</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricVal}>{openGrievances.length}</Text>
          <Text style={styles.metricLbl}>Open Issues</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricVal, { color: lowAttendanceSubjects.length > 0 ? '#D97706' : colors.success }]}>
            {lowAttendanceSubjects.length}
          </Text>
          <Text style={styles.metricLbl}>Attd. &lt;75%</Text>
        </View>
      </View>

      {/* =======================================================
          THE 4 ROLE SECTION BUTTONS (AO | WARDEN | SWO | HOD)
         ======================================================= */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.roleTabsRow}
        style={{ flexGrow: 0 }}
      >
        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'AO' && styles.roleTabBtnActiveAO]}
          onPress={() => handleSwitchRoleTab('AO')}
        >
          <View style={styles.roleTabIconWrap}>
            <Award size={18} color={activeRole === 'AO' ? '#4F46E5' : '#64748B'} />
          </View>
          <View>
            <Text style={[styles.roleTabTitle, activeRole === 'AO' && styles.roleTabTitleActive]}>AO Desk</Text>
            <Text style={styles.roleTabSub}>All Working ({students.length} Students)</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'Warden' && styles.roleTabBtnActiveWarden]}
          onPress={() => handleSwitchRoleTab('Warden')}
        >
          <View style={styles.roleTabIconWrap}>
            <Shield size={18} color={activeRole === 'Warden' ? '#D97706' : '#64748B'} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.roleTabTitle, activeRole === 'Warden' && styles.roleTabTitleActive]}>Warden</Text>
              {pendingWarden > 0 && <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{pendingWarden}</Text></View>}
            </View>
            <Text style={styles.roleTabSub}>Approve Leaves &lt; 5d</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'SWO' && styles.roleTabBtnActiveSWO]}
          onPress={() => handleSwitchRoleTab('SWO')}
        >
          <View style={styles.roleTabIconWrap}>
            <Users size={18} color={activeRole === 'SWO' ? '#059669' : '#64748B'} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.roleTabTitle, activeRole === 'SWO' && styles.roleTabTitleActive]}>SWO</Text>
              {pendingSwo > 0 && <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{pendingSwo}</Text></View>}
            </View>
            <Text style={styles.roleTabSub}>Leaves &le; 8d &amp; Issues</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'HOD' && styles.roleTabBtnActiveHOD]}
          onPress={() => handleSwitchRoleTab('HOD')}
        >
          <View style={styles.roleTabIconWrap}>
            <GraduationCap size={18} color={activeRole === 'HOD' ? '#7C3AED' : '#64748B'} />
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.roleTabTitle, activeRole === 'HOD' && styles.roleTabTitleActive]}>HOD</Text>
              {pendingHod > 0 && <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{pendingHod}</Text></View>}
            </View>
            <Text style={styles.roleTabSub}>8-10d Leaves &amp; Marks</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Main Scroll Content */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* =======================================================
            SECTION 1: AO (ADMINISTRATIVE OFFICER) - MASTER OVERSIGHT
           ======================================================= */}
        {activeRole === 'AO' && (
          <View style={styles.sectionContainer}>
            {/* AO Authority Banner */}
            <View style={styles.roleBannerAO}>
              <Text style={styles.roleBannerTitle}>AO Master Oversight & Institutional Chronicle</Text>
              <Text style={styles.roleBannerSub}>
                Unified surveillance consolidating Gate Scans, Multi-Tier Leave Sanctions (Warden/SWO/HOD), Sick Bay & Hospital Cases, Hostel Grievances, and Academic Marks.
              </Text>
            </View>

            {/* Sub-Tabs for AO: All Operations */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subTabsRow}
              style={{ flexGrow: 0, marginBottom: 8 }}
            >
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'directory' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('directory')}
              >
                <Users size={13} color={aoSubTab === 'directory' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'directory' && styles.subTabBtnTextActive]}>
                  Registered Students ({students.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'latecomers' && styles.subTabBtnActiveEmergency]}
                onPress={() => setAoSubTab('latecomers')}
              >
                <Clock size={13} color={aoSubTab === 'latecomers' ? '#DC2626' : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'latecomers' && { color: '#DC2626', fontWeight: '800' }]}>
                  Latecomers ({latecomersList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'issues' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('issues')}
              >
                <Wrench size={13} color={aoSubTab === 'issues' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'issues' && styles.subTabBtnTextActive]}>
                  Mess &amp; Hostel Issues ({allGrievances.length + allMessRatings.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'emergency' && styles.subTabBtnActiveEmergency]}
                onPress={() => setAoSubTab('emergency')}
              >
                <ShieldAlert size={13} color={aoSubTab === 'emergency' ? '#DC2626' : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'emergency' && styles.subTabBtnTextActiveEmergency]}>
                  Approve Emergency
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'duplicate_coupon' && styles.subTabBtnActiveCoupon]}
                onPress={() => setAoSubTab('duplicate_coupon')}
              >
                <Ticket size={13} color={aoSubTab === 'duplicate_coupon' ? '#D97706' : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'duplicate_coupon' && styles.subTabBtnTextActiveCoupon]}>
                  Duplicate Pass (&lt; 2 Days)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'petitions' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('petitions')}
              >
                <FileText size={13} color={aoSubTab === 'petitions' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'petitions' && styles.subTabBtnTextActive]}>
                  Student Petitions ({aoPetitions.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'feed' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('feed')}
              >
                <Activity size={13} color={aoSubTab === 'feed' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'feed' && styles.subTabBtnTextActive]}>
                  Chronicle Feed ({activityFeed.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'gate' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('gate')}
              >
                <QrCode size={13} color={aoSubTab === 'gate' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'gate' && styles.subTabBtnTextActive]}>
                  Gate Scanner &amp; Dossier
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* AO SUB-TAB 1: LIVE MASTER ACTIVITY FEED */}
            {aoSubTab === 'feed' && (
              <View style={{ gap: 10 }}>
                {/* Filter Pills for Feed */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsRow}>
                  {['all', 'Gate Scan', 'Leave Sanction', 'Health Case', 'Hostel Issue', 'Academic Update'].map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterPill, activityFilter === f && styles.filterPillActive]}
                      onPress={() => setActivityFilter(f)}
                    >
                      <Text style={[styles.filterPillText, activityFilter === f && styles.filterPillTextActive]}>
                        {f === 'all' ? 'All Activities' : f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {activityFeed
                  .filter((item) => activityFilter === 'all' || item.type === activityFilter)
                  .map((item) => (
                    <View key={item.id} style={styles.activityCard}>
                      <View style={styles.activityCardHeader}>
                        <View style={styles.activityTypeBadgeRow}>
                          <View
                            style={[
                              styles.activityTypeDot,
                              item.severity === 'critical'
                                ? { backgroundColor: colors.danger }
                                : item.severity === 'warning'
                                ? { backgroundColor: '#F59E0B' }
                                : { backgroundColor: colors.success },
                            ]}
                          />
                          <Text style={styles.activityBadgeLabel}>{item.badge}</Text>
                        </View>
                        <Text style={styles.activityTime}>{item.timestamp}</Text>
                      </View>

                      <Text style={styles.activityTitle}>{item.title}</Text>
                      <Text style={styles.activityDesc}>{item.description}</Text>

                      <View style={styles.activityFooterRow}>
                        <Text style={styles.activityActor}>Logged By: <Text style={{ fontWeight: '700' }}>{item.actor}</Text></Text>
                        {item.targetUsn && (
                          <TouchableOpacity
                            style={styles.activityInspectBtn}
                            onPress={async () => {
                              setBarcodeSearch(item.targetUsn!);
                              const dossier = await StorageService.getStudentScanDossier(item.targetUsn!);
                              if (dossier) setStudentDossier(dossier);
                              setAoSubTab('gate');
                            }}
                          >
                            <Text style={styles.activityInspectText}>View Dossier ➔</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            )}

            {/* AO SUB-TAB 2: GATE SECURITY SCANNER & DOSSIER */}
            {aoSubTab === 'gate' && (
              <View style={{ gap: 12 }}>
                {/* Security Scanner Card */}
                <View style={styles.scannerPanel}>
                  <View style={styles.scannerPanelHeader}>
                    <View style={styles.scannerIconWrap}>
                      <QrCode size={18} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scannerPanelTitle}>Gate Security Barcode Scanner</Text>
                      <Text style={styles.scannerPanelSub}>Scan Barcode or Enter USN / Registration ID</Text>
                    </View>
                  </View>

                  <View style={styles.barcodeInputRow}>
                    <TextInput
                      style={styles.barcodeInput}
                      placeholder="e.g. 1RV22CS089, REG-OUT-3012, REG-LV-2001"
                      placeholderTextColor={colors.textMuted}
                      value={barcodeSearch}
                      onChangeText={setBarcodeSearch}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity style={styles.barcodeScanBtn} onPress={handleSearchBarcode}>
                      <Search size={16} color="#FFFFFF" />
                      <Text style={styles.barcodeScanBtnText}>Lookup</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quick-Pick Registered Passes */}
                  <Text style={styles.quickPickLabel}>QUICK-SELECT REGISTERED HOSTEL PASS:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPickRow}>
                    {registrations.slice(0, 5).map((reg) => (
                      <TouchableOpacity
                        key={reg.id}
                        style={[
                          styles.quickPickChip,
                          barcodeSearch === reg.registrationId && styles.quickPickChipActive,
                        ]}
                        onPress={() => handleSelectRegistration(reg)}
                      >
                        <Text style={styles.quickPickChipType}>{reg.type}</Text>
                        <Text style={styles.quickPickChipId}>{reg.registrationId}</Text>
                        <Text style={styles.quickPickChipName}>{reg.studentName}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Dossier Card If Scanned */}
                {studentDossier && (
                  <View style={styles.dossierContainer}>
                    <View style={styles.dossierHeader}>
                      <View>
                        <Text style={styles.dossierName}>{studentDossier.student.name} ({studentDossier.student.usn})</Text>
                        <Text style={styles.dossierSub}>Room {studentDossier.student.roomNumber} • {studentDossier.student.branch}</Text>
                      </View>
                      <View
                        style={[
                          styles.campusStatusBadge,
                          studentDossier.campusStatus === 'OUTSIDE CAMPUS' ? styles.campusStatusOutside : styles.campusStatusInside,
                        ]}
                      >
                        <Text style={styles.campusStatusText}>{studentDossier.campusStatus}</Text>
                      </View>
                    </View>

                    {/* Unified Barcode */}
                    <View style={styles.barcodePreviewStrip}>
                      <BarcodeView value={studentDossier.barcode} height={42} />
                      <Text style={styles.barcodeSubText}>Master Barcode: {studentDossier.barcode}</Text>
                    </View>

                    {/* 15-Minute Re-Entry Cooldown Banner for Guard/Admin */}
                    {studentDossier.campusStatus === 'OUTSIDE CAMPUS' && studentDossier.checkInCooldown?.isRestricted && (
                      <View style={styles.dossierCooldownBanner}>
                        <View style={styles.dossierCooldownHeader}>
                          <Lock size={14} color="#B45309" />
                          <Text style={styles.dossierCooldownTitle}>15-MIN RE-ENTRY COOLDOWN ACTIVE</Text>
                        </View>
                        <Text style={styles.dossierCooldownText}>
                          Student checked out at {studentDossier.checkInCooldown.checkOutTimeStr || 'recently'}. Re-entry gate check-in is restricted for 15 minutes as per hostel safety policy.
                        </Text>
                        <View style={styles.dossierCooldownTimerRow}>
                          <Clock size={13} color="#D97706" />
                          <Text style={styles.dossierCooldownTimer}>
                            Remaining: <Text style={{ fontWeight: '800' }}>{studentDossier.checkInCooldown.remainingFormatted}</Text> (Eligible at {studentDossier.checkInCooldown.allowedCheckInTime})
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Disciplinary Outing Suspension Status in Gate Dossier */}
                    {studentDossier.isOutingBlocked && (
                      <View style={styles.dossierBlockedBanner}>
                        <View style={styles.dossierBlockedHeader}>
                          <ShieldAlert size={15} color="#DC2626" />
                          <Text style={styles.dossierBlockedTitle}>NEXT OUTING PRIVILEGES SUSPENDED</Text>
                        </View>
                        <Text style={styles.dossierBlockedText}>
                          {studentDossier.outingBlockReason || 'Late return curfew breach'}. Student must obtain SWO clearance before generating subsequent outings.
                        </Text>
                      </View>
                    )}

                    {/* Guard Direct Gate Action Buttons */}
                    <View style={styles.dossierGateActionRow}>
                      <TouchableOpacity
                        style={[
                          styles.dossierGateBtn,
                          styles.dossierGateBtnOut,
                          studentDossier.campusStatus === 'OUTSIDE CAMPUS' && styles.dossierGateBtnDisabled,
                        ]}
                        onPress={() => handleBarcodeCheckInOut(studentDossier.student.usn, 'Check Out')}
                        disabled={studentDossier.campusStatus === 'OUTSIDE CAMPUS'}
                      >
                        <LogOut size={14} color="#FFFFFF" />
                        <Text style={styles.dossierGateBtnText}>Gate Check Out</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dossierGateBtn,
                          styles.dossierGateBtnIn,
                          studentDossier.checkInCooldown?.isRestricted && styles.dossierGateBtnLocked,
                        ]}
                        onPress={() => handleBarcodeCheckInOut(studentDossier.student.usn, 'Check In')}
                      >
                        {studentDossier.checkInCooldown?.isRestricted ? (
                          <Lock size={14} color="#92400E" />
                        ) : (
                          <LogIn size={14} color="#FFFFFF" />
                        )}
                        <Text
                          style={[
                            styles.dossierGateBtnText,
                            studentDossier.checkInCooldown?.isRestricted && styles.dossierGateBtnTextLocked,
                          ]}
                        >
                          {studentDossier.checkInCooldown?.isRestricted
                            ? `Locked (${studentDossier.checkInCooldown.remainingFormatted})`
                            : 'Gate Check In'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Pass Breakdown Tabs */}
                    <View style={styles.dossierTabsRow}>
                      <TouchableOpacity
                        style={[styles.dossierTabBtn, dossierCategory === 'outing' && styles.dossierTabBtnActive]}
                        onPress={() => setDossierCategory('outing')}
                      >
                        <Text style={[styles.dossierTabBtnText, dossierCategory === 'outing' && styles.dossierTabBtnTextActive]}>
                          Outing ({studentDossier.outingOutpass.totalCount})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dossierTabBtn, dossierCategory === 'holiday' && styles.dossierTabBtnActive]}
                        onPress={() => setDossierCategory('holiday')}
                      >
                        <Text style={[styles.dossierTabBtnText, dossierCategory === 'holiday' && styles.dossierTabBtnTextActive]}>
                          Govt Holiday ({studentDossier.govtHolidayHomePass.totalCount})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.dossierTabBtn, dossierCategory === 'leave' && styles.dossierTabBtnActive]}
                        onPress={() => setDossierCategory('leave')}
                      >
                        <Text style={[styles.dossierTabBtnText, dossierCategory === 'leave' && styles.dossierTabBtnTextActive]}>
                          Regular Leave ({studentDossier.regularLeavePass.totalCount})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Gate Movement Log for this Student */}
                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Movement & Gate Event History</Text>
                    {studentDossier.movementHistory.map((evt) => (
                      <View key={evt.id} style={styles.movementItem}>
                        <View style={styles.movementActionRow}>
                          <View
                            style={[
                              styles.movementBadge,
                              evt.action === 'Check In' ? styles.movementBadgeIn : styles.movementBadgeOut,
                            ]}
                          >
                            <Text style={styles.movementBadgeText}>{evt.action.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.movementTime}>{evt.timestamp}</Text>
                        </View>
                        <Text style={styles.movementGate}>{evt.gate} • Guard: {evt.guardName}</Text>
                        {evt.remarks && <Text style={styles.movementRemarks}>"{evt.remarks}"</Text>}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* AO SUB-TAB: ALL REGISTERED STUDENT LIST & DEVICE STATUS */}
            {aoSubTab === 'directory' && (
              <View style={{ gap: 12 }}>
                <View style={styles.securityPolicyCard}>
                  <View style={styles.shieldHeader}>
                    <Users size={16} color="#0F766E" />
                    <Text style={styles.shieldTitle}>All Registered Hosteller Roster &amp; Single Device Control</Text>
                  </View>
                  <Text style={styles.shieldDesc}>
                    Complete administrative list of all registered hostel students. Manage single device bindings, campus residence details, and verified primary smartphones.
                  </Text>
                </View>

                {/* Search Bar for Directory */}
                <View style={styles.directorySearchBox}>
                  <Search size={16} color={colors.textSecondary} />
                  <TextInput
                    style={styles.directorySearchInput}
                    placeholder="Search by student name, USN, room, or branch..."
                    placeholderTextColor={colors.textMuted}
                    value={aoStudentSearch}
                    onChangeText={setAoStudentSearch}
                  />
                  {aoStudentSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setAoStudentSearch('')}>
                      <X size={15} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {students
                  .filter((std) => {
                    const q = aoStudentSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      std.name?.toLowerCase().includes(q) ||
                      std.usn?.toLowerCase().includes(q) ||
                      (std.roomNumber && std.roomNumber.toLowerCase().includes(q)) ||
                      (std.branch && std.branch.toLowerCase().includes(q)) ||
                      (std.hostelBlock && std.hostelBlock.toLowerCase().includes(q))
                    );
                  })
                  .map((std) => {
                    const isOutside = gateLogs.some(
                      (g) => g.usn.toUpperCase() === std.usn.toUpperCase() && g.action === 'Check Out'
                    );
                    const isCurfewBlocked = blockedStudents.some(
                      (b) => b.usn.toUpperCase() === std.usn.toUpperCase()
                    );
                    return (
                      <View key={std.usn} style={styles.adminCard}>
                        <View style={styles.adminCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.studentNameFull}>{std.name}</Text>
                              <View style={styles.usnBadgePill}>
                                <Text style={styles.usnBadgePillText}>{std.usn}</Text>
                              </View>
                            </View>
                            <Text style={styles.studentSub}>
                              Room {std.roomNumber} • {std.hostelBlock || 'Cauvery Block'} • {std.branch} ({std.year || '3rd Year'})
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 4 }}>
                            <View
                              style={[
                                styles.campusStatusPill,
                                isOutside ? styles.campusStatusPillOutside : styles.campusStatusPillInside,
                              ]}
                            >
                              <Text style={styles.campusStatusPillText}>
                                {isOutside ? 'OUTSIDE CAMPUS' : 'INSIDE HOSTEL'}
                              </Text>
                            </View>
                            {isCurfewBlocked && (
                              <View style={styles.curfewBlockedMiniBadge}>
                                <Text style={styles.curfewBlockedMiniText}>OUTPASS LOCKED</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        <View style={styles.studentInfoStrip}>
                          <Text style={styles.studentInfoLine}>
                            <Text style={{ fontWeight: '700' }}>Guardian Contact: </Text>
                            {std.guardianContact || '+91 98765 43210'}
                          </Text>
                        </View>

                        <View style={styles.deviceDetailsBox}>
                          <Smartphone size={18} color={colors.primary} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.deviceModelText}>{std.deviceModel}</Text>
                            <Text style={styles.deviceIdText}>Bound Hardware ID: {std.activeDeviceId}</Text>
                          </View>
                          <View style={styles.deviceActiveBadge}>
                            <Text style={styles.deviceActiveText}>1 Bound Device</Text>
                          </View>
                        </View>

                        <View style={styles.deviceActionsRow}>
                          <TouchableOpacity
                            style={styles.testConflictBtn}
                            onPress={() => handleSimulateDeviceConflict(std.name)}
                          >
                            <AlertTriangle size={13} color="#B45309" />
                            <Text style={styles.testConflictText}>Test 2nd Device Block</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.resetDeviceBtn}
                            onPress={() => handleResetDevice(std.usn)}
                          >
                            <RefreshCw size={13} color={colors.danger} />
                            <Text style={styles.resetDeviceText}>Reset Binding</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.viewDossierMiniBtn}
                            onPress={async () => {
                              setBarcodeSearch(std.usn);
                              const dossier = await StorageService.getStudentScanDossier(std.usn);
                              if (dossier) setStudentDossier(dossier);
                              setAoSubTab('gate');
                            }}
                          >
                            <QrCode size={13} color="#4F46E5" />
                            <Text style={styles.viewDossierMiniText}>Gate Dossier</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* AO SUB-TAB: LATECOMERS & CURFEW BREACH LOGS */}
            {aoSubTab === 'latecomers' && (
              <View style={{ gap: 12 }}>
                <View style={styles.clearanceBanner}>
                  <View style={styles.clearanceBannerHeader}>
                    <Clock size={20} color="#DC2626" />
                    <Text style={styles.clearanceBannerTitle}>
                      Latecomers &amp; Curfew Breaches (&gt; 04:30 PM Grace Cutoff)
                    </Text>
                  </View>
                  <Text style={styles.clearanceBannerDesc}>
                    Institutional Rule: Students who check in after the 04:30 PM general curfew (or 02:30 PM Govt Holiday curfew) are recorded by gate security guards. All late returns are cataloged below with exact delay duration and violation notes.
                  </Text>
                </View>

                {/* Latecomer Metrics */}
                <View style={styles.metricsStrip}>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: '#DC2626' }]}>{latecomersList.length}</Text>
                    <Text style={styles.metricLbl}>Late Returns</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: '#D97706' }]}>04:30 PM</Text>
                    <Text style={styles.metricLbl}>Curfew Cutoff</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricVal, { color: colors.danger }]}>{blockedStudents.length}</Text>
                    <Text style={styles.metricLbl}>Outpass Locked</Text>
                  </View>
                </View>

                {latecomersList.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <CheckCircle2 size={36} color="#10B981" />
                    <Text style={styles.emptyStateTitle}>No Curfew Breaches Recorded</Text>
                    <Text style={styles.emptyStateSub}>All students have reported to campus prior to 04:30 PM cutoff.</Text>
                  </View>
                ) : (
                  latecomersList.map((log) => {
                    const isBlocked = blockedStudents.some(
                      (b) => b.usn.toUpperCase() === log.usn.toUpperCase()
                    );
                    return (
                      <View key={log.id} style={styles.latecomerCard}>
                        <View style={styles.latecomerCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.latecomerName}>{log.studentName}</Text>
                              <View style={styles.latecomerUsnTag}>
                                <Text style={styles.latecomerUsnText}>{log.usn}</Text>
                              </View>
                            </View>
                            <Text style={styles.latecomerSub}>
                              Room {log.roomNumber} • Outing Destination: {log.destination}
                            </Text>
                          </View>
                          <View style={styles.curfewBreachPill}>
                            <Text style={styles.curfewBreachPillText}>LATE RETURN</Text>
                          </View>
                        </View>

                        <View style={styles.latecomerTimingBox}>
                          <View style={styles.timingItem}>
                            <Text style={styles.timingLbl}>Actual Check-In:</Text>
                            <Text style={[styles.timingVal, { color: '#DC2626' }]}>{log.timestamp}</Text>
                          </View>
                          <View style={styles.timingItem}>
                            <Text style={styles.timingLbl}>Hostel Curfew:</Text>
                            <Text style={styles.timingVal}>{log.curfewTime || '04:30 PM'}</Text>
                          </View>
                          <View style={styles.timingItem}>
                            <Text style={styles.timingLbl}>Gate Station:</Text>
                            <Text style={styles.timingVal}>{log.station}</Text>
                          </View>
                        </View>

                        <View style={styles.latecomerRemarksBox}>
                          <Text style={styles.latecomerRemarksText}>
                            <Text style={{ fontWeight: '700' }}>Security Log: </Text>
                            {log.remarks || 'Returned late past curfew without pre-authorization.'}
                          </Text>
                        </View>

                        <View style={styles.latecomerActionsRow}>
                          <TouchableOpacity
                            style={styles.latecomerDossierBtn}
                            onPress={async () => {
                              setBarcodeSearch(log.usn);
                              const dossier = await StorageService.getStudentScanDossier(log.usn);
                              if (dossier) setStudentDossier(dossier);
                              setAoSubTab('gate');
                            }}
                          >
                            <QrCode size={13} color="#4F46E5" />
                            <Text style={styles.latecomerDossierBtnText}>Inspect Gate Dossier</Text>
                          </TouchableOpacity>

                          {!isBlocked ? (
                            <TouchableOpacity
                              style={styles.latecomerLockBtn}
                              onPress={() => {
                                handleSwoLockOuting(log.usn, `Curfew breach on ${log.timestamp}: Returned late past 04:30 PM cutoff.`);
                              }}
                            >
                              <ShieldAlert size={13} color="#FFFFFF" />
                              <Text style={styles.latecomerLockBtnText}>Lock Outpass</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.latecomerAlreadyLockedBadge}>
                              <Lock size={12} color="#92400E" />
                              <Text style={styles.latecomerAlreadyLockedText}>Outpass Suspended</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* AO SUB-TAB: ISSUES OF MESS & HOSTEL */}
            {aoSubTab === 'issues' && (
              <View style={{ gap: 12 }}>
                <View style={styles.roleBannerAO}>
                  <Text style={styles.roleBannerTitle}>Hostel &amp; Mess Consolidated Issues Hub</Text>
                  <Text style={styles.roleBannerSub}>
                    Unified monitoring of all hostel maintenance grievances (plumbing, electrical, room upkeep) and mess dining quality complaints, ratings, and inspection proofs.
                  </Text>
                </View>

                {/* Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsRow}>
                  {[
                    { key: 'all', label: `All Issues (${allGrievances.length + allMessRatings.length})` },
                    { key: 'hostel', label: `Hostel Grievances (${allGrievances.length})` },
                    { key: 'mess', label: `Mess Food & Inspection (${allMessRatings.length})` },
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.filterPill, aoIssueFilter === tab.key && styles.filterPillActive]}
                      onPress={() => setAoIssueFilter(tab.key as any)}
                    >
                      <Text style={[styles.filterPillText, aoIssueFilter === tab.key && styles.filterPillTextActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 1. HOSTEL GRIEVANCES */}
                {(aoIssueFilter === 'all' || aoIssueFilter === 'hostel') && (
                  <View style={{ gap: 10 }}>
                    <Text style={styles.sectionTitle}>Hostel Maintenance Tickets ({allGrievances.length})</Text>
                    {allGrievances.map((ticket) => (
                      <View key={ticket.id} style={styles.adminCard}>
                        <View style={styles.adminCardHeader}>
                          <View>
                            <Text style={styles.studentNameFull}>Room {ticket.roomNumber} ({ticket.usn})</Text>
                            <Text style={styles.studentSub}>
                              Category: {ticket.category} • Urgency: {ticket.urgency}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusTag,
                              ticket.status === 'Resolved' ? styles.statusApproved : styles.statusPending,
                            ]}
                          >
                            <Text style={styles.statusTagText}>{ticket.status}</Text>
                          </View>
                        </View>

                        <Text style={styles.ticketDescText}>"{ticket.description}"</Text>

                        {ticket.photoUri && (
                          <View style={styles.adminInspectionPhotoBox}>
                            <View style={styles.adminPhotoHeaderRow}>
                              <Camera size={13} color="#0D9488" />
                              <Text style={styles.adminPhotoTagText}>Hostel Inspection Proof</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.adminPhotoThumbnailWrapper}
                              onPress={() =>
                                setSelectedPhotoModal({
                                  uri: ticket.photoUri!,
                                  title: `Hostel Ticket ${ticket.id} - Room ${ticket.roomNumber}`,
                                  subtitle: `Category: ${ticket.category} • USN: ${ticket.usn}`,
                                })
                              }
                            >
                              <Image source={{ uri: ticket.photoUri }} style={styles.adminPhotoThumbnail} resizeMode="cover" />
                              <View style={styles.adminPhotoEnlargeBadge}>
                                <Eye size={12} color="#FFFFFF" />
                                <Text style={styles.adminPhotoEnlargeText}>View Proof</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}

                        {ticket.adminRemark && (
                          <View style={styles.assignedNoteBox}>
                            <Text style={styles.assignedNoteText}>
                              <Text style={{ fontWeight: '700' }}>Assignment: </Text>
                              {ticket.adminRemark}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* 2. MESS RATINGS & INSPECTIONS */}
                {(aoIssueFilter === 'all' || aoIssueFilter === 'mess') && (
                  <View style={{ gap: 10, marginTop: aoIssueFilter === 'all' ? 14 : 0 }}>
                    <Text style={styles.sectionTitle}>Mess Meal Reviews &amp; Food Inspections ({allMessRatings.length})</Text>
                    {allMessRatings.map((rating) => (
                      <View key={rating.id} style={styles.adminCard}>
                        <View style={styles.adminCardHeader}>
                          <View>
                            <Text style={styles.studentNameFull}>
                              {rating.mealType} ({rating.date})
                            </Text>
                            <Text style={styles.studentSub}>
                              Submitted by: {rating.studentName || 'Hosteller'} ({rating.usn || '1RV22CS089'}) • Room {rating.roomNumber || 'B-304'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                color={star <= rating.rating ? '#F59E0B' : '#E2E8F0'}
                                fill={star <= rating.rating ? '#F59E0B' : 'transparent'}
                              />
                            ))}
                          </View>
                        </View>

                        {rating.feedback ? (
                          <Text style={[styles.ticketDescText, { fontStyle: 'italic' }]}>"{rating.feedback}"</Text>
                        ) : null}

                        {rating.photoUri && (
                          <View style={styles.adminInspectionPhotoBox}>
                            <View style={styles.adminPhotoHeaderRow}>
                              <Utensils size={13} color="#D97706" />
                              <Text style={styles.adminPhotoTagText}>Mess Food Camera Inspection Proof</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.adminPhotoThumbnailWrapper}
                              onPress={() =>
                                setSelectedPhotoModal({
                                  uri: rating.photoUri!,
                                  title: `${rating.mealType} Meal Inspection`,
                                  subtitle: `Rating: ${rating.rating}/5 Stars • ${rating.date}`,
                                })
                              }
                            >
                              <Image source={{ uri: rating.photoUri }} style={styles.adminPhotoThumbnail} resizeMode="cover" />
                              <View style={styles.adminPhotoEnlargeBadge}>
                                <Eye size={12} color="#FFFFFF" />
                                <Text style={styles.adminPhotoEnlargeText}>View Food Photo</Text>
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* AO SUB-TAB: STUDENT OFFICE PETITIONS (ONLY AO CAN APPROVE) */}
            {aoSubTab === 'petitions' && (
              <View style={{ gap: 14 }}>
                <View style={styles.petitionRoleBanner}>
                  <View style={styles.petitionBannerHeader}>
                    <FileText size={22} color="#FFFFFF" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.petitionBannerTitle}>
                        AO Student Petitions &amp; Special Office Permissions
                      </Text>
                      <Text style={styles.petitionBannerSub}>
                        Institutional Rule: Only the Administrative Officer (AO Desk) is empowered to review and sanction Fees Delay Permission, Mess Bill Reduction, Official Study Certificates, and Marks Card / Transcript requests.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Filter Pills for Petitions */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsRow}>
                  {[
                    'all',
                    'Fees Delay Permission',
                    'Mess Bill Reduction',
                    'Study Certificate',
                    'Marks Card / Grade Transcript',
                  ].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.filterPill, aoPetitionFilter === type && styles.filterPillActive]}
                      onPress={() => setAoPetitionFilter(type)}
                    >
                      <Text style={[styles.filterPillText, aoPetitionFilter === type && styles.filterPillTextActive]}>
                        {type === 'all' ? `All Petitions (${aoPetitions.length})` : type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {aoPetitions
                  .filter((p) => aoPetitionFilter === 'all' || p.type === aoPetitionFilter)
                  .map((petition) => {
                    const isPending = petition.status === 'Pending AO Approval';
                    const isApproved = petition.status === 'Approved by AO';
                    return (
                      <View key={petition.id} style={styles.petitionCard}>
                        <View style={styles.petitionCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.petitionStudentName}>Applicant USN: {petition.usn}</Text>
                            </View>
                            <Text style={styles.petitionStudentSub}>
                              Room {petition.roomNumber} • {petition.hostelBlock} • Applied: {petition.requestedDate}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.petitionStatusBadge,
                              isApproved ? styles.statusApproved : isPending ? styles.statusPending : styles.statusRejected,
                            ]}
                          >
                            <Text style={styles.petitionStatusBadgeText}>{petition.status}</Text>
                          </View>
                        </View>

                        {/* Petition Type Strip */}
                        <View style={styles.petitionTypeBox}>
                          <Award size={14} color="#4F46E5" />
                          <Text style={styles.petitionTypeText}>{petition.type}</Text>
                        </View>

                        {/* Detailed Parameters */}
                        <View style={styles.petitionDetailsBox}>
                          <Text style={styles.petitionReasonText}>
                            <Text style={{ fontWeight: '700' }}>Reason: </Text>
                            "{petition.reason}"
                          </Text>
                          {petition.expectedPaymentDate && (
                            <Text style={styles.petitionParamLine}>
                              <Text style={{ fontWeight: '700' }}>Requested Extension Date: </Text>
                              {petition.expectedPaymentDate}
                            </Text>
                          )}
                          {petition.reductionDays !== undefined && (
                            <Text style={styles.petitionParamLine}>
                              <Text style={{ fontWeight: '700' }}>Mess Bill Rebate Days: </Text>
                              {petition.reductionDays} Days
                            </Text>
                          )}
                          {petition.purpose && (
                            <Text style={styles.petitionParamLine}>
                              <Text style={{ fontWeight: '700' }}>Official Purpose: </Text>
                              {petition.purpose}
                            </Text>
                          )}
                          {petition.targetSemester !== undefined && (
                            <Text style={styles.petitionParamLine}>
                              <Text style={{ fontWeight: '700' }}>Target Semester: </Text>
                              Semester {petition.targetSemester}
                            </Text>
                          )}
                        </View>

                        {/* If Approved, show certificate token / reference */}
                        {isApproved && petition.certificateRefNumber && (
                          <View style={styles.petitionRefBox}>
                            <CheckCircle2 size={15} color="#10B981" />
                            <Text style={styles.petitionRefText}>
                              Sanction Reference: <Text style={{ fontWeight: '800' }}>{petition.certificateRefNumber}</Text>
                            </Text>
                          </View>
                        )}

                        {petition.aoRemarks && (
                          <View style={styles.petitionRemarksBox}>
                            <Text style={styles.petitionRemarksText}>
                              <Text style={{ fontWeight: '700' }}>AO Note: </Text>
                              {petition.aoRemarks}
                            </Text>
                          </View>
                        )}

                        {/* Action buttons if Pending */}
                        {isPending && (
                          <View style={styles.petitionActionsRow}>
                            <TouchableOpacity
                              style={styles.approvePetitionBtn}
                              onPress={() => setSelectedPetitionToReview(petition)}
                            >
                              <CheckCircle2 size={14} color="#FFFFFF" />
                              <Text style={styles.approvePetitionBtnText}>Review &amp; Sanction (AO)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.rejectPetitionBtn}
                              onPress={() => handleRejectPetition(petition)}
                            >
                              <XCircle size={14} color={colors.danger} />
                              <Text style={styles.rejectPetitionBtnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            )}

            {/* AO SUB-TAB 4: GRANT EMERGENCY LEAVE (AO DISCRETIONARY DESK) */}
            {aoSubTab === 'emergency' && (
              <View style={{ gap: 14 }}>
                {/* Emergency Authority Banner */}
                <View style={styles.emergencyRoleBanner}>
                  <View style={styles.emergencyBannerHeader}>
                    <View style={styles.emergencyIconBadge}>
                      <ShieldAlert size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emergencyBannerTitle}>AO Discretionary Emergency Leave Grant</Text>
                      <Text style={styles.emergencyBannerSub}>
                        Administrative Officer prerogative to grant instant approved leave and campus gate outpass for any student by entering their USN. Pass generates instantly on student portal with zero leave quota deduction.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Student Selector Chips */}
                <View style={styles.emergencyCard}>
                  <Text style={styles.inputSectionTitle}>1. Select Hosteller by USN</Text>
                  <Text style={styles.inputSectionSub}>
                    Tap a registered student below or manually type any student's USN:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStdScroll}>
                    {students.map((s) => {
                      const isSelected = emergencyUsn.toUpperCase() === s.usn.toUpperCase();
                      return (
                        <TouchableOpacity
                          key={s.usn}
                          style={[styles.quickStdChip, isSelected && styles.quickStdChipActive]}
                          onPress={() => {
                            setEmergencyUsn(s.usn);
                          }}
                        >
                          <Text style={[styles.quickStdChipUsn, isSelected && styles.quickStdChipUsnActive]}>
                            {s.usn}
                          </Text>
                          <Text style={[styles.quickStdChipName, isSelected && styles.quickStdChipNameActive]}>
                            {s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Manual USN Input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>STUDENT USN (UNIVERSITY SEAT NUMBER) *</Text>
                    <View style={styles.usnInputWrapper}>
                      <TextInput
                        style={styles.usnTextInput}
                        value={emergencyUsn}
                        onChangeText={(t) => setEmergencyUsn(t.toUpperCase())}
                        placeholder="e.g. 1RV22CS089"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={styles.usnLookupBtn}
                        onPress={() => {
                          const matched = students.find((s) => s.usn.toUpperCase() === emergencyUsn.trim().toUpperCase());
                          if (matched) {
                            Alert.alert('Student Verified', `Name: ${matched.name}\nRoom: ${matched.roomNumber}\nBlock: ${matched.hostelBlock}\nGuardian: ${matched.guardianContact}`);
                          } else {
                            Alert.alert('Custom Student', `USN ${emergencyUsn} not in seed list. Emergency pass will be generated for this USN directly.`);
                          }
                        }}
                      >
                        <Search size={14} color="#FFFFFF" />
                        <Text style={styles.usnLookupBtnText}>Verify</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Student Profile Preview Card */}
                  {(() => {
                    const clean = emergencyUsn.trim().toUpperCase();
                    const matched = students.find((s) => s.usn.toUpperCase() === clean);
                    return (
                      <View style={styles.studentPreviewCard}>
                        <View style={styles.studentPreviewHeader}>
                          <View style={styles.studentAvatarCircle}>
                            <Users size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentPreviewName}>
                              {matched ? matched.name : `Student (${clean || 'No USN'})`}
                            </Text>
                            <Text style={styles.studentPreviewMeta}>
                              USN: <Text style={{ fontWeight: '800' }}>{clean || 'N/A'}</Text> • Room: {matched?.roomNumber || 'B-304'} • {matched?.hostelBlock || 'Cauvery Block B-3'}
                            </Text>
                          </View>
                          <View style={styles.statusVerifiedBadge}>
                            <CheckCircle2 size={11} color="#10B981" />
                            <Text style={styles.statusVerifiedText}>Hosteller</Text>
                          </View>
                        </View>
                        <View style={styles.studentContactRow}>
                          <Text style={styles.studentContactLabel}>Guardian Contact: </Text>
                          <Text style={styles.studentContactVal}>{matched?.guardianContact || '+91 98765 43210'}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* Emergency Leave Details Form */}
                <View style={styles.emergencyCard}>
                  <Text style={styles.inputSectionTitle}>2. Emergency Leave Parameters</Text>

                  {/* Preset Reasons */}
                  <Text style={styles.fieldLabel}>EMERGENCY CATEGORY & REASON *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {[
                      'Urgent Medical Attention / Hospitalization',
                      'Family Medical Emergency',
                      'Bereavement in Immediate Family',
                      'Critical Personal / Legal Emergency',
                      'Special Academic Exigency',
                    ].map((reason) => (
                      <TouchableOpacity
                        key={reason}
                        style={[styles.reasonPresetPill, emergencyReason === reason && styles.reasonPresetPillActive]}
                        onPress={() => setEmergencyReason(reason)}
                      >
                        <Text style={[styles.reasonPresetText, emergencyReason === reason && styles.reasonPresetTextActive]}>
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TextInput
                    style={styles.formInput}
                    value={emergencyReason}
                    onChangeText={setEmergencyReason}
                    placeholder="Describe nature of emergency"
                    placeholderTextColor={colors.textMuted}
                  />

                  {/* Destination */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>DESTINATION (HOSPITAL / HOME / CITY) *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={emergencyDestination}
                      onChangeText={setEmergencyDestination}
                      placeholder="e.g. Mangalore General Hospital / Home (Udupi)"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Dates Row */}
                  <View style={styles.rowTwoInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>START DATE *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={emergencyStartDate}
                        onChangeText={setEmergencyStartDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>RETURN DATE *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={emergencyEndDate}
                        onChangeText={setEmergencyEndDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ width: 70 }}>
                      <Text style={styles.fieldLabel}>DAYS</Text>
                      <TextInput
                        style={[styles.formInput, { textAlign: 'center' }]}
                        value={emergencyTotalDays}
                        onChangeText={setEmergencyTotalDays}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Parent Verification Toggle */}
                  <TouchableOpacity
                    style={styles.parentToggleRow}
                    onPress={() => setEmergencyParentIntimated(!emergencyParentIntimated)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkboxSquare, emergencyParentIntimated && styles.checkboxSquareActive]}>
                      {emergencyParentIntimated && <CheckCircle2 size={14} color="#FFFFFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.parentToggleTitle}>Parent / Guardian Consent Intimated & Verified</Text>
                      <Text style={styles.parentToggleSub}>
                        Mandatory security protocol: AO confirms contact with parent/guardian prior to emergency gate clearance.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* AO Remarks */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>AO DISCRETIONARY REMARKS & SANCTION NOTE</Text>
                    <TextInput
                      style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                      value={emergencyRemarks}
                      onChangeText={setEmergencyRemarks}
                      placeholder="Special instructions for Main Gate security..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                    />
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[styles.grantEmergencyBtn, isGrantingEmergency && { opacity: 0.6 }]}
                    onPress={handleGrantEmergencyLeave}
                    disabled={isGrantingEmergency}
                    activeOpacity={0.85}
                  >
                    <ShieldAlert size={18} color="#FFFFFF" />
                    <Text style={styles.grantEmergencyBtnText}>
                      {isGrantingEmergency ? 'Sanctioning Pass...' : 'Grant Emergency Leave & Generate Digital Pass'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Last Generated Pass Card */}
                {lastGrantedEmergencyPass && (
                  <View style={styles.lastGrantedCard}>
                    <View style={styles.lastGrantedHeader}>
                      <View style={styles.grantedBadge}>
                        <CheckCircle2 size={14} color="#10B981" />
                        <Text style={styles.grantedBadgeText}>LIVE PASS DISPATCHED TO STUDENT PAGE</Text>
                      </View>
                      <Text style={styles.grantedTokenText}>{lastGrantedEmergencyPass.gateToken}</Text>
                    </View>

                    <Text style={styles.grantedSummaryText}>
                      Emergency Leave Sanctioned for <Text style={{ fontWeight: '800' }}>USN: {lastGrantedEmergencyPass.usn}</Text>.
                    </Text>
                    <Text style={styles.grantedSubText}>
                      Destination: {lastGrantedEmergencyPass.destination} • Valid: {lastGrantedEmergencyPass.startDate} to {lastGrantedEmergencyPass.endDate} ({lastGrantedEmergencyPass.totalDays} Days)
                    </Text>

                    <View style={styles.grantedBarcodeBox}>
                      <BarcodeView
                        value={lastGrantedEmergencyPass.barcode || `*${lastGrantedEmergencyPass.registrationId}*`}
                        label={`GATE PASS BARCODE: ${lastGrantedEmergencyPass.barcode}`}
                        height={46}
                      />
                    </View>
                    <Text style={styles.grantedNoticeFooter}>
                      Student Notification dispatched. Security Main Gate terminal synchronized for departure.
                    </Text>
                  </View>
                )}

                {/* Emergency Pass History */}
                <View style={{ gap: 10 }}>
                  <Text style={styles.sectionTitle}>
                    AO Emergency Passes Granted ({allLeaves.filter((l) => l.isEmergency || l.leaveType === 'Emergency Leave (AO Sanctioned)').length})
                  </Text>
                  {allLeaves
                    .filter((l) => l.isEmergency || l.leaveType === 'Emergency Leave (AO Sanctioned)')
                    .map((l) => (
                      <View key={l.id} style={styles.historyEmergencyCard}>
                        <View style={styles.historyCardTop}>
                          <View>
                            <Text style={styles.historyTokenText}>{l.gateToken || l.id}</Text>
                            <Text style={styles.historyStudentText}>USN: {l.usn}</Text>
                          </View>
                          <View style={styles.emergencyPill}>
                            <Text style={styles.emergencyPillText}>AO EMERGENCY</Text>
                          </View>
                        </View>
                        <Text style={styles.historyDetailsText}>
                          {l.startDate} ➔ {l.endDate} ({l.totalDays}D) • {l.reason}
                        </Text>
                        <Text style={styles.historyActorText}>
                          Sanctioned by: {l.sanctionedBy || 'Administrative Officer (AO)'}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}

            {/* AO SUB-TAB 5: DUPLICATE & COMPENSATION PASS ISSUANCE DESK */}
            {aoSubTab === 'duplicate_coupon' && (
              <View style={{ gap: 14 }}>
                {/* Authority Banner */}
                <View style={styles.couponRoleBanner}>
                  <View style={styles.couponBannerHeader}>
                    <View style={styles.couponIconBadge}>
                      <Ticket size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.couponBannerTitle}>AO Duplicate Pass & Compensation Pass Generator</Text>
                      <Text style={styles.couponBannerSub}>
                        Institutional Rule: Students must apply for leave at least 2 days before 5:00 PM. If a student fails to do so, only the Administrative Officer (AO Admin) can generate an authorized Duplicate Pass or Compensation Pass by entering the student's USN, departure & return dates, and departure & return times.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 1. Student Picker */}
                <View style={styles.emergencyCard}>
                  <Text style={styles.inputSectionTitle}>1. Select Hosteller by USN</Text>
                  <Text style={styles.inputSectionSub}>
                    Tap a registered student below or manually type any student's USN:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickStdScroll}>
                    {students.map((s) => {
                      const isSelected = couponUsn.toUpperCase() === s.usn.toUpperCase();
                      return (
                        <TouchableOpacity
                          key={s.usn}
                          style={[styles.quickStdChip, isSelected && styles.quickStdChipActive]}
                          onPress={() => setCouponUsn(s.usn)}
                        >
                          <Text style={[styles.quickStdChipUsn, isSelected && styles.quickStdChipUsnActive]}>
                            {s.usn}
                          </Text>
                          <Text style={[styles.quickStdChipName, isSelected && styles.quickStdChipNameActive]}>
                            {s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Manual USN Input */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>STUDENT USN (UNIVERSITY SEAT NUMBER) *</Text>
                    <View style={styles.usnInputWrapper}>
                      <TextInput
                        style={styles.usnTextInput}
                        value={couponUsn}
                        onChangeText={(t) => setCouponUsn(t.toUpperCase())}
                        placeholder="e.g. 1RV22CS089"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={styles.usnLookupBtn}
                        onPress={() => {
                          const matched = students.find((s) => s.usn.toUpperCase() === couponUsn.trim().toUpperCase());
                          if (matched) {
                            Alert.alert('Student Verified', `Name: ${matched.name}\nRoom: ${matched.roomNumber}\nBlock: ${matched.hostelBlock}\nGuardian: ${matched.guardianContact}`);
                          } else {
                            Alert.alert('Custom Student', `USN ${couponUsn} verified for Duplicate Coupon override.`);
                          }
                        }}
                      >
                        <Search size={14} color="#FFFFFF" />
                        <Text style={styles.usnLookupBtnText}>Verify</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Student Profile Preview Card */}
                  {(() => {
                    const clean = couponUsn.trim().toUpperCase();
                    const matched = students.find((s) => s.usn.toUpperCase() === clean);
                    return (
                      <View style={styles.studentPreviewCard}>
                        <View style={styles.studentPreviewHeader}>
                          <View style={styles.studentAvatarCircle}>
                            <Users size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentPreviewName}>
                              {matched ? matched.name : `Student (${clean || 'No USN'})`}
                            </Text>
                            <Text style={styles.studentPreviewMeta}>
                              USN: <Text style={{ fontWeight: '800' }}>{clean || 'N/A'}</Text> • Room: {matched?.roomNumber || 'B-304'} • {matched?.hostelBlock || 'Cauvery Block B-3'}
                            </Text>
                          </View>
                          <View style={styles.statusVerifiedBadge}>
                            <CheckCircle2 size={11} color="#10B981" />
                            <Text style={styles.statusVerifiedText}>Hosteller</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* 2. Leave Dates & Session Parameters */}
                <View style={styles.emergencyCard}>
                  <Text style={styles.inputSectionTitle}>2. Dates & Departure/Return Sessions</Text>

                  {/* Dates Row */}
                  <View style={styles.rowTwoInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>START DATE *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={couponStartDate}
                        onChangeText={setCouponStartDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>RETURN DATE *</Text>
                      <TextInput
                        style={styles.formInput}
                        value={couponEndDate}
                        onChangeText={setCouponEndDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Session & Departure/Return Time Selector Row */}
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>DEPARTURE TIME & SESSION *</Text>
                      <View style={styles.couponSessionPillRow}>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponStartSession === 'Morning' && styles.couponSessionPillActive]}
                          onPress={() => {
                            setCouponStartSession('Morning');
                            setCouponDepartureTime('09:00 AM');
                          }}
                        >
                          <Text style={[styles.couponSessionPillText, couponStartSession === 'Morning' && styles.couponSessionPillTextActive]}>
                            Morning
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponStartSession === 'Evening' && styles.couponSessionPillActive]}
                          onPress={() => {
                            setCouponStartSession('Evening');
                            setCouponDepartureTime('05:00 PM');
                          }}
                        >
                          <Text style={[styles.couponSessionPillText, couponStartSession === 'Evening' && styles.couponSessionPillTextActive]}>
                            Evening
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.formInput, { marginTop: 6, height: 38 }]}
                        value={couponDepartureTime}
                        onChangeText={setCouponDepartureTime}
                        placeholder="e.g. 09:00 AM or 05:00 PM"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>RETURN TIME & SESSION *</Text>
                      <View style={styles.couponSessionPillRow}>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponReturnSession === 'Morning' && styles.couponSessionPillActive]}
                          onPress={() => {
                            setCouponReturnSession('Morning');
                            setCouponReturnTime('08:30 AM');
                          }}
                        >
                          <Text style={[styles.couponSessionPillText, couponReturnSession === 'Morning' && styles.couponSessionPillTextActive]}>
                            Morning
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponReturnSession === 'Evening' && styles.couponSessionPillActive]}
                          onPress={() => {
                            setCouponReturnSession('Evening');
                            setCouponReturnTime('06:00 PM');
                          }}
                        >
                          <Text style={[styles.couponSessionPillText, couponReturnSession === 'Evening' && styles.couponSessionPillTextActive]}>
                            Evening
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[styles.formInput, { marginTop: 6, height: 38 }]}
                        value={couponReturnTime}
                        onChangeText={setCouponReturnTime}
                        placeholder="e.g. 08:30 AM or 06:00 PM"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Dynamic Quota Calculation Preview */}
                  {(() => {
                    const calc = calculateLeaveSessionDays({
                      startDate: couponStartDate,
                      startSession: couponStartSession,
                      endDate: couponEndDate,
                      returnSession: couponReturnSession,
                    });
                    return (
                      <View style={styles.calcPreviewCard}>
                        <View style={styles.calcPreviewRow}>
                          <Text style={styles.calcPreviewLabel}>Calendar Duration:</Text>
                          <Text style={styles.calcPreviewVal}>{calc.totalCalendarDays} Days</Text>
                        </View>
                        <View style={styles.calcPreviewRow}>
                          <Text style={styles.calcPreviewLabel}>Quota Charged to Student:</Text>
                          <Text style={[styles.calcPreviewValBold, { color: calc.chargedDays === 0 ? '#10B981' : colors.primary }]}>
                            {calc.chargedDays} Days
                          </Text>
                        </View>
                        {calc.isEveningDeparture && (
                          <View style={styles.calcNoticeBadge}>
                            <Text style={styles.calcNoticeText}>
                              Evening Departure: Day 1 ({couponStartDate}) excluded from quota count (counting starts next day).
                            </Text>
                          </View>
                        )}
                        {calc.isWeekendExempt && (
                          <View style={[styles.calcNoticeBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                            <Text style={[styles.calcNoticeText, { color: '#92400E' }]}>
                              Saturday PM – Monday AM Weekend Exemption: 0 Days charged to quota (AO Approval).
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Reason & Destination */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>REASON FOR LATE APPLICATION & DUPLICATE COUPON *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={couponReason}
                      onChangeText={setCouponReason}
                      placeholder="e.g. Urgent family emergency, missed 2-day cutoff"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>DESTINATION *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={couponDestination}
                      onChangeText={setCouponDestination}
                      placeholder="e.g. Home (Udupi) / Bangalore"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>AO SANCTION REMARKS & AUTHORIZATION NOTE</Text>
                    <TextInput
                      style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                      value={couponRemarks}
                      onChangeText={setCouponRemarks}
                      placeholder="Special instructions for security gate..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                    />
                  </View>

                  {/* Action Button */}
                  <TouchableOpacity
                    style={[styles.grantCouponBtn, isIssuingCoupon && { opacity: 0.6 }]}
                    onPress={handleIssueDuplicateCoupon}
                    disabled={isIssuingCoupon}
                    activeOpacity={0.85}
                  >
                    <Ticket size={18} color="#FFFFFF" />
                    <Text style={styles.grantCouponBtnText}>
                      {isIssuingCoupon ? 'Generating Pass...' : 'Generate Duplicate / Compensation Pass'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Last Issued Coupon Display */}
                {lastIssuedCouponPass && (
                  <View style={styles.lastGrantedCouponCard}>
                    <View style={styles.lastGrantedHeader}>
                      <View style={styles.grantedBadgeCoupon}>
                        <CheckCircle2 size={14} color="#B45309" />
                        <Text style={styles.grantedBadgeCouponText}>AO DUPLICATE / COMPENSATION PASS LIVE</Text>
                      </View>
                      <Text style={styles.grantedCouponNumberText}>{lastIssuedCouponPass.duplicateCouponNumber}</Text>
                    </View>

                    <Text style={styles.grantedSummaryText}>
                      Compensation Pass Sanctioned for <Text style={{ fontWeight: '800' }}>USN: {lastIssuedCouponPass.usn}</Text>.
                    </Text>
                    <Text style={styles.grantedSubText}>
                      Gate Token: <Text style={{ fontWeight: '700' }}>{lastIssuedCouponPass.gateToken}</Text> • Departure: {lastIssuedCouponPass.startDate} ({lastIssuedCouponPass.departureTime || lastIssuedCouponPass.startSession}) ➔ Return: {lastIssuedCouponPass.endDate} ({lastIssuedCouponPass.expectedReturnTime || lastIssuedCouponPass.returnSession}) • Quota: {lastIssuedCouponPass.chargedDays} Days
                    </Text>

                    <View style={styles.grantedBarcodeBox}>
                      <BarcodeView
                        value={lastIssuedCouponPass.barcode || `*${lastIssuedCouponPass.registrationId}*`}
                        label={`COUPON BARCODE: ${lastIssuedCouponPass.barcode}`}
                        height={46}
                      />
                    </View>
                    <Text style={styles.grantedNoticeFooter}>
                      Duplicate coupon notification dispatched to student. Security Main Gate synchronized for departure.
                    </Text>
                  </View>
                )}

                {/* Duplicate Coupons History */}
                <View style={{ gap: 10 }}>
                  <Text style={styles.sectionTitle}>
                    Issued AO Duplicate Coupons ({allLeaves.filter((l) => l.isDuplicateCoupon || l.duplicateCouponNumber).length})
                  </Text>
                  {allLeaves
                    .filter((l) => l.isDuplicateCoupon || l.duplicateCouponNumber)
                    .map((l) => (
                      <View key={l.id} style={styles.historyCouponCard}>
                        <View style={styles.historyCardTop}>
                          <View>
                            <Text style={styles.historyCouponNumberText}>{l.duplicateCouponNumber || l.gateToken || l.id}</Text>
                            <Text style={styles.historyStudentText}>USN: {l.usn}</Text>
                          </View>
                          <View style={styles.couponPill}>
                            <Text style={styles.couponPillText}>AO COUPON</Text>
                          </View>
                        </View>
                        <Text style={styles.historyDetailsText}>
                          {l.startDate} ({l.startSession || 'Morning'}) ➔ {l.endDate} ({l.returnSession || 'Morning'}) • Quota: {l.chargedDays ?? l.totalDays}D • Reason: {l.reason}
                        </Text>
                        <Text style={styles.historyActorText}>
                          Authorized by: {l.sanctionedBy || 'Administrative Officer (AO)'} • Token: {l.gateToken}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* =======================================================
            SECTION 2: WARDEN - ONLY APPROVING LEAVES BELOW 5 LEAVES
           ======================================================= */}
        {activeRole === 'Warden' && (
          <View style={styles.sectionContainer}>
            {/* Warden Authority Banner */}
            <View style={styles.roleBannerWarden}>
              <Text style={styles.roleBannerTitle}>Hostel Warden Desk (Leave Approval &lt; 5 Days)</Text>
              <Text style={styles.roleBannerSub}>
                Authorized exclusively to review, sanction, or reject student leave requests up to 5 days. For leaves longer than 5 days, jurisdiction escalates to SWO (5–8 days) and HOD (8–10+ days).
              </Text>
            </View>

            {/* Warden KPIs */}
            <View style={styles.metricsStrip}>
              <View style={styles.metricCard}>
                <Text style={[styles.metricVal, { color: pendingWarden > 0 ? '#D97706' : colors.success }]}>
                  {pendingWarden}
                </Text>
                <Text style={styles.metricLbl}>Pending Sanctions</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricVal}>{wardenLeaves.length}</Text>
                <Text style={styles.metricLbl}>Total &le; 5d Leaves</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={[styles.metricVal, { color: colors.success }]}>
                  {wardenLeaves.filter((l) => l.status === 'Approved').length}
                </Text>
                <Text style={styles.metricLbl}>Sanctioned</Text>
              </View>
            </View>

            {/* 1-5 Days Leaves List */}
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Leaves Under Warden Sanction (1 to 5 Days)</Text>
              {wardenLeaves.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>No student leave applications currently submitted under 1–5 days tier.</Text>
                </View>
              ) : (
                wardenLeaves.map((leave) => (
                  <View key={leave.id} style={styles.adminCard}>
                    <View style={styles.adminCardHeader}>
                      <View>
                        <Text style={styles.studentNameFull}>Applicant USN: {leave.usn}</Text>
                        <Text style={styles.studentSub}>Room {leave.roomNumber} • {leave.leaveType}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusTag,
                          leave.status === 'Approved' ? styles.statusApproved : leave.status === 'Rejected' ? styles.statusRejected : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.statusTagText}>{leave.status}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dates &amp; Tier:</Text>
                      <Text style={styles.detailVal}>{leave.startDate} to {leave.endDate} ({leave.totalDays} Days) • Warden Sanction</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reason:</Text>
                      <Text style={[styles.detailVal, { fontStyle: 'italic' }]}>"{leave.reason}"</Text>
                    </View>

                    {leave.gateToken && (
                      <View style={styles.gatePassBox}>
                        <QrCode size={16} color={colors.primary} />
                        <Text style={styles.gatePassText}>Gate Token: <Text style={{ fontWeight: '800' }}>{leave.gateToken}</Text> (Sanctioned by Warden)</Text>
                      </View>
                    )}

                    {leave.status === 'Pending' && (
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleWardenApprove(leave.id)}>
                          <CheckCircle2 size={14} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>Sanction Leave &amp; Issue Token</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleWardenReject(leave.id)}>
                          <XCircle size={14} color={colors.danger} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* =======================================================
            SECTION 3: SWO - 5-8 DAYS LEAVES & HOSTEL ISSUES
           ======================================================= */}
        {activeRole === 'SWO' && (
          <View style={styles.sectionContainer}>
            {/* SWO Authority Banner */}
            <View style={styles.roleBannerSWO}>
              <Text style={styles.roleBannerTitle}>SWO Student Welfare Desk (5–8 Days Leaves & Hostel Grievances)</Text>
              <Text style={styles.roleBannerSub}>
                Authorized to sanction 5 to 8 days leaves following welfare verification, and manage all hostel grievances: plumbing, electrical, Wi-Fi, housekeeping, and staff dispatch.
              </Text>
            </View>

            {/* Sub-Tabs for SWO */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subTabsRow}
              style={{ flexGrow: 0, marginBottom: 4 }}
            >
              <TouchableOpacity
                style={[styles.subTabBtn, swoSubTab === 'leaves' && styles.subTabBtnActive]}
                onPress={() => setSwoSubTab('leaves')}
              >
                <CalendarDays size={13} color={swoSubTab === 'leaves' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, swoSubTab === 'leaves' && styles.subTabBtnTextActive]}>
                  5–8 Days Leaves ({swoLeaves.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, swoSubTab === 'issues' && styles.subTabBtnActive]}
                onPress={() => setSwoSubTab('issues')}
              >
                <Wrench size={13} color={swoSubTab === 'issues' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, swoSubTab === 'issues' && styles.subTabBtnTextActive]}>
                  Hostel Grievances ({allGrievances.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, swoSubTab === 'clearance' && styles.subTabBtnActive]}
                onPress={() => setSwoSubTab('clearance')}
              >
                <ShieldAlert size={13} color={swoSubTab === 'clearance' ? '#DC2626' : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, swoSubTab === 'clearance' && { color: '#DC2626', fontWeight: '800' }]}>
                  Late Outings Desk ({blockedStudents.length})
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* SWO SUB-TAB 1: 5-8 DAYS LEAVES */}
            {swoSubTab === 'leaves' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Leaves Under SWO Sanction (5 to 8 Days)</Text>
                {swoLeaves.map((leave) => (
                  <View key={leave.id} style={styles.adminCard}>
                    <View style={styles.adminCardHeader}>
                      <View>
                        <Text style={styles.studentNameFull}>Applicant USN: {leave.usn}</Text>
                        <Text style={styles.studentSub}>Room {leave.roomNumber} • {leave.leaveType}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusTag,
                          leave.status === 'Approved' ? styles.statusApproved : leave.status === 'Rejected' ? styles.statusRejected : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.statusTagText}>{leave.status}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dates & Tier:</Text>
                      <Text style={styles.detailVal}>{leave.startDate} to {leave.endDate} ({leave.totalDays} Days) • SWO Tier</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reason:</Text>
                      <Text style={[styles.detailVal, { fontStyle: 'italic' }]}>"{leave.reason}"</Text>
                    </View>

                    {leave.gateToken && (
                      <View style={styles.gatePassBox}>
                        <QrCode size={16} color={colors.primary} />
                        <Text style={styles.gatePassText}>Gate Token: <Text style={{ fontWeight: '800' }}>{leave.gateToken}</Text> (Sanctioned by SWO)</Text>
                      </View>
                    )}

                    {leave.status === 'Pending' && (
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleSwoApprove(leave.id)}>
                          <CheckCircle2 size={14} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>SWO Sanction Leave</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleSwoReject(leave.id)}>
                          <XCircle size={14} color={colors.danger} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* SWO SUB-TAB 2: HOSTEL ISSUES & GRIEVANCES COMMAND CENTER */}
            {swoSubTab === 'issues' && (
              <View style={{ gap: 12 }}>
                {/* Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillsRow}>
                  {['all', 'Submitted', 'In Progress', 'Resolved'].map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.filterPill, grievanceFilter === st && styles.filterPillActive]}
                      onPress={() => setGrievanceFilter(st)}
                    >
                      <Text style={[styles.filterPillText, grievanceFilter === st && styles.filterPillTextActive]}>
                        {st === 'all' ? 'All Grievances' : st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {allGrievances
                  .filter((g) => grievanceFilter === 'all' || g.status === grievanceFilter)
                  .map((item) => (
                    <View key={item.id} style={styles.adminCard}>
                      <View style={styles.adminCardHeader}>
                        <View>
                          <Text style={styles.studentNameFull}>Room {item.roomNumber} ({item.usn})</Text>
                          <Text style={styles.studentSub}>{item.category} • Urgency: {item.urgency}</Text>
                        </View>
                        <View
                          style={[
                            styles.statusTag,
                            item.status === 'Resolved' ? styles.statusApproved : styles.statusPending,
                          ]}
                        >
                          <Text style={styles.statusTagText}>{item.status}</Text>
                        </View>
                      </View>

                      <Text style={styles.ticketDescText}>{item.description}</Text>

                      {item.photoUri && (
                        <View style={styles.adminInspectionPhotoBox}>
                          <View style={styles.adminPhotoHeaderRow}>
                            <Camera size={13} color="#0D9488" />
                            <Text style={styles.adminPhotoTagText}>
                              Live Camera Inspection Proof (Stored in Admin Dashboard)
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.adminPhotoThumbnailWrapper}
                            onPress={() =>
                              setSelectedPhotoModal({
                                uri: item.photoUri!,
                                title: `Room ${item.roomNumber} - ${item.category}`,
                                subtitle: `Lodged by ${item.usn} • Urgency: ${item.urgency}`,
                              })
                            }
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: item.photoUri }}
                              style={styles.adminPhotoThumbnail}
                              resizeMode="cover"
                            />
                            <View style={styles.adminPhotoEnlargeBadge}>
                              <Eye size={12} color="#FFFFFF" />
                              <Text style={styles.adminPhotoEnlargeText}>Tap to Enlarge Proof</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      )}

                      {item.adminRemark && (
                        <View style={styles.assignedNoteBox}>
                          <Text style={styles.assignedNoteText}>
                            <Text style={{ fontWeight: '700' }}>Assignment: </Text>
                            {item.adminRemark}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.assignActionBtn}
                        onPress={() => setSelectedTicket(item)}
                      >
                        <Wrench size={14} color={colors.primary} />
                        <Text style={styles.assignActionBtnText}>Dispatch Staff & Update Status</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}

            {/* SWO SUB-TAB 3: LATE RETURNS & OUTING PERMISSION DESK */}
            {swoSubTab === 'clearance' && (
              <View style={{ gap: 12 }}>
                <View style={styles.clearanceBanner}>
                  <View style={styles.clearanceBannerHeader}>
                    <ShieldAlert size={18} color="#DC2626" />
                    <Text style={styles.clearanceBannerTitle}>
                      Hostel Curfew Breach & Outing Permission Desk
                    </Text>
                  </View>
                  <Text style={styles.clearanceBannerDesc}>
                    Institutional Rule: Students who check in after the 04:30 PM (or 02:30 PM Govt Holiday) grace cutoff have subsequent outings automatically suspended. SWO officers can review hosteller conduct and grant clearance to restore outing generation.
                  </Text>
                </View>

                {/* SWO TOOL: LOCK OUTPASS FOR LATECOMER */}
                <View style={styles.swoLockCard}>
                  <View style={styles.swoLockCardHeader}>
                    <ShieldAlert size={18} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.swoLockCardTitle}>Lock Outpass for Latecomer / Curfew Violator</Text>
                      <Text style={styles.swoLockCardSub}>
                        Suspend outing privileges for hostellers returning late past grace cutoff or violating curfew.
                      </Text>
                    </View>
                  </View>

                  {/* Quick Select from recent latecomers if any */}
                  {latecomersList.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={styles.fieldLabel}>RECENT LATECOMERS (TAP TO QUICK SELECT):</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                        {Array.from(new Set(latecomersList.map((l) => l.usn))).map((lateUsn) => {
                          const log = latecomersList.find((l) => l.usn === lateUsn);
                          const isSelected = selectedStudentToLock?.usn === lateUsn;
                          return (
                            <TouchableOpacity
                              key={lateUsn}
                              style={[
                                { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
                                isSelected ? { backgroundColor: '#FEE2E2', borderColor: '#DC2626' } : { backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' },
                              ]}
                              onPress={() => {
                                setSelectedStudentToLock({ usn: lateUsn, name: log?.studentName || lateUsn });
                                setLockReason(`Late check-in past cutoff: ${log?.remarks || 'Overdue return'}`);
                              }}
                            >
                              <Clock size={12} color={isSelected ? '#DC2626' : '#64748B'} />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: isSelected ? '#DC2626' : '#334155' }}>
                                {lateUsn} ({log?.studentName?.split(' ')[0] || 'Student'})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>STUDENT USN TO LOCK *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={selectedStudentToLock?.usn || ''}
                      onChangeText={(val) =>
                        setSelectedStudentToLock(val ? { usn: val.trim().toUpperCase(), name: val.trim().toUpperCase() } : null)
                      }
                      placeholder="e.g. 1RV22CS089"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>VIOLATION REASON & REMARKS *</Text>
                    <TextInput
                      style={styles.formInput}
                      value={lockReason}
                      onChangeText={setLockReason}
                      placeholder="e.g. Late return curfew breach (overdue check-in past cutoff)"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.confirmLockOutingBtn}
                    onPress={() => handleSwoLockOuting()}
                    activeOpacity={0.85}
                  >
                    <ShieldAlert size={16} color="#FFFFFF" />
                    <Text style={styles.confirmLockOutingBtnText}>Suspend & Lock Outpass Privileges</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>
                  Hostellers Requiring SWO Permission ({blockedStudents.length})
                </Text>

                {blockedStudents.length === 0 ? (
                  <View style={styles.emptyStateCard}>
                    <CheckCircle2 size={36} color="#10B981" />
                    <Text style={styles.emptyStateTitle}>All Hostellers In Good Standing</Text>
                    <Text style={styles.emptyStateSub}>
                      No active outing suspensions or curfew violations pending SWO clearance.
                    </Text>
                  </View>
                ) : (
                  blockedStudents.map((std) => (
                    <View key={std.usn} style={styles.clearanceCard}>
                      <View style={styles.clearanceCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.clearanceStudentRow}>
                            <Text style={styles.clearanceStudentName}>{std.name}</Text>
                            <View style={styles.clearanceUsnTag}>
                              <Text style={styles.clearanceUsnText}>{std.usn}</Text>
                            </View>
                          </View>
                          <Text style={styles.clearanceStudentSub}>
                            Room {std.roomNumber} • {std.hostelBlock} • {std.branch}
                          </Text>
                        </View>
                        <View style={styles.clearanceStatusPill}>
                          <Text style={styles.clearanceStatusPillText}>OUTING BLOCKED</Text>
                        </View>
                      </View>

                      {/* Violation Reason Box */}
                      <View style={styles.violationReasonBox}>
                        <Clock size={14} color="#B91C1C" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.violationReasonLabel}>
                            Violation Recorded: {std.blockedAt}
                          </Text>
                          <Text style={styles.violationReasonText}>{std.reason}</Text>
                        </View>
                      </View>

                      {/* Action Bar */}
                      <View style={styles.clearanceActionRow}>
                        <TouchableOpacity
                          style={styles.permitOutingBtn}
                          onPress={() => handleSwoPermitOuting(std.usn)}
                          activeOpacity={0.85}
                        >
                          <CheckCircle2 size={16} color="#FFFFFF" />
                          <Text style={styles.permitOutingBtnText}>
                            Permit / Unlock Next Outing
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* =======================================================
            SECTION 4: HOD - 8-10+ DAYS LEAVES & MARKS / ATTENDANCE
           ======================================================= */}
        {activeRole === 'HOD' && (
          <View style={styles.sectionContainer}>
            {/* HOD Authority Banner */}
            <View style={styles.roleBannerHOD}>
              <Text style={styles.roleBannerTitle}>Head of Department (HOD) Academic Desk</Text>
              <Text style={styles.roleBannerSub}>
                Authorized to sanction 8 to 10+ days leaves with academic attendance exemptions, enter subject attendance, and record Internal Assessment (IA-1, IA-2, IA-3) marks.
              </Text>
            </View>

            {/* Sub-Tabs for HOD */}
            <View style={styles.subTabsRow}>
              <TouchableOpacity
                style={[styles.subTabBtn, hodSubTab === 'leaves' && styles.subTabBtnActive]}
                onPress={() => setHodSubTab('leaves')}
              >
                <CalendarDays size={13} color={hodSubTab === 'leaves' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, hodSubTab === 'leaves' && styles.subTabBtnTextActive]}>
                  8–10+ Days Leaves ({hodLeaves.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, hodSubTab === 'academics' && styles.subTabBtnActive]}
                onPress={() => setHodSubTab('academics')}
              >
                <BookOpen size={13} color={hodSubTab === 'academics' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, hodSubTab === 'academics' && styles.subTabBtnTextActive]}>
                  Attendance & IA Marks
                </Text>
              </TouchableOpacity>
            </View>

            {/* HOD SUB-TAB 1: 8-10+ DAYS LEAVES */}
            {hodSubTab === 'leaves' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Leaves Under HOD Academic Sanction (8 to 10+ Days)</Text>
                {hodLeaves.map((leave) => (
                  <View key={leave.id} style={styles.adminCard}>
                    <View style={styles.adminCardHeader}>
                      <View>
                        <Text style={styles.studentNameFull}>Applicant USN: {leave.usn}</Text>
                        <Text style={styles.studentSub}>Room {leave.roomNumber} • {leave.leaveType}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusTag,
                          leave.status === 'Approved' ? styles.statusApproved : leave.status === 'Rejected' ? styles.statusRejected : styles.statusPending,
                        ]}
                      >
                        <Text style={styles.statusTagText}>{leave.status}</Text>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dates & Tier:</Text>
                      <Text style={styles.detailVal}>{leave.startDate} to {leave.endDate} ({leave.totalDays} Days) • HOD Sanction</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reason:</Text>
                      <Text style={[styles.detailVal, { fontStyle: 'italic' }]}>"{leave.reason}"</Text>
                    </View>

                    {leave.medicalDocumentName && (
                      <View style={styles.medicalDocPill}>
                        <FileText size={14} color={colors.primary} />
                        <Text style={styles.medicalDocText}>Official Proof Attached: {leave.medicalDocumentName}</Text>
                      </View>
                    )}

                    {leave.gateToken && (
                      <View style={styles.gatePassBox}>
                        <QrCode size={16} color={colors.primary} />
                        <Text style={styles.gatePassText}>Gate Token: <Text style={{ fontWeight: '800' }}>{leave.gateToken}</Text> (Academic Exemption Granted)</Text>
                      </View>
                    )}

                    {leave.status === 'Pending' && (
                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleHodApproveClick(leave)}>
                          <CheckCircle2 size={14} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>HOD Academic Sanction</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleHodReject(leave.id)}>
                          <XCircle size={14} color={colors.danger} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* HOD SUB-TAB 2: ATTENDANCE & IA MARKS ENTRIES */}
            {hodSubTab === 'academics' && (
              <View style={{ gap: 14 }}>
                {/* Low Attendance Warning Alert If Any */}
                {lowAttendanceSubjects.length > 0 && (
                  <View style={styles.lowAttendanceAlertCard}>
                    <View style={styles.alertHeaderRow}>
                      <AlertTriangle size={18} color="#B45309" />
                      <Text style={styles.alertHeaderTitle}>CRITICAL ATTENDANCE SHORTAGE (&lt; 75%)</Text>
                    </View>
                    <Text style={styles.alertHeaderDesc}>
                      {lowAttendanceSubjects.length} subject(s) are below the VTU mandatory 75% threshold. Examination hall tickets will be withheld unless formal leave exemption is entered.
                    </Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Curriculum Subjects & IA Marks Entry (Semester 4)</Text>
                {academics.length > 0 &&
                  academics[3]?.subjects.map((sub) => (
                    <View key={sub.code} style={styles.academicSubjectCard}>
                      <View style={styles.academicCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.academicSubCode}>{sub.code}</Text>
                          <Text style={styles.academicSubName}>{sub.name}</Text>
                        </View>
                        <View
                          style={[
                            styles.attendanceBadgePill,
                            sub.attendancePercentage < 75 ? styles.attendanceBadgeDanger : styles.attendanceBadgeSafe,
                          ]}
                        >
                          <Text
                            style={[
                              styles.attendanceBadgeText,
                              sub.attendancePercentage < 75 ? styles.attendanceTextDanger : styles.attendanceTextSafe,
                            ]}
                          >
                            {sub.attendancePercentage}% Attd.
                          </Text>
                        </View>
                      </View>

                      {/* Marks Roster */}
                      <View style={styles.iaMarksGrid}>
                        <View style={styles.iaMarkCell}>
                          <Text style={styles.iaMarkLbl}>IA-1</Text>
                          <Text style={styles.iaMarkVal}>{sub.ia1} / 30</Text>
                        </View>
                        <View style={styles.iaMarkCell}>
                          <Text style={styles.iaMarkLbl}>IA-2</Text>
                          <Text style={styles.iaMarkVal}>{sub.ia2} / 30</Text>
                        </View>
                        <View style={styles.iaMarkCell}>
                          <Text style={styles.iaMarkLbl}>IA-3</Text>
                          <Text style={styles.iaMarkVal}>{sub.ia3} / 30</Text>
                        </View>
                        <View style={styles.iaMarkCell}>
                          <Text style={styles.iaMarkLbl}>Classes</Text>
                          <Text style={styles.iaMarkVal}>{sub.classesAttended}/{sub.totalClasses}</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.editAcademicsBtn}
                        onPress={() => openEditAcademicsModal(4, sub)}
                      >
                        <Award size={14} color={colors.primary} />
                        <Text style={styles.editAcademicsBtnText}>Update Attendance & IA Marks</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* =======================================================
          MODAL 1: ASSIGN STAFF (SWO)
         ======================================================= */}
      <Modal visible={!!selectedTicket} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Maintenance Staff</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Ticket: {selectedTicket?.id} (Room {selectedTicket?.roomNumber}) • {selectedTicket?.category}
              </Text>

              <Text style={styles.modalFieldLabel}>Select Assigned Personnel</Text>
              {(
                [
                  'Housekeeping Lead (Ramesh)',
                  'Senior Electrician (Manjunath)',
                  'Chief Plumber (Ganesh)',
                  'Network Engineer (Kiran)',
                ] as const
              ).map((staff) => (
                <TouchableOpacity
                  key={staff}
                  style={[styles.staffSelectBtn, staffName === staff && styles.staffSelectBtnActive]}
                  onPress={() => setStaffName(staff)}
                >
                  <Text style={[styles.staffSelectText, staffName === staff && styles.staffSelectTextActive]}>
                    {staff}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.modalFieldLabel, { marginTop: 14 }]}>Update Status</Text>
              <View style={styles.statusSelectRow}>
                {(['Submitted', 'In Progress', 'Resolved'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusOptionBtn, assignStatus === st && styles.statusOptionBtnActive]}
                    onPress={() => setAssignStatus(st)}
                  >
                    <Text style={[styles.statusOptionText, assignStatus === st && styles.statusOptionTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveAssignmentBtn} onPress={handleConfirmAssign}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.saveAssignmentText}>Save Assignment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 2: LOG SICK STUDENT (WARDEN)
         ======================================================= */}
      <Modal visible={showHealthModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>+ Log Sick Student (Warden)</Text>
                <TouchableOpacity onPress={() => setShowHealthModal(false)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalFieldLabel}>Student USN</Text>
                <TextInput
                  style={styles.modalInput}
                  value={healthUsn}
                  onChangeText={setHealthUsn}
                  placeholder="e.g. 1RV22CS089"
                  autoCapitalize="characters"
                />

                <Text style={styles.modalFieldLabel}>Student Full Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={healthName}
                  onChangeText={setHealthName}
                  placeholder="e.g. Adithya Shenoy"
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Room Number</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={healthRoom}
                      onChangeText={setHealthRoom}
                      placeholder="B-304"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Hostel Block</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={healthBlock}
                      onChangeText={setHealthBlock}
                      placeholder="Cauvery Block B-3"
                    />
                  </View>
                </View>

                <Text style={styles.modalFieldLabel}>Care Destination / Status</Text>
                <View style={styles.statusSelectRow}>
                  {(['Resting in Health Room', 'Referred to Hospital'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.statusOptionBtn, healthStatus === st && styles.statusOptionBtnActive]}
                      onPress={() => setHealthStatus(st)}
                    >
                      <Text style={[styles.statusOptionText, healthStatus === st && styles.statusOptionTextActive]}>
                        {st === 'Resting in Health Room' ? 'Sick Bay' : 'Hospital'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {healthStatus === 'Referred to Hospital' && (
                  <>
                    <Text style={styles.modalFieldLabel}>Hospital Name</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={healthHospital}
                      onChangeText={setHealthHospital}
                      placeholder="e.g. Apollo Speciality Hospital, Jayanagar"
                    />
                  </>
                )}

                <Text style={styles.modalFieldLabel}>Symptoms or Diagnosis</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60 }]}
                  value={healthSymptoms}
                  onChangeText={setHealthSymptoms}
                  placeholder="e.g. Acute high fever (102°F), shivering, dehydration"
                  multiline
                />

                <Text style={styles.modalFieldLabel}>Doctor / Physician Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={healthDoctor}
                  onChangeText={setHealthDoctor}
                  placeholder="e.g. Dr. Preethi Rao (Hostel Physician)"
                />

                <Text style={styles.modalFieldLabel}>Prescribed Medicines / Care</Text>
                <TextInput
                  style={styles.modalInput}
                  value={healthMedicines}
                  onChangeText={setHealthMedicines}
                  placeholder="e.g. Paracetamol 650mg TDS, ORS sachets"
                />

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setHealthGuardianIntimated(!healthGuardianIntimated)}
                >
                  <View style={[styles.checkboxBox, healthGuardianIntimated && styles.checkboxBoxActive]}>
                    {healthGuardianIntimated && <CheckCircle2 size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Parent / Guardian has been intimated via phone call</Text>
                </TouchableOpacity>

                <Text style={styles.modalFieldLabel}>Warden Remarks / Instructions</Text>
                <TextInput
                  style={styles.modalInput}
                  value={healthRemarks}
                  onChangeText={setHealthRemarks}
                  placeholder="e.g. Complete bed rest advised. Meals served in bed."
                />

                <TouchableOpacity style={styles.saveAssignmentBtn} onPress={handleSaveHealthRoomLog}>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.saveAssignmentText}>Record Sick Student Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 3: DISCHARGE SICK STUDENT (WARDEN)
         ======================================================= */}
      <Modal visible={!!selectedHealthToDischarge} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Check Out & Discharge Student</Text>
              <TouchableOpacity onPress={() => setSelectedHealthToDischarge(null)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>
                Discharging: {selectedHealthToDischarge?.studentName} ({selectedHealthToDischarge?.usn}) • Room {selectedHealthToDischarge?.roomNumber}
              </Text>
              <Text style={[styles.modalFieldLabel, { marginTop: 10 }]}>Doctor Clearance Remarks</Text>
              <TextInput
                style={[styles.modalInput, { height: 70 }]}
                value={dischargeRemarks}
                onChangeText={setDischargeRemarks}
                multiline
              />

              <TouchableOpacity style={styles.saveAssignmentBtn} onPress={handleConfirmDischarge}>
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.saveAssignmentText}>Confirm Discharge & Recovered</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 4: EDIT ATTENDANCE & IA MARKS (HOD)
         ======================================================= */}
      <Modal visible={!!selectedSubjectToEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Marks & Attendance (HOD)</Text>
                <TouchableOpacity onPress={() => setSelectedSubjectToEdit(null)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>
                  Subject: {selectedSubjectToEdit?.code} - {selectedSubjectToEdit?.name}
                </Text>

                <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>Attendance Percentage (%)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editAttendancePct}
                  onChangeText={setEditAttendancePct}
                  keyboardType="numeric"
                  placeholder="e.g. 85.0"
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Classes Attended</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editClassesAttended}
                      onChangeText={setEditClassesAttended}
                      keyboardType="numeric"
                      placeholder="40"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>Total Classes</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editTotalClasses}
                      onChangeText={setEditTotalClasses}
                      keyboardType="numeric"
                      placeholder="48"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>IA-1 (Max 30)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editIa1}
                      onChangeText={setEditIa1}
                      keyboardType="numeric"
                      placeholder="26"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>IA-2 (Max 30)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editIa2}
                      onChangeText={setEditIa2}
                      keyboardType="numeric"
                      placeholder="28"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalFieldLabel}>IA-3 (Max 30)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editIa3}
                      onChangeText={setEditIa3}
                      keyboardType="numeric"
                      placeholder="29"
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.saveAssignmentBtn} onPress={handleSaveMarksAndAttendance}>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.saveAssignmentText}>Save Academic Record</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Full-Screen Live Inspection Photo Viewer Modal */}
      <Modal
        visible={!!selectedPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoModal(null)}
      >
        <View style={styles.photoModalBackdrop}>
          <View style={styles.photoModalContent}>
            <View style={styles.photoModalHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.photoModalTitle} numberOfLines={1}>
                  {selectedPhotoModal?.title}
                </Text>
                <Text style={styles.photoModalSubtitle} numberOfLines={2}>
                  {selectedPhotoModal?.subtitle}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.photoModalCloseBtn}
                onPress={() => setSelectedPhotoModal(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.photoModalImageWrap}>
              {selectedPhotoModal?.uri && (
                <Image
                  source={{ uri: selectedPhotoModal.uri }}
                  style={styles.photoModalImage}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.photoModalFooter}>
              <View style={styles.photoModalFooterTag}>
                <Camera size={14} color="#10B981" />
                <Text style={styles.photoModalFooterTagText}>
                  Live Camera Verification • Tamper Proof Admin Record
                </Text>
              </View>
              <TouchableOpacity
                style={styles.photoModalDoneBtn}
                onPress={() => setSelectedPhotoModal(null)}
              >
                <Text style={styles.photoModalDoneBtnText}>Close View</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 5: HOD ACADEMIC EXEMPTION REASON MODAL (8-10 DAYS)
         ======================================================= */}
      <Modal visible={!!selectedHodLeaveToApprove} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <GraduationCap size={20} color="#7C3AED" />
                  <Text style={styles.modalTitle}>HOD Academic Sanction & Exemption</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedHodLeaveToApprove(null)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {/* Student Summary */}
                <View style={styles.hodModalSummaryCard}>
                  <Text style={styles.hodSummaryHeading}>
                    Applicant USN: {selectedHodLeaveToApprove?.usn}
                  </Text>
                  <Text style={styles.hodSummaryLine}>
                    Leave Duration: <Text style={{ fontWeight: '700' }}>{selectedHodLeaveToApprove?.totalDays} Days</Text> ({selectedHodLeaveToApprove?.startDate} to {selectedHodLeaveToApprove?.endDate})
                  </Text>
                  <Text style={styles.hodSummaryLine}>
                    Student's Reason: <Text style={{ fontStyle: 'italic' }}>"{selectedHodLeaveToApprove?.reason}"</Text>
                  </Text>
                </View>

                {/* Institutional Directive */}
                <View style={styles.hodModalNoticeBox}>
                  <AlertCircle size={14} color="#7C3AED" />
                  <Text style={styles.hodModalNoticeText}>
                    HOD Jurisdiction Rule (8–10 Days): Approval requires assigning a verified academic exemption justification to protect VTU attendance records.
                  </Text>
                </View>

                <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>SELECT SPECIFIC ACADEMIC EXEMPTION REASON *</Text>
                {[
                  'Paper Presentation at IEEE Technical Conference',
                  'National Level Hackathon / Smart India Hackathon (SIH)',
                  'University Sports / VTU Athletic Championship',
                  'Industry Internship / Core Placement Drive',
                  'Serious Medical Hospitalization (Doctor Certified)',
                  'Other (Enter Custom Specific Reason)',
                ].map((reasonOption) => {
                  const isSelected = hodExemptionReason === reasonOption;
                  return (
                    <TouchableOpacity
                      key={reasonOption}
                      style={[styles.hodReasonOptionCard, isSelected && styles.hodReasonOptionCardActive]}
                      onPress={() => setHodExemptionReason(reasonOption)}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.hodReasonOptionText, isSelected && styles.hodReasonOptionTextActive]}>
                        {reasonOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {hodExemptionReason === 'Other (Enter Custom Specific Reason)' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.modalFieldLabel}>CUSTOM SPECIFIC REASON (MIN 5 CHARS) *</Text>
                    <TextInput
                      style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                      value={hodCustomReason}
                      onChangeText={setHodCustomReason}
                      placeholder="Specify academic justification..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.confirmHodApproveBtn}
                  onPress={handleConfirmHodApprove}
                  activeOpacity={0.85}
                >
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.confirmHodApproveText}>Sanction Academic Exemption & Sign Pass</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* =======================================================
          MODAL 6: AO STUDENT PETITION REVIEW & SANCTION MODAL
         ======================================================= */}
      <Modal visible={!!selectedPetitionToReview} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Award size={20} color="#0D9488" />
                  <Text style={styles.modalTitle}>AO Official Petition Sanction</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedPetitionToReview(null)}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {/* Petition Summary Card */}
                <View style={styles.hodModalSummaryCard}>
                  <Text style={styles.hodSummaryHeading}>
                    Applicant USN: {selectedPetitionToReview?.usn}
                  </Text>
                  <Text style={styles.hodSummaryLine}>
                    Petition Type: <Text style={{ fontWeight: '700', color: '#0D9488' }}>{selectedPetitionToReview?.type}</Text>
                  </Text>
                  <Text style={styles.hodSummaryLine}>
                    Room: {selectedPetitionToReview?.roomNumber} • Applied: {selectedPetitionToReview?.requestedDate}
                  </Text>
                  <Text style={[styles.hodSummaryLine, { marginTop: 4 }]}>
                    Applicant Statement: <Text style={{ fontStyle: 'italic' }}>"{selectedPetitionToReview?.reason}"</Text>
                  </Text>
                </View>

                {selectedPetitionToReview?.expectedPaymentDate && (
                  <View style={styles.calcNoticeBadge}>
                    <Text style={styles.calcNoticeText}>
                      Requested Fee Payment Date: <Text style={{ fontWeight: '800' }}>{selectedPetitionToReview.expectedPaymentDate}</Text>
                    </Text>
                  </View>
                )}

                {selectedPetitionToReview?.reductionDays !== undefined && (
                  <View style={styles.calcNoticeBadge}>
                    <Text style={styles.calcNoticeText}>
                      Mess Rebate Days Requested: <Text style={{ fontWeight: '800' }}>{selectedPetitionToReview.reductionDays} Days</Text>
                    </Text>
                  </View>
                )}

                {selectedPetitionToReview?.purpose && (
                  <View style={styles.calcNoticeBadge}>
                    <Text style={styles.calcNoticeText}>
                      Purpose: <Text style={{ fontWeight: '800' }}>{selectedPetitionToReview.purpose}</Text>
                    </Text>
                  </View>
                )}

                <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>AO OFFICIAL SANCTION REMARKS / ORDER NOTE</Text>
                <TextInput
                  style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
                  value={aoPetitionRemarks}
                  onChangeText={setAoPetitionRemarks}
                  placeholder="Official approval remarks, certification reference, or special terms..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.approvePetitionBtn, { flex: 1, paddingVertical: 12 }]}
                    onPress={() => selectedPetitionToReview && handleApprovePetition(selectedPetitionToReview)}
                    activeOpacity={0.85}
                  >
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text style={styles.approvePetitionBtnText}>Sanction &amp; Dispatch</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rejectPetitionBtn, { flex: 1, paddingVertical: 12 }]}
                    onPress={() => selectedPetitionToReview && handleRejectPetition(selectedPetitionToReview)}
                    activeOpacity={0.85}
                  >
                    <XCircle size={16} color="#DC2626" />
                    <Text style={styles.rejectPetitionBtnText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  adminHeader: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  adminHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  adminTitleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  adminBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  adminTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 1,
  },
  switchRoleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexShrink: 0,
  },
  switchRoleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  metricLbl: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  roleTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  roleTabBtn: {
    minWidth: 128,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  roleTabBtnActiveAO: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primary,
  },
  roleTabBtnActiveWarden: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  roleTabBtnActiveSWO: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  roleTabBtnActiveHOD: {
    backgroundColor: '#FAF5FF',
    borderColor: '#7C3AED',
  },
  roleTabIconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTabEmoji: {
    fontSize: 16,
  },
  roleTabTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  roleTabTitleActive: {
    color: colors.text,
  },
  roleTabSub: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '600',
  },
  miniBadge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  miniBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
    ...Platform.select({
      web: {
        maxWidth: 1240,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 28,
        paddingTop: 20,
      },
    }),
  },
  sectionContainer: {
    gap: 12,
  },
  roleBannerAO: {
    backgroundColor: '#EEF2FF',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: 12,
    borderRadius: 8,
  },
  roleBannerWarden: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    padding: 12,
    borderRadius: 8,
  },
  roleBannerSWO: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    padding: 12,
    borderRadius: 8,
  },
  roleBannerHOD: {
    backgroundColor: '#FAF5FF',
    borderLeftWidth: 4,
    borderLeftColor: '#7C3AED',
    padding: 12,
    borderRadius: 8,
  },
  roleBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  roleBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  subTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: 2,
    gap: 4,
  },
  subTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  subTabBtnActive: {
    backgroundColor: colors.primarySubtle,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  subTabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  subTabBtnTextActive: {
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activityCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTypeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activityBadgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  activityTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  activityDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  activityFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  activityActor: {
    fontSize: 10,
    color: colors.textMuted,
  },
  activityInspectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.primarySubtle,
    borderRadius: 4,
  },
  activityInspectText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  adminCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  adminCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentNameFull: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  studentSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: colors.successSubtle,
  },
  statusPending: {
    backgroundColor: colors.accentSubtle,
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    width: 80,
  },
  detailVal: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
  },
  medicalDocPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  medicalDocText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  gatePassBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySubtle,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 138, 0.2)',
  },
  gatePassText: {
    fontSize: 12,
    color: colors.text,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  rejectBtnText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  healthActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  healthActionSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  addHealthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addHealthBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  healthStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  healthStatCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  healthStatVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  healthStatLbl: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  activeHealthCard: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  activeHealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  healthStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  healthTagSickBay: {
    backgroundColor: '#FEF3C7',
  },
  healthTagHospital: {
    backgroundColor: '#FEE2E2',
  },
  healthStatusTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
  healthDetailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 6,
    padding: 8,
    gap: 4,
  },
  healthDetailLine: {
    fontSize: 11,
    color: colors.text,
  },
  guardianStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guardianDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  guardianStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  healthRemarksText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  healthCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dischargeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dischargeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  transferHospitalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  transferHospitalText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  healthHistoryCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  healthHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthHistoryName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  recoveredBadge: {
    backgroundColor: colors.successSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recoveredBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.success,
  },
  healthHistoryDates: {
    fontSize: 10,
    color: colors.textMuted,
  },
  healthHistoryDiagnosis: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  healthHistoryDoctor: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  healthHistoryRemarks: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  ticketDescText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  assignedNoteBox: {
    backgroundColor: colors.primarySubtle,
    padding: 8,
    borderRadius: 6,
  },
  assignedNoteText: {
    fontSize: 11,
    color: colors.text,
  },
  assignActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  assignActionBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  lowAttendanceAlertCard: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  alertHeaderDesc: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 16,
  },
  academicSubjectCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  academicCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  academicSubCode: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  academicSubName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  attendanceBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attendanceBadgeSafe: {
    backgroundColor: colors.successSubtle,
  },
  attendanceBadgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  attendanceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  attendanceTextSafe: {
    color: colors.success,
  },
  attendanceTextDanger: {
    color: colors.danger,
  },
  iaMarksGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 8,
    gap: 6,
  },
  iaMarkCell: {
    flex: 1,
    alignItems: 'center',
  },
  iaMarkLbl: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  iaMarkVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  editAcademicsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.primarySubtle,
  },
  editAcademicsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  scannerPanel: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  scannerPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerPanelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  scannerPanelSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  barcodeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  barcodeScanBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barcodeScanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  quickPickLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  quickPickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickPickChip: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 110,
  },
  quickPickChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  quickPickChipType: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.primary,
  },
  quickPickChipId: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
  quickPickChipName: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  dossierContainer: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  dossierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dossierName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  dossierSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  campusStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  campusStatusInside: {
    backgroundColor: colors.successSubtle,
  },
  campusStatusOutside: {
    backgroundColor: '#FEF3C7',
  },
  campusStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
  },
  barcodePreviewStrip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barcodeSubText: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
  dossierCooldownBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    gap: 4,
  },
  dossierCooldownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dossierCooldownTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  dossierCooldownText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  dossierCooldownTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dossierCooldownTimer: {
    fontSize: 11,
    color: '#78350F',
  },
  dossierGateActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dossierGateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  dossierGateBtnOut: {
    backgroundColor: colors.danger,
  },
  dossierGateBtnIn: {
    backgroundColor: colors.successDark,
  },
  dossierGateBtnDisabled: {
    opacity: 0.5,
  },
  dossierGateBtnLocked: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  dossierGateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dossierGateBtnTextLocked: {
    color: '#92400E',
  },
  dossierTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 6,
    overflow: 'hidden',
  },
  dossierTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dossierTabBtnActive: {
    backgroundColor: colors.primarySubtle,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  dossierTabBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dossierTabBtnTextActive: {
    fontWeight: '800',
    color: colors.primary,
  },
  movementItem: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  movementActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  movementBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  movementBadgeIn: {
    backgroundColor: colors.successSubtle,
  },
  movementBadgeOut: {
    backgroundColor: '#FEF3C7',
  },
  movementBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.text,
  },
  movementTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  movementGate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  movementRemarks: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  securityPolicyCard: {
    backgroundColor: '#F0FDFA',
    borderLeftWidth: 4,
    borderLeftColor: '#0F766E',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  shieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shieldTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  shieldDesc: {
    fontSize: 11,
    color: colors.text,
    lineHeight: 16,
  },
  deviceActiveBadge: {
    backgroundColor: colors.successSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deviceActiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
  },
  deviceDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 6,
  },
  deviceModelText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  deviceIdText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  deviceActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  testConflictBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingVertical: 7,
    borderRadius: 6,
  },
  testConflictText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  resetDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  resetDeviceText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  emptyCard: {
    padding: 16,
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  modalBody: {
    gap: 10,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: -4,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  staffSelectBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  staffSelectBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  staffSelectText: {
    fontSize: 12,
    color: colors.text,
  },
  staffSelectTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOptionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusOptionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  statusOptionText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusOptionTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
  },
  saveAssignmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  saveAssignmentText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  dossierBlockedBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 4,
  },
  dossierBlockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dossierBlockedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  dossierBlockedText: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
  },
  clearanceBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  clearanceBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearanceBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  clearanceBannerDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
  },
  clearanceCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  clearanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  clearanceStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearanceStudentName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  clearanceUsnTag: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  clearanceUsnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  clearanceStudentSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  clearanceStatusPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  clearanceStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  violationReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  violationReasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9F1239',
  },
  violationReasonText: {
    fontSize: 11,
    color: '#881337',
    marginTop: 2,
    lineHeight: 15,
  },
  clearanceActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  permitOutingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  permitOutingBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyStateCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  emptyStateSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  subTabBtnActiveEmergency: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  subTabBtnTextActiveEmergency: {
    color: '#DC2626',
    fontWeight: '800',
  },
  emergencyRoleBanner: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  emergencyBannerHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  emergencyIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
  },
  emergencyBannerSub: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 3,
    lineHeight: 17,
  },
  emergencyCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  inputSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  inputSectionSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickStdScroll: {
    marginVertical: 4,
  },
  quickStdChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  quickStdChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  quickStdChipUsn: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  quickStdChipUsnActive: {
    color: '#DC2626',
  },
  quickStdChipName: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  quickStdChipNameActive: {
    color: '#991B1B',
    fontWeight: '700',
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  usnInputWrapper: {
    flexDirection: 'row',
    gap: 8,
  },
  usnTextInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  usnLookupBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  usnLookupBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  studentPreviewCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  studentPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentPreviewName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  studentPreviewMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  studentContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 2,
  },
  studentContactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  studentContactVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
  },
  reasonPresetPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  reasonPresetPillActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#DC2626',
  },
  reasonPresetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  reasonPresetTextActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
  },
  rowTwoInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  parentToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareActive: {
    backgroundColor: '#16A34A',
  },
  parentToggleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14532D',
  },
  parentToggleSub: {
    fontSize: 10,
    color: '#166534',
    marginTop: 1,
    lineHeight: 14,
  },
  grantEmergencyBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 4,
  },
  grantEmergencyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  lastGrantedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  lastGrantedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  grantedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  grantedTokenText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#14532D',
    fontFamily: 'monospace',
  },
  grantedSummaryText: {
    fontSize: 13,
    color: '#166534',
  },
  grantedSubText: {
    fontSize: 11,
    color: '#15803D',
  },
  grantedBarcodeBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginVertical: 4,
  },
  grantedNoticeFooter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  historyEmergencyCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyTokenText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
    fontFamily: 'monospace',
  },
  historyStudentText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  emergencyPill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  emergencyPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  historyDetailsText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyActorText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  subTabBtnActiveCoupon: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  subTabBtnTextActiveCoupon: {
    color: '#B45309',
    fontWeight: '700',
  },
  couponRoleBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
  },
  couponBannerHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  couponIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  couponBannerSub: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  couponSessionPillRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  couponSessionPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  couponSessionPillActive: {
    backgroundColor: '#D97706',
  },
  couponSessionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  couponSessionPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calcPreviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 6,
  },
  calcPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcPreviewLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  calcPreviewVal: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
  calcPreviewValBold: {
    fontSize: 12,
    fontWeight: '800',
  },
  calcNoticeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    padding: 6,
    marginTop: 2,
  },
  calcNoticeText: {
    fontSize: 10.5,
    color: '#1E40AF',
    lineHeight: 14,
    fontWeight: '500',
  },
  grantCouponBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 6,
  },
  grantCouponBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  lastGrantedCouponCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  grantedBadgeCoupon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  grantedBadgeCouponText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  grantedCouponNumberText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#92400E',
    fontFamily: 'monospace',
  },
  historyCouponCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  historyCouponNumberText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#D97706',
    fontFamily: 'monospace',
  },
  couponPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  couponPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  subTabsRowScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  adminInspectionPhotoBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  adminPhotoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminPhotoTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  adminPhotoThumbnailWrapper: {
    position: 'relative',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  adminPhotoThumbnail: {
    width: '100%',
    height: '100%',
  },
  adminPhotoEnlargeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminPhotoEnlargeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  messAdminBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  messAdminBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messAdminBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  messAdminBannerDesc: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 16,
  },
  starRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  starRatingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  photoModalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  photoModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  photoModalSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  photoModalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  photoModalImageWrap: {
    width: '100%',
    height: 380,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
  photoModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  photoModalFooterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  photoModalFooterTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  photoModalDoneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  photoModalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ==========================================
  // ADMIN AUTHENTICATION & LOGIN PAGE STYLES
  // ==========================================
  loginScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loginNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  loginBackText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  loginSecurityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 5,
  },
  loginSecurityText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  loginBrandCard: {
    alignItems: 'center',
    backgroundColor: '#111C3A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  loginInstitutionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.1,
    textAlign: 'center',
    marginBottom: 4,
  },
  loginPortalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  loginPortalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  loginDeskSection: {
    marginBottom: 14,
  },
  loginSectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 2,
  },
  loginDeskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loginDeskCard: {
    width: '48.5%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  loginDeskBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loginDeskEmoji: {
    fontSize: 16,
  },
  loginDeskTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  loginDeskSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  loginActiveDeskCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  activeDeskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeDeskName: {
    fontSize: 14,
    fontWeight: '800',
  },
  activeDeskRole: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  activeDeskScope: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  loginFormCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  loginFormHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  loginFormTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  loginFormSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  deskBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deskBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  loginErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 12,
    gap: 8,
  },
  loginErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  loginInputGroup: {
    marginBottom: 14,
  },
  loginInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  loginInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginInputField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#F8FAFC',
  },
  loginEyeBtn: {
    padding: 10,
  },
  loginSubmitBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  loginSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  loginQuickFillSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  loginQuickFillHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  loginQuickFillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  loginQuickFillBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  loginQuickFillEmoji: {
    fontSize: 14,
  },
  loginQuickFillRole: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  loginQuickFillEmail: {
    fontSize: 9,
    color: '#64748B',
  },
  loginNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  loginNoticeText: {
    fontSize: 10,
    color: '#94A3B8',
    lineHeight: 15,
    flex: 1,
  },

  // Officer Session Strip & Logout Button
  adminLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 4,
  },
  adminLogoutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  officerSessionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sessionText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  sessionBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
  },

  // Directory & Student Registry
  directorySearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  directorySearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  usnBadgePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  usnBadgePillText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '800',
  },
  campusStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  campusStatusPillInside: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  campusStatusPillOutside: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  campusStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  curfewBlockedMiniBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  curfewBlockedMiniText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  studentInfoStrip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  studentInfoLine: {
    fontSize: 12,
    color: '#475569',
  },
  viewDossierMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  viewDossierMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },

  // Latecomers Desk
  latecomerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  latecomerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  latecomerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  latecomerUsnTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latecomerUsnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  latecomerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  curfewBreachPill: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  curfewBreachPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  latecomerTimingBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
  },
  timingLbl: {
    fontSize: 10,
    color: '#9F1239',
    fontWeight: '600',
  },
  timingVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#881337',
    marginTop: 2,
  },
  latecomerRemarksBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  latecomerRemarksText: {
    fontSize: 12,
    color: '#334155',
  },
  latecomerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  latecomerDossierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  latecomerDossierBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  latecomerLockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  latecomerLockBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  latecomerAlreadyLockedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  latecomerAlreadyLockedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },

  // Petitions Desk
  petitionRoleBanner: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 4,
  },
  petitionBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  petitionBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
  },
  petitionBannerSub: {
    fontSize: 11,
    color: '#115E59',
    lineHeight: 16,
  },
  petitionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  petitionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  petitionStudentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  petitionUsnTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  petitionUsnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  petitionStudentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  petitionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  petitionStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  petitionTypeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  petitionTypeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  petitionDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  petitionReasonText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  petitionParamLine: {
    fontSize: 11,
    color: '#475569',
  },
  petitionRefBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  petitionRefText: {
    fontSize: 11,
    color: '#065F46',
  },
  petitionRemarksBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 8,
  },
  petitionRemarksText: {
    fontSize: 11,
    color: '#475569',
  },
  petitionActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  approvePetitionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approvePetitionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectPetitionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectPetitionBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },

  // SWO Lock Latecomer Card
  swoLockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  swoLockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swoLockCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  swoLockCardSub: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
  },
  confirmLockOutingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmLockOutingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // HOD Modal Reason Options
  hodReasonOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
    gap: 10,
  },
  hodReasonOptionCardActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#7C3AED',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#7C3AED',
  },
  hodReasonOptionText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  hodReasonOptionTextActive: {
    color: '#6D28D9',
    fontWeight: '700',
  },
  hodModalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginVertical: 8,
  },
  hodModalNoticeText: {
    fontSize: 11,
    color: '#5B21B6',
    flex: 1,
    lineHeight: 16,
  },
  hodModalSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  hodSummaryHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  hodSummaryLine: {
    fontSize: 12,
    color: '#475569',
  },
  confirmHodApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 14,
  },
  confirmHodApproveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
