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
  Shield,
  CheckCircle2,
  XCircle,
  Wrench,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Lock,
  RefreshCw,
  LogOut,
  Search,
  Activity,
  TrendingUp,
  Zap,
  Plus,
  Award,
  GraduationCap,
  Ticket,
  Utensils,
  Star,
  Eye,
  Camera,
  EyeOff,
  Mail,
  Key,
  Smartphone,
  QrCode,
  FileText,
  Check,
  X,
  Phone,
  MapPin,
  HeartPulse,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import {
  LeaveApplication,
  GrievanceTicket,
  GateLogEntry,
  StudentScanDossier,
  HealthRoomLog,
  MasterActivityItem,
  SemesterRecord,
  AdminRole,
  MessRating,
  AoStudentPetition,
} from '../types';
import { StorageService } from '../services/storage';

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
    title: 'Administrative Officer',
    scope: 'Institutional feed, gate scanner, emergency leave passes, duplicate coupons, and student directory.',
    jurisdiction: 'Master feed, scanner, passes & directory',
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
  // Selected Official Desk (null = Independent Gateway Selection Screen)
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [authenticatedRole, setAuthenticatedRole] = useState<AdminRole | null>(null);

  // Mail & Password Authentication State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Sub-tabs per role with Performance & Allotment analytics
  const [wardenTab, setWardenTab] = useState<'leaves' | 'health' | 'mess' | 'performance'>('leaves');
  const [swoTab, setSwoTab] = useState<'leaves' | 'issues' | 'curfew' | 'performance'>('leaves');
  const [hodTab, setHodTab] = useState<'leaves' | 'academics' | 'performance'>('leaves');
  const [aoTab, setAoTab] = useState<'directory' | 'latecomers' | 'passes' | 'feed' | 'performance'>('directory');

  // Room Allotment Execution State (Warden)
  const [showRoomAllotModal, setShowRoomAllotModal] = useState(false);
  const [allotUsn, setAllotUsn] = useState('1RV22CS089');
  const [allotName, setAllotName] = useState('Aditya Sharma');
  const [allotBlock, setAllotBlock] = useState('Cauvery Block B-3');
  const [allotRoom, setAllotRoom] = useState('B-304');
  const [allotBed, setAllotBed] = useState('Bed 2');
  const [allotFeeReceipt, setAllotFeeReceipt] = useState('REC-AIET-2026-9912');

  // Search & Full Student Dossier State
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedDossier, setSelectedDossier] = useState<StudentScanDossier | null>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [messMealFilter, setMessMealFilter] = useState<'all' | 'Breakfast' | 'Lunch' | 'Evening Snacks' | 'Dinner'>('all');

  // Core Data
  const [allLeaves, setAllLeaves] = useState<LeaveApplication[]>([]);
  const [allGrievances, setAllGrievances] = useState<GrievanceTicket[]>([]);
  const [allMessRatings, setAllMessRatings] = useState<MessRating[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [gateLogs, setGateLogs] = useState<GateLogEntry[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthRoomLog[]>([]);
  const [activityFeed, setActivityFeed] = useState<MasterActivityItem[]>([]);
  const [academics, setAcademics] = useState<SemesterRecord[]>([]);
  const [blockedStudents, setBlockedStudents] = useState<any[]>([]);
  const [aoPetitions, setAoPetitions] = useState<AoStudentPetition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<GrievanceTicket | null>(null);
  const [staffName, setStaffName] = useState('Housekeeping Lead (Ramesh)');
  const [assignStatus, setAssignStatus] = useState<GrievanceTicket['status']>('In Progress');

  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthUsn, setHealthUsn] = useState('1RV22CS089');
  const [healthName, setHealthName] = useState('Aditya Sharma');
  const [healthRoom, setHealthRoom] = useState('B-304');
  const [healthBlock, setHealthBlock] = useState('Cauvery Block B-3');
  const [healthStatus, setHealthStatus] = useState<'Resting in Health Room' | 'Referred to Hospital'>('Resting in Health Room');
  const [healthLocation, setHealthLocation] = useState<'Hostel Health Room / Sick Bay' | 'Campus Clinic' | 'Hospital (City / Multispeciality)'>('Hostel Health Room / Sick Bay');
  const [healthHospital, setHealthHospital] = useState('');
  const [healthSymptoms, setHealthSymptoms] = useState('');
  const [healthDoctor, setHealthDoctor] = useState('Dr. Preethi Rao (Hostel Physician)');
  const [healthMedicines, setHealthMedicines] = useState('Paracetamol 650mg TDS, ORS');
  const [healthRemarks, setHealthRemarks] = useState('');

  const [selectedHealthToDischarge, setSelectedHealthToDischarge] = useState<HealthRoomLog | null>(null);
  const [dischargeRemarks, setDischargeRemarks] = useState('Vitals stable, medically fit to resume classes.');

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

  const [selectedHodLeaveToApprove, setSelectedHodLeaveToApprove] = useState<LeaveApplication | null>(null);
  const [hodExemptionReason, setHodExemptionReason] = useState('Paper Presentation at IEEE Technical Conference');
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{ uri: string; title: string; subtitle: string } | null>(null);

  // AO Pass Forms
  const [passFormType, setPassFormType] = useState<'emergency' | 'duplicate'>('emergency');
  const [emergencyUsn, setEmergencyUsn] = useState('1RV22CS089');
  const [emergencyReason, setEmergencyReason] = useState('Urgent Family Medical Emergency');
  const [emergencyDestination, setEmergencyDestination] = useState('Home');
  const [emergencyDays, setEmergencyDays] = useState('3');

  const [duplicateUsn, setDuplicateUsn] = useState('1RV22CS089');
  const [duplicateReason, setDuplicateReason] = useState('Urgent late leave application - family visit');
  const [duplicateDestination, setDuplicateDestination] = useState('Home');

  // Load Data
  const loadAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [leaves, grievances, ratings, stdList, logs, health, feed, acads, blocked, petitions] =
        await Promise.all([
          StorageService.getAllLeavesAdmin(),
          StorageService.getAllGrievancesAdmin(),
          StorageService.getAllMessRatingsAdmin(),
          StorageService.getAllStudents(),
          StorageService.getGateLogs(),
          StorageService.getHealthLogs(),
          StorageService.getMasterActivityFeed(),
          StorageService.getAcademics(),
          StorageService.getBlockedOutingStudents(),
          StorageService.getAoPetitions(),
        ]);

      setAllLeaves(leaves);
      setAllGrievances(grievances);
      setAllMessRatings(ratings);
      setStudents(stdList);
      setGateLogs(logs);
      setHealthLogs(health);
      setActivityFeed(feed);
      setAcademics(acads);
      setBlockedStudents(blocked);
      setAoPetitions(petitions);
    } catch (err) {
      console.warn('Admin load error', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleAdminLogout = () => {
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs');
  };

  // Full Student Dossier Inspection Handler
  const handleOpenStudentDossier = async (usn: string) => {
    if (!usn.trim()) return;
    try {
      setIsLoadingDossier(true);
      const dossier = await StorageService.getStudentScanDossier(usn.trim());
      if (dossier) {
        setSelectedDossier(dossier);
      } else {
        Alert.alert('Student Not Found', `No registered student or pass records found matching "${usn}".`);
      }
    } catch (err) {
      console.warn('Error loading student dossier', err);
    } finally {
      setIsLoadingDossier(false);
    }
  };

  const handleToggleOutingBlock = async (usn: string, currentlyBlocked: boolean) => {
    try {
      if (currentlyBlocked) {
        const res = await StorageService.swoPermitOuting(usn, 'Administrative Officer (AO)', 'Cleared by AO.');
        Alert.alert('Outing Privilege Restored', res.message);
      } else {
        const res = await StorageService.swoLockOuting(usn, 'Curfew violation / Administrative restriction', 'Administrative Officer (AO)');
        Alert.alert('Outing Suspended', `Outpass privilege for ${usn} has been suspended.`);
      }
      await loadAdminData();
      if (selectedDossier && selectedDossier.student.usn.toUpperCase() === usn.toUpperCase()) {
        const updated = await StorageService.getStudentScanDossier(usn);
        if (updated) setSelectedDossier(updated);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update outing status.');
    }
  };

  // Leave Actions
  const handleWardenApprove = async (leaveId: string) => {
    await StorageService.wardenApproveLeave(leaveId, 'Mr. R. K. Gowda (Warden)', 'Sanctioned by Warden (1–5 Days Tier).');
    await loadAdminData();
    Alert.alert('Approved', 'Leave sanctioned by Warden. Gate pass token activated.');
  };

  const handleWardenReject = async (leaveId: string) => {
    await StorageService.wardenRejectLeave(leaveId, 'Mr. R. K. Gowda (Warden)', 'Rejected by Warden.');
    await loadAdminData();
    Alert.alert('Rejected', 'Leave marked as rejected.');
  };

  const handleSwoApprove = async (leaveId: string) => {
    await StorageService.swoApproveLeave(leaveId, 'Dr. Suresh Babu (SWO)', 'Sanctioned by Student Welfare Officer (5–8 Days Tier).');
    await loadAdminData();
    Alert.alert('Approved', 'Leave sanctioned by SWO.');
  };

  const handleSwoReject = async (leaveId: string) => {
    await StorageService.swoRejectLeave(leaveId, 'Dr. Suresh Babu (SWO)', 'Rejected by SWO after welfare review.');
    await loadAdminData();
    Alert.alert('Rejected', 'Leave marked as rejected.');
  };

  const handleConfirmHodApprove = async () => {
    if (!selectedHodLeaveToApprove) return;
    await StorageService.hodApproveLeave(
      selectedHodLeaveToApprove.id,
      'Dr. K. N. Subramanya (HOD)',
      `Sanctioned with Academic Attendance Exemption: ${hodExemptionReason}`
    );
    setSelectedHodLeaveToApprove(null);
    await loadAdminData();
    Alert.alert('Approved', `Academic leave approved with attendance concession for: ${hodExemptionReason}`);
  };

  const handleHodReject = async (leaveId: string) => {
    await StorageService.hodRejectLeave(leaveId, 'Dr. K. N. Subramanya (HOD)', 'Rejected by HOD.');
    await loadAdminData();
    Alert.alert('Rejected', 'Leave marked as rejected.');
  };

  // SWO Curfew Actions
  const handleSwoPermitOuting = async (usn: string) => {
    try {
      const res = await StorageService.swoPermitOuting(usn, 'Dr. Suresh Babu (SWO)', 'Cleared by SWO.');
      await loadAdminData();
      Alert.alert('Privilege Restored', res.message);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not grant clearance.');
    }
  };

  // Health Actions
  const handleSaveHealthRoomLog = async () => {
    if (!healthUsn.trim() || !healthSymptoms.trim()) {
      Alert.alert('Missing Field', 'Please provide Student USN and Symptoms/Diagnosis.');
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
      guardianIntimated: true,
      checkInTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      recordedByWarden: 'Mr. R. K. Gowda (Warden)',
      remarks: healthRemarks.trim() || (healthStatus === 'Resting in Health Room' ? 'Resting in sick bay.' : 'Transferred to hospital.'),
    });

    setShowHealthModal(false);
    setHealthSymptoms('');
    setHealthRemarks('');
    await loadAdminData();
    Alert.alert('Logged', `Health entry recorded for ${healthName}.`);
  };

  const handleConfirmDischarge = async () => {
    if (!selectedHealthToDischarge) return;
    const checkOut = new Date().toISOString().replace('T', ' ').substring(0, 16);
    await StorageService.dischargeHealthRoomLog(selectedHealthToDischarge.id, checkOut, dischargeRemarks);
    setSelectedHealthToDischarge(null);
    await loadAdminData();
    Alert.alert('Discharged', `${selectedHealthToDischarge.studentName} marked as recovered.`);
  };

  const handleTransferToHospital = async (log: HealthRoomLog) => {
    await StorageService.updateHealthRoomLog(log.id, {
      status: 'Referred to Hospital',
      location: 'Hospital (City / Multispeciality)',
      hospitalName: 'Apollo Speciality Hospital',
      remarks: 'Transferred to hospital via college vehicle.',
    });
    await loadAdminData();
    Alert.alert('Transferred', `${log.studentName} marked as transferred to hospital.`);
  };

  // Academics Edit
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
    Alert.alert('Saved', 'Subject marks and attendance updated.');
  };

  // Grievance Assignment
  const handleConfirmAssign = async () => {
    if (!selectedTicket) return;
    await StorageService.adminAssignGrievance(selectedTicket.id, staffName, assignStatus);
    setSelectedTicket(null);
    await loadAdminData();
    Alert.alert('Assigned', `Ticket ${selectedTicket.id} assigned to ${staffName}.`);
  };

  // AO Pass Generation
  const handleGrantEmergencyPass = async () => {
    if (!emergencyUsn.trim()) {
      Alert.alert('Error', 'Please provide student USN.');
      return;
    }
    const granted = await StorageService.grantEmergencyLeaveByAO({
      usn: emergencyUsn.trim().toUpperCase(),
      reason: emergencyReason.trim(),
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * (parseInt(emergencyDays, 10) || 1)).toISOString().split('T')[0],
      totalDays: parseInt(emergencyDays, 10) || 1,
      destination: emergencyDestination.trim(),
      guardianIntimated: true,
      remarks: 'Sanctioned under AO discretionary emergency powers.',
    });
    await loadAdminData();
    Alert.alert('Emergency Pass Granted', `Outpass token: ${granted.gateToken} for ${granted.studentName}. Active for gate exit.`);
  };

  const handleIssueDuplicateCoupon = async () => {
    if (!duplicateUsn.trim()) {
      Alert.alert('Error', 'Please provide student USN.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const returnDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
    const pass = await StorageService.issueDuplicateCouponByAO({
      usn: duplicateUsn.trim().toUpperCase(),
      startDate: today,
      startSession: 'Evening',
      departureTime: '05:00 PM',
      endDate: returnDate,
      returnSession: 'Morning',
      expectedReturnTime: '08:30 AM',
      leaveType: 'Home Visit',
      reason: duplicateReason.trim(),
      destination: duplicateDestination.trim(),
      remarks: 'AO Compensation Pass sanctioned.',
      aoOfficerName: 'Administrative Officer (AO)',
      isCompensationPass: true,
    });
    await loadAdminData();
    Alert.alert('Duplicate Pass Issued', `Pass: ${pass.duplicateCouponNumber} generated for ${pass.studentName}.`);
  };

  // Device Reset
  const handleResetDevice = async (usn: string) => {
    await StorageService.resetStudentDevice(usn);
    await loadAdminData();
    Alert.alert('Device Cleared', `Student USN ${usn} may now bind a new device.`);
  };

  // Room Allotment Execution
  const handlePerformRoomAllotment = () => {
    if (!allotUsn.trim() || !allotRoom.trim()) {
      Alert.alert('Error', 'Please provide Student USN and Room Number.');
      return;
    }
    Alert.alert(
      'Bed Allotment Confirmed',
      `Official Hostel Room Allotment:
Student: ${allotName} (${allotUsn.toUpperCase()})
Block: ${allotBlock}
Room & Bed: Room ${allotRoom}, ${allotBed}
Receipt: ${allotFeeReceipt}

Official signed allotment record has been certified.`
    );
    setShowRoomAllotModal(false);
  };

  // Official Mail & Password Authentication Handler
  const handleLoginSubmit = () => {
    if (!selectedRole) return;
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both official institutional email and password.');
      return;
    }
    const conf = ADMIN_CREDENTIALS[selectedRole];
    if (
      loginEmail.trim().toLowerCase() === conf.email.toLowerCase() &&
      loginPassword.trim() === conf.password
    ) {
      setLoginError('');
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate(60);
        } catch {
          // ignore
        }
      }
      setAuthenticatedRole(selectedRole);
    } else {
      const otherRole = (['Warden', 'SWO', 'HOD', 'AO'] as AdminRole[]).find(
        (r) => ADMIN_CREDENTIALS[r].email.toLowerCase() === loginEmail.trim().toLowerCase()
      );
      if (otherRole && otherRole !== selectedRole) {
        setLoginError(
          `This email belongs to ${ADMIN_CREDENTIALS[otherRole].roleName}. Please return to All Desks and select the ${otherRole} Desk.`
        );
      } else {
        setLoginError('Invalid credentials. Please verify your official email and password.');
      }
    }
  };

  // Filtered lists
  const wardenLeaves = allLeaves.filter((l) => (l.totalDays || 1) <= 5);
  const swoLeaves = allLeaves.filter((l) => (l.totalDays || 1) > 5 && (l.totalDays || 1) <= 8);
  const hodLeaves = allLeaves.filter((l) => (l.totalDays || 1) > 8);

  const pendingWarden = wardenLeaves.filter((l) => l.status === 'Pending').length;
  const pendingSwo = swoLeaves.filter((l) => l.status === 'Pending').length;
  const pendingHod = hodLeaves.filter((l) => l.status === 'Pending').length;
  const activeHealthCount = healthLogs.filter((h) => h.status !== 'Discharged / Recovered').length;
  const openGrievancesCount = allGrievances.filter((g) => g.status !== 'Resolved').length;

  const latecomers = gateLogs.filter(
    (g) => g.isLate || g.isLateReturn || (g.remarks?.toLowerCase().includes('curfew'))
  );

  const lowAttendanceSubjects: Array<{ sem: number; sub: any }> = [];
  academics.forEach((sem) => {
    sem.subjects.forEach((s) => {
      if (s.attendancePercentage < 75) {
        lowAttendanceSubjects.push({ sem: sem.semester, sub: s });
      }
    });
  });

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.usn.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.roomNumber?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // When no desk is selected, render the Independent Gateway Screen
  if (!selectedRole) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Gateway Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color="#1E293B" />
            <Text style={styles.backBtnText}>Student App</Text>
          </TouchableOpacity>

          <View style={styles.gatewayTopTitleWrap}>
            <Shield size={16} color="#4F46E5" />
            <Text style={styles.gatewayTopTitleText}>Hostel Admin Desks</Text>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleAdminLogout}
            activeOpacity={0.7}
          >
            <LogOut size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Gateway Content: 4 Independent Authority Desks */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.gatewayScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gatewayHeader}>
            <View style={styles.gatewayBadge}>
              <Lock size={13} color="#4F46E5" />
              <Text style={styles.gatewayBadgeText}>Official Institutional Administration</Text>
            </View>
            <Text style={styles.gatewayTitle}>Select Administrative Desk</Text>
            <Text style={styles.gatewaySubtitle}>
              Each office maintains an isolated, independent workspace. Select your designated authority below.
            </Text>
          </View>

          <View style={styles.gatewayGrid}>
            {(['Warden', 'SWO', 'HOD', 'AO'] as AdminRole[]).map((r) => {
              const conf = ADMIN_CREDENTIALS[r];
              let kpiText = '';
              if (r === 'Warden') {
                kpiText = `${pendingWarden} Pending Leaves • ${activeHealthCount} Sick Bay • ${allMessRatings.length} Mess Reviews`;
              } else if (r === 'SWO') {
                kpiText = `${pendingSwo} Welfare Leaves • ${openGrievancesCount} Open Issues • ${blockedStudents.length} Curfew Cases`;
              } else if (r === 'HOD') {
                kpiText = `${pendingHod} Academic Leaves • ${lowAttendanceSubjects.length} Defaulters`;
              } else {
                kpiText = `${students.length} Registered • ${latecomers.length} Late Check-ins • ${aoPetitions.length} Petitions`;
              }

              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.gatewayCard, { borderLeftColor: conf.color }]}
                  onPress={() => {
                    setSelectedRole(r);
                    setLoginEmail('');
                    setLoginPassword('');
                    setLoginError('');
                    setShowPassword(false);
                  }}
                  activeOpacity={0.88}
                >
                  <View style={styles.gatewayCardHeader}>
                    <View style={[styles.gatewayIconBox, { backgroundColor: conf.color + '18' }]}>
                      {renderRoleIcon(r, 22, conf.color)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.gatewayCardTitleRow}>
                        <Text style={styles.gatewayCardRoleTitle}>{conf.title}</Text>
                        <View style={[styles.gatewayRolePill, { backgroundColor: conf.color + '15' }]}>
                          <Text style={[styles.gatewayRolePillText, { color: conf.color }]}>{r} Desk</Text>
                        </View>
                      </View>
                      <Text style={styles.gatewayCardOfficer}>{conf.adminName}</Text>
                      <Text style={styles.gatewayCardDept}>{conf.department}</Text>
                    </View>
                  </View>

                  <Text style={styles.gatewayCardScope}>{conf.scope}</Text>

                  <View style={styles.gatewayCardFooter}>
                    <View style={styles.gatewayKpiPill}>
                      <Text style={styles.gatewayKpiPillText} numberOfLines={1}>{kpiText}</Text>
                    </View>
                    <View style={[styles.gatewayEnterBtn, { backgroundColor: conf.color }]}>
                      <Text style={styles.gatewayEnterBtnText}>Sign In</Text>
                      <ChevronRight size={14} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Dedicated Institutional Mail & Password Login Screen for Selected Desk
  if (selectedRole && authenticatedRole !== selectedRole) {
    const conf = ADMIN_CREDENTIALS[selectedRole];

    return (
      <SafeAreaView style={styles.container}>
        {/* Auth Top Navigation Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setSelectedRole(null);
              setLoginError('');
            }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color="#1E293B" />
            <Text style={styles.backBtnText}>All Desks</Text>
          </TouchableOpacity>

          <View style={styles.gatewayTopTitleWrap}>
            <Lock size={14} color={conf.color} />
            <Text style={[styles.gatewayTopTitleText, { color: conf.color }]}>
              {selectedRole} Desk Auth
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleAdminLogout}
            activeOpacity={0.7}
          >
            <LogOut size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.loginScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Authority Header Card */}
            <View style={[styles.loginHeaderCard, { borderTopColor: conf.color }]}>
              <View style={[styles.loginAvatarBox, { backgroundColor: conf.color + '18' }]}>
                {renderRoleIcon(selectedRole, 26, conf.color)}
              </View>
              <Text style={styles.loginRoleTitle}>{conf.title}</Text>
              <Text style={styles.loginOfficerName}>{conf.adminName}</Text>
              <Text style={styles.loginDeptText}>{conf.department}</Text>
              <View style={[styles.loginSecBadge, { backgroundColor: conf.color + '12' }]}>
                <Lock size={11} color={conf.color} />
                <Text style={[styles.loginSecBadgeText, { color: conf.color }]}>
                  Restricted Authority Access
                </Text>
              </View>
            </View>

            {/* Login Input Card */}
            <View style={styles.loginCard}>
              <Text style={styles.loginCardTitle}>Sign In with Mail & Password</Text>
              <Text style={styles.loginCardSub}>
                Authorized personnel must sign in to access {selectedRole} desk operations:
              </Text>

              {/* Email Input */}
              <Text style={styles.inputLabel}>Institutional Email</Text>
              <View style={styles.inputBoxWrap}>
                <Mail size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={loginEmail}
                  onChangeText={(text) => {
                    setLoginEmail(text);
                    if (loginError) setLoginError('');
                  }}
                  placeholder={conf.email}
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <Text style={styles.inputLabel}>Desk Security Password</Text>
              <View style={styles.inputBoxWrap}>
                <Key size={16} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInputWithIcon}
                  value={loginPassword}
                  onChangeText={(text) => {
                    setLoginPassword(text);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="Enter desk password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {!!loginError && (
                <View style={styles.loginErrorBanner}>
                  <AlertCircle size={15} color="#EF4444" />
                  <Text style={styles.loginErrorBannerText}>{loginError}</Text>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.loginSubmitBtn, { backgroundColor: conf.color }]}
                onPress={handleLoginSubmit}
                activeOpacity={0.85}
              >
                <Lock size={16} color="#FFFFFF" />
                <Text style={styles.loginSubmitBtnText}>
                  Unlock {selectedRole} Dashboard
                </Text>
              </TouchableOpacity>

              {/* Quick Demo Credentials Autofill for fast testing */}
              <View style={styles.quickFillBox}>
                <View style={styles.quickFillHeader}>
                  <Zap size={14} color="#D97706" />
                  <Text style={styles.quickFillTitle}>Institutional Test Credentials</Text>
                </View>
                <Text style={styles.quickFillCredText}>
                  Email: <Text style={styles.boldText}>{conf.email}</Text>
                </Text>
                <Text style={styles.quickFillCredText}>
                  Password: <Text style={styles.boldText}>{conf.password}</Text>
                </Text>
                <TouchableOpacity
                  style={styles.quickFillBtn}
                  onPress={() => {
                    setLoginEmail(conf.email);
                    setLoginPassword(conf.password);
                    setLoginError('');
                  }}
                >
                  <Text style={styles.quickFillBtnText}>⚡ Auto-Fill This Officer's Credentials</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const currentOfficer = ADMIN_CREDENTIALS[selectedRole];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar for Selected Desk */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            setAuthenticatedRole(null);
            setSelectedRole(null);
            setLoginEmail('');
            setLoginPassword('');
            setLoginError('');
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color="#1E293B" />
          <Text style={styles.backBtnText}>Lock & Switch Desk</Text>
        </TouchableOpacity>

        <View style={styles.officerPill}>
          <View style={[styles.roleBadgeDot, { backgroundColor: currentOfficer.color }]} />
          <Text style={styles.officerName} numberOfLines={1}>
            {currentOfficer.adminName} ({selectedRole})
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            setAuthenticatedRole(null);
            setSelectedRole(null);
            handleAdminLogout();
          }}
          activeOpacity={0.7}
        >
          <LogOut size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Desk-Specific Non-Interconnected Metrics */}
      <View style={styles.kpiRow}>
        {selectedRole === 'Warden' && (
          <>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: '#D97706' }]}>{pendingWarden}</Text>
              <Text style={styles.kpiLabel}>Pending (1–5d)</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: activeHealthCount > 0 ? '#EF4444' : '#1E293B' }]}>
                {activeHealthCount}
              </Text>
              <Text style={styles.kpiLabel}>Sick Bay</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{allMessRatings.length}</Text>
              <Text style={styles.kpiLabel}>Mess Reviews</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                {wardenLeaves.filter((l) => l.status === 'Approved').length}
              </Text>
              <Text style={styles.kpiLabel}>Sanctioned</Text>
            </View>
          </>
        )}

        {selectedRole === 'SWO' && (
          <>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: '#059669' }]}>{pendingSwo}</Text>
              <Text style={styles.kpiLabel}>Welfare (5–8d)</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: openGrievancesCount > 0 ? '#D97706' : '#1E293B' }]}>
                {openGrievancesCount}
              </Text>
              <Text style={styles.kpiLabel}>Open Grievances</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: blockedStudents.length > 0 ? '#EF4444' : '#1E293B' }]}>
                {blockedStudents.length}
              </Text>
              <Text style={styles.kpiLabel}>Curfew Cases</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                {allGrievances.filter((g) => g.status === 'Resolved').length}
              </Text>
              <Text style={styles.kpiLabel}>Resolved Issues</Text>
            </View>
          </>
        )}

        {selectedRole === 'HOD' && (
          <>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: '#7C3AED' }]}>{pendingHod}</Text>
              <Text style={styles.kpiLabel}>Academic (&gt;8d)</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: lowAttendanceSubjects.length > 0 ? '#EF4444' : '#1E293B' }]}>
                {lowAttendanceSubjects.length}
              </Text>
              <Text style={styles.kpiLabel}>Defaulters &lt;75%</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{academics.length}</Text>
              <Text style={styles.kpiLabel}>Semesters</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                {hodLeaves.filter((l) => l.status === 'Approved').length}
              </Text>
              <Text style={styles.kpiLabel}>Approved Leaves</Text>
            </View>
          </>
        )}

        {selectedRole === 'AO' && (
          <>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: '#4F46E5' }]}>{students.length}</Text>
              <Text style={styles.kpiLabel}>Residents</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={[styles.kpiValue, { color: latecomers.length > 0 ? '#EF4444' : '#1E293B' }]}>
                {latecomers.length}
              </Text>
              <Text style={styles.kpiLabel}>Late Returns</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{aoPetitions.length}</Text>
              <Text style={styles.kpiLabel}>Petitions</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiValue}>{gateLogs.length}</Text>
              <Text style={styles.kpiLabel}>Gate Scans</Text>
            </View>
          </>
        )}
      </View>

      {/* Main Content Area for Selected Desk */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================
            VIEW: WARDEN (1–5 Days Leaves & Sick Bay & Mess)
           ======================================================== */}
        {selectedRole === 'Warden' && (
          <View style={styles.viewSection}>
            <View style={styles.subTabsStrip}>
              <TouchableOpacity
                style={[styles.subTabItem, wardenTab === 'leaves' && styles.subTabItemActive]}
                onPress={() => setWardenTab('leaves')}
              >
                <Text style={[styles.subTabItemText, wardenTab === 'leaves' && styles.subTabItemTextActive]}>
                  Leave Approvals ({pendingWarden})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, wardenTab === 'health' && styles.subTabItemActive]}
                onPress={() => setWardenTab('health')}
              >
                <Text style={[styles.subTabItemText, wardenTab === 'health' && styles.subTabItemTextActive]}>
                  Sick Bay ({activeHealthCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, wardenTab === 'mess' && styles.subTabItemActive]}
                onPress={() => setWardenTab('mess')}
              >
                <Text style={[styles.subTabItemText, wardenTab === 'mess' && styles.subTabItemTextActive]}>
                  Mess Ratings ({allMessRatings.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, wardenTab === 'performance' && styles.subTabItemActive]}
                onPress={() => setWardenTab('performance')}
              >
                <Text style={[styles.subTabItemText, wardenTab === 'performance' && styles.subTabItemTextActive]}>
                  Allotment & TAT
                </Text>
              </TouchableOpacity>
            </View>

            {/* Warden: Leaves */}
            {wardenTab === 'leaves' && (
              <View style={styles.cardsList}>
                {wardenLeaves.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 size={32} color="#10B981" />
                    <Text style={styles.emptyCardText}>No leave requests under 5 days pending.</Text>
                  </View>
                ) : (
                  wardenLeaves.map((l) => (
                    <View key={l.id} style={styles.itemCard}>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.cardTitle}>{l.studentName}</Text>
                          <Text style={styles.cardSubTitle}>{l.usn} • Room {l.roomNumber || 'Hostel'}</Text>
                        </View>
                        <View style={[styles.badge, l.status === 'Pending' ? styles.badgePending : styles.badgeSuccess]}>
                          <Text style={styles.badgeText}>{l.status}</Text>
                        </View>
                      </View>

                      <View style={styles.cardInfoGrid}>
                        <Text style={styles.infoRowText}><Text style={styles.boldText}>Type:</Text> {l.leaveType} ({l.totalDays || 1} Days)</Text>
                        <Text style={styles.infoRowText}><Text style={styles.boldText}>Dates:</Text> {l.startDate} to {l.endDate}</Text>
                        <Text style={styles.infoRowText}><Text style={styles.boldText}>Reason:</Text> {l.reason}</Text>
                      </View>

                      {l.status === 'Pending' && (
                        <View style={styles.cardActionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleWardenApprove(l.id)}
                          >
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleWardenReject(l.id)}
                          >
                            <X size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Warden: Health Bay */}
            {wardenTab === 'health' && (
              <View style={styles.cardsList}>
                <TouchableOpacity
                  style={styles.addItemBtn}
                  onPress={() => setShowHealthModal(true)}
                  activeOpacity={0.8}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.addItemBtnText}>Log New Sick Student</Text>
                </TouchableOpacity>

                {healthLogs.map((h) => (
                  <View key={h.id} style={styles.itemCard}>
                    <View style={styles.cardHeaderRow}>
                      <View>
                        <Text style={styles.cardTitle}>{h.studentName}</Text>
                        <Text style={styles.cardSubTitle}>{h.usn} • {h.roomNumber || 'Hostel'} • {h.location}</Text>
                      </View>
                      <View style={[styles.badge, h.status === 'Discharged / Recovered' ? styles.badgeSuccess : styles.badgeDanger]}>
                        <Text style={styles.badgeText}>{h.status}</Text>
                      </View>
                    </View>

                    <Text style={styles.infoRowText}><Text style={styles.boldText}>Symptoms:</Text> {h.symptomsOrDiagnosis}</Text>
                    {h.prescribedMedicines ? (
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Rx:</Text> {h.prescribedMedicines}</Text>
                    ) : null}

                    {h.status !== 'Discharged / Recovered' && (
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => {
                            setSelectedHealthToDischarge(h);
                            setDischargeRemarks('Recovered, medically fit to resume classes.');
                          }}
                        >
                          <CheckCircle2 size={16} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Discharge</Text>
                        </TouchableOpacity>
                        {h.status !== 'Referred to Hospital' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.secondaryBtn]}
                            onPress={() => handleTransferToHospital(h)}
                          >
                            <Text style={styles.secondaryBtnText}>Transfer to Hospital</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Warden: Mess Ratings */}
            {wardenTab === 'mess' && (
              <View style={styles.cardsList}>
                <View style={styles.filterPillRow}>
                  {(['all', 'Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'] as const).map((meal) => (
                    <TouchableOpacity
                      key={meal}
                      style={[styles.smallPill, messMealFilter === meal && styles.smallPillActive]}
                      onPress={() => setMessMealFilter(meal)}
                    >
                      <Text style={[styles.smallPillText, messMealFilter === meal && styles.smallPillTextActive]}>
                        {meal === 'all' ? 'All Meals' : meal}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {allMessRatings
                  .filter((m) => messMealFilter === 'all' || m.mealType === messMealFilter)
                  .map((m) => (
                    <View key={m.id} style={styles.itemCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>{m.mealType} ({m.date})</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Star size={16} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.boldText}>{m.rating} / 5</Text>
                        </View>
                      </View>
                      <Text style={styles.infoRowText}>{m.feedback || 'No written comment.'}</Text>
                      {m.photoUri && (
                        <TouchableOpacity
                          style={styles.viewPhotoBtn}
                          onPress={() => setSelectedPhotoModal({ uri: m.photoUri!, title: `${m.mealType} Plate`, subtitle: m.feedback || '' })}
                        >
                          <Camera size={14} color="#4F46E5" />
                          <Text style={styles.viewPhotoText}>View Plate Inspection Photo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
              </View>
            )}

            {/* Warden: Allotment & Performance Analytics */}
            {wardenTab === 'performance' && (
              <View style={styles.cardsList}>
                {/* 1. Room Allotment Execution & Capacity Card */}
                <View style={styles.perfHeroCard}>
                  <View style={styles.perfHeroHeader}>
                    <View style={[styles.perfHeroIconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Shield size={20} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perfHeroTitle}>Hostel Room & Bed Allotment</Text>
                      <Text style={styles.perfHeroSub}>Cauvery & Netravati Resident Capacity</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.perfAllotBtn}
                      onPress={() => setShowRoomAllotModal(true)}
                      activeOpacity={0.8}
                    >
                      <Plus size={14} color="#FFFFFF" />
                      <Text style={styles.perfAllotBtnText}>Allot Bed</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.perfProgressWrap}>
                    <View style={styles.perfProgressRow}>
                      <Text style={styles.perfProgressLabel}>Occupancy Allotment Rate</Text>
                      <Text style={styles.perfProgressPct}>95.0% (342/360 Beds)</Text>
                    </View>
                    <View style={styles.perfProgressBarBg}>
                      <View style={[styles.perfProgressBarFill, { width: '95%', backgroundColor: '#D97706' }]} />
                    </View>
                  </View>

                  <View style={styles.perfStatGrid}>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>342</Text>
                      <Text style={styles.perfStatLbl}>Allotted Beds</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={[styles.perfStatVal, { color: '#10B981' }]}>18</Text>
                      <Text style={styles.perfStatLbl}>Vacant Beds</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>97.8%</Text>
                      <Text style={styles.perfStatLbl}>Cauvery Block</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>92.2%</Text>
                      <Text style={styles.perfStatLbl}>Netravati Block</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Leave Decision Turnaround Time (TAT) */}
                <View style={styles.itemCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Leave Sanctioning Performance & SLA</Text>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>98.4% On-Time SLA</Text>
                    </View>
                  </View>

                  <View style={styles.perfMetricList}>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Clock size={16} color="#4F46E5" />
                        <Text style={styles.perfMetricTitle}>Avg Sanction Turnaround (TAT)</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>1.8 Hours (Target &lt; 4h)</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <Text style={styles.perfMetricTitle}>Sanction Ratio (1–5d Leaves)</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>
                        {wardenLeaves.length > 0 ? `${Math.round((wardenLeaves.filter(l => l.status === 'Approved').length / wardenLeaves.length) * 100)}%` : '94%'} Approved
                      </Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <HeartPulse size={16} color="#EF4444" />
                        <Text style={styles.perfMetricTitle}>Sick Bay Recovery & Vitals SLA</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>100% Medical Vitals Monitored</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Star size={16} color="#F59E0B" />
                        <Text style={styles.perfMetricTitle}>Mess Food Inspection Index</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>4.3 / 5.0 ⭐ Quality Avg</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========================================================
            VIEW: SWO (5–8 Days Leaves & Grievances & Curfew)
           ======================================================== */}
        {selectedRole === 'SWO' && (
          <View style={styles.viewSection}>
            <View style={styles.subTabsStrip}>
              <TouchableOpacity
                style={[styles.subTabItem, swoTab === 'leaves' && styles.subTabItemActive]}
                onPress={() => setSwoTab('leaves')}
              >
                <Text style={[styles.subTabItemText, swoTab === 'leaves' && styles.subTabItemTextActive]}>
                  Leaves 5–8d ({pendingSwo})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, swoTab === 'issues' && styles.subTabItemActive]}
                onPress={() => setSwoTab('issues')}
              >
                <Text style={[styles.subTabItemText, swoTab === 'issues' && styles.subTabItemTextActive]}>
                  Grievances ({openGrievancesCount})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, swoTab === 'curfew' && styles.subTabItemActive]}
                onPress={() => setSwoTab('curfew')}
              >
                <Text style={[styles.subTabItemText, swoTab === 'curfew' && styles.subTabItemTextActive]}>
                  Curfew Clearance ({blockedStudents.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, swoTab === 'performance' && styles.subTabItemActive]}
                onPress={() => setSwoTab('performance')}
              >
                <Text style={[styles.subTabItemText, swoTab === 'performance' && styles.subTabItemTextActive]}>
                  Staff Allotment & TAT
                </Text>
              </TouchableOpacity>
            </View>

            {/* SWO: Leaves */}
            {swoTab === 'leaves' && (
              <View style={styles.cardsList}>
                {swoLeaves.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 size={32} color="#10B981" />
                    <Text style={styles.emptyCardText}>No leave requests in the 5–8 days bracket.</Text>
                  </View>
                ) : (
                  swoLeaves.map((l) => (
                    <View key={l.id} style={styles.itemCard}>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.cardTitle}>{l.studentName}</Text>
                          <Text style={styles.cardSubTitle}>{l.usn} • {l.totalDays} Days</Text>
                        </View>
                        <View style={[styles.badge, l.status === 'Pending' ? styles.badgePending : styles.badgeSuccess]}>
                          <Text style={styles.badgeText}>{l.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Dates:</Text> {l.startDate} to {l.endDate}</Text>
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Reason:</Text> {l.reason}</Text>

                      {l.status === 'Pending' && (
                        <View style={styles.cardActionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleSwoApprove(l.id)}
                          >
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Approve (SWO)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleSwoReject(l.id)}
                          >
                            <X size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* SWO: Grievances */}
            {swoTab === 'issues' && (
              <View style={styles.cardsList}>
                {allGrievances.map((g) => (
                  <View key={g.id} style={styles.itemCard}>
                    <View style={styles.cardHeaderRow}>
                      <View>
                        <Text style={styles.cardTitle}>{g.category} Issue #{g.id}</Text>
                        <Text style={styles.cardSubTitle}>Room {g.roomNumber || 'Hostel'} • {g.createdAt?.substring(0, 10)}</Text>
                      </View>
                      <View style={[styles.badge, g.status === 'Resolved' ? styles.badgeSuccess : styles.badgePending]}>
                        <Text style={styles.badgeText}>{g.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.infoRowText}>{g.description}</Text>
                    {g.adminRemark ? (
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Admin Remark:</Text> {g.adminRemark}</Text>
                    ) : null}

                    {g.status !== 'Resolved' && (
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.secondaryBtn]}
                          onPress={() => setSelectedTicket(g)}
                        >
                          <Wrench size={14} color="#1E293B" />
                          <Text style={styles.secondaryBtnText}>Assign Staff</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* SWO: Curfew Blocks */}
            {swoTab === 'curfew' && (
              <View style={styles.cardsList}>
                {blockedStudents.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 size={32} color="#10B981" />
                    <Text style={styles.emptyCardText}>No students currently locked out of outings.</Text>
                  </View>
                ) : (
                  blockedStudents.map((b, idx) => (
                    <View key={idx} style={styles.itemCard}>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.cardTitle}>{b.name || 'Student'}</Text>
                          <Text style={styles.cardSubTitle}>USN: {b.usn}</Text>
                        </View>
                        <View style={[styles.badge, styles.badgeDanger]}>
                          <Text style={styles.badgeText}>Outpass Blocked</Text>
                        </View>
                      </View>
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Reason:</Text> {b.outingBlockReason || 'Curfew violation'}</Text>
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => handleSwoPermitOuting(b.usn)}
                        >
                          <CheckCircle2 size={16} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Restore Outing Privilege</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* SWO: Staff Allotment & Performance Analytics */}
            {swoTab === 'performance' && (
              <View style={styles.cardsList}>
                {/* 1. Maintenance Staff Allocation Card */}
                <View style={styles.perfHeroCard}>
                  <View style={styles.perfHeroHeader}>
                    <View style={[styles.perfHeroIconBox, { backgroundColor: '#D1FAE5' }]}>
                      <Wrench size={20} color="#059669" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perfHeroTitle}>Maintenance Staff Allotment</Text>
                      <Text style={styles.perfHeroSub}>Hostel Facility Technicians on Active Duty</Text>
                    </View>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>100% Assigned</Text>
                    </View>
                  </View>

                  <View style={styles.perfProgressWrap}>
                    <View style={styles.perfProgressRow}>
                      <Text style={styles.perfProgressLabel}>Grievance Resolution Velocity</Text>
                      <Text style={styles.perfProgressPct}>
                        {allGrievances.length > 0 ? `${Math.round((allGrievances.filter(g => g.status === 'Resolved').length / allGrievances.length) * 100)}%` : '88.5%'} SLA Solved
                      </Text>
                    </View>
                    <View style={styles.perfProgressBarBg}>
                      <View style={[styles.perfProgressBarFill, { width: '88%', backgroundColor: '#059669' }]} />
                    </View>
                  </View>

                  <View style={styles.perfStatGrid}>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>3</Text>
                      <Text style={styles.perfStatLbl}>Tech Leads Allotted</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={[styles.perfStatVal, { color: '#059669' }]}>
                        {allGrievances.filter(g => g.status === 'Resolved').length}
                      </Text>
                      <Text style={styles.perfStatLbl}>Tickets Fixed</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>3.4h</Text>
                      <Text style={styles.perfStatLbl}>Avg Fix TAT</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>4.7/5</Text>
                      <Text style={styles.perfStatLbl}>Student Rating</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Disciplinary Clearance & Welfare SLA */}
                <View style={styles.itemCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Welfare Operations & Disciplinary SLA</Text>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>Tier 1 Efficiency</Text>
                    </View>
                  </View>

                  <View style={styles.perfMetricList}>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Clock size={16} color="#059669" />
                        <Text style={styles.perfMetricTitle}>Welfare Leave Review TAT</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>2.4 Hours Avg (Target &lt; 6h)</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <Text style={styles.perfMetricTitle}>Parent Verification Call Ratio</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>100% Pre-Sanction Verified</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Users size={16} color="#4F46E5" />
                        <Text style={styles.perfMetricTitle}>Curfew Rehabilitation Clearance</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>85% Restored Post-Review</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Award size={16} color="#D97706" />
                        <Text style={styles.perfMetricTitle}>Hostel Welfare Index</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>96.4% Harmony Score</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========================================================
            VIEW: HOD (8–10+ Days Academic Leaves & Marks)
           ======================================================== */}
        {selectedRole === 'HOD' && (
          <View style={styles.viewSection}>
            <View style={styles.subTabsStrip}>
              <TouchableOpacity
                style={[styles.subTabItem, hodTab === 'leaves' && styles.subTabItemActive]}
                onPress={() => setHodTab('leaves')}
              >
                <Text style={[styles.subTabItemText, hodTab === 'leaves' && styles.subTabItemTextActive]}>
                  Academic Leaves 8–10d+ ({pendingHod})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, hodTab === 'academics' && styles.subTabItemActive]}
                onPress={() => setHodTab('academics')}
              >
                <Text style={[styles.subTabItemText, hodTab === 'academics' && styles.subTabItemTextActive]}>
                  Low Attendance & Marks ({lowAttendanceSubjects.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, hodTab === 'performance' && styles.subTabItemActive]}
                onPress={() => setHodTab('performance')}
              >
                <Text style={[styles.subTabItemText, hodTab === 'performance' && styles.subTabItemTextActive]}>
                  Academic Performance
                </Text>
              </TouchableOpacity>
            </View>

            {/* HOD Leaves */}
            {hodTab === 'leaves' && (
              <View style={styles.cardsList}>
                {hodLeaves.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 size={32} color="#10B981" />
                    <Text style={styles.emptyCardText}>No extended academic leaves pending.</Text>
                  </View>
                ) : (
                  hodLeaves.map((l) => (
                    <View key={l.id} style={styles.itemCard}>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.cardTitle}>{l.studentName}</Text>
                          <Text style={styles.cardSubTitle}>{l.usn} • {l.totalDays} Days</Text>
                        </View>
                        <View style={[styles.badge, l.status === 'Pending' ? styles.badgePending : styles.badgeSuccess]}>
                          <Text style={styles.badgeText}>{l.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Dates:</Text> {l.startDate} to {l.endDate}</Text>
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Reason:</Text> {l.reason}</Text>

                      {l.status === 'Pending' && (
                        <View style={styles.cardActionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => {
                              setSelectedHodLeaveToApprove(l);
                              setHodExemptionReason('Paper Presentation at Technical Conference');
                            }}
                          >
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Approve with Exemption</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleHodReject(l.id)}
                          >
                            <X size={16} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* HOD Academics */}
            {hodTab === 'academics' && (
              <View style={styles.cardsList}>
                {academics.map((sem) => (
                  <View key={sem.semester} style={styles.itemCard}>
                    <Text style={[styles.cardTitle, { marginBottom: 8 }]}>Semester {sem.semester}</Text>
                    {sem.subjects.map((sub) => (
                      <View key={sub.code} style={styles.subjectRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.subjectName}>{sub.name} ({sub.code})</Text>
                          <Text style={[styles.subjectSub, sub.attendancePercentage < 75 && { color: '#EF4444', fontWeight: '700' }]}>
                            Attendance: {sub.attendancePercentage}% ({sub.classesAttended}/{sub.totalClasses}) • IA: {sub.ia1}, {sub.ia2}, {sub.ia3}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editSubjectBtn}
                          onPress={() => openEditAcademicsModal(sem.semester, sub)}
                        >
                          <Text style={styles.editSubjectBtnText}>Edit</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* HOD: Academic Performance & Concessions */}
            {hodTab === 'performance' && (
              <View style={styles.cardsList}>
                {/* 1. Academic Performance & Concession Allotment Card */}
                <View style={styles.perfHeroCard}>
                  <View style={styles.perfHeroHeader}>
                    <View style={[styles.perfHeroIconBox, { backgroundColor: '#EDE9FE' }]}>
                      <GraduationCap size={20} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perfHeroTitle}>Department Academic Performance</Text>
                      <Text style={styles.perfHeroSub}>Computer Science & Engineering Cohort</Text>
                    </View>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>97.4% Passing Projection</Text>
                    </View>
                  </View>

                  <View style={styles.perfProgressWrap}>
                    <View style={styles.perfProgressRow}>
                      <Text style={styles.perfProgressLabel}>Department Attendance Index</Text>
                      <Text style={styles.perfProgressPct}>88.6% (VTU Norm: &gt;= 85%)</Text>
                    </View>
                    <View style={styles.perfProgressBarBg}>
                      <View style={[styles.perfProgressBarFill, { width: '88%', backgroundColor: '#7C3AED' }]} />
                    </View>
                  </View>

                  <View style={styles.perfStatGrid}>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>88.6%</Text>
                      <Text style={styles.perfStatLbl}>Dept Attendance</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={[styles.perfStatVal, { color: lowAttendanceSubjects.length > 0 ? '#EF4444' : '#10B981' }]}>
                        {lowAttendanceSubjects.length}
                      </Text>
                      <Text style={styles.perfStatLbl}>Risk (&lt;75%)</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>42.6/50</Text>
                      <Text style={styles.perfStatLbl}>Avg CIE Score</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>{academics.length}</Text>
                      <Text style={styles.perfStatLbl}>Semesters Synced</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Concession Allotments & VTU Compliance */}
                <View style={styles.itemCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Academic Concession Allotment & SLA</Text>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>100% Concession Credit</Text>
                    </View>
                  </View>

                  <View style={styles.perfMetricList}>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Award size={16} color="#7C3AED" />
                        <Text style={styles.perfMetricTitle}>Technical Conference Attendance Credit</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>100% Granted (IEEE & Hackathons)</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Clock size={16} color="#4F46E5" />
                        <Text style={styles.perfMetricTitle}>Extended Leave Approval Turnaround</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>&lt; 24h Formal Sanction</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <CheckCircle2 size={16} color="#10B981" />
                        <Text style={styles.perfMetricTitle}>Continuous Internal Evaluation (CIE) Quality</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>96.8% First-Class IA Aggregate</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Users size={16} color="#059669" />
                        <Text style={styles.perfMetricTitle}>Remedial Coaching Batches</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>2 Active Mentorship Sessions</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========================================================
            VIEW: AO (Directory, Passes, Latecomers, Chronicle)
           ======================================================== */}
        {selectedRole === 'AO' && (
          <View style={styles.viewSection}>
            <View style={styles.subTabsStrip}>
              <TouchableOpacity
                style={[styles.subTabItem, aoTab === 'directory' && styles.subTabItemActive]}
                onPress={() => setAoTab('directory')}
              >
                <Text style={[styles.subTabItemText, aoTab === 'directory' && styles.subTabItemTextActive]}>
                  Students ({students.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, aoTab === 'latecomers' && styles.subTabItemActive]}
                onPress={() => setAoTab('latecomers')}
              >
                <Text style={[styles.subTabItemText, aoTab === 'latecomers' && styles.subTabItemTextActive]}>
                  Latecomers ({latecomers.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, aoTab === 'passes' && styles.subTabItemActive]}
                onPress={() => setAoTab('passes')}
              >
                <Text style={[styles.subTabItemText, aoTab === 'passes' && styles.subTabItemTextActive]}>
                  Issue Passes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, aoTab === 'feed' && styles.subTabItemActive]}
                onPress={() => setAoTab('feed')}
              >
                <Text style={[styles.subTabItemText, aoTab === 'feed' && styles.subTabItemTextActive]}>
                  Feed ({activityFeed.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabItem, aoTab === 'performance' && styles.subTabItemActive]}
                onPress={() => setAoTab('performance')}
              >
                <Text style={[styles.subTabItemText, aoTab === 'performance' && styles.subTabItemTextActive]}>
                  Gate TAT & Stats
                </Text>
              </TouchableOpacity>
            </View>

            {/* AO: Directory & Full USN Search Dossier */}
            {aoTab === 'directory' && (
              <View style={styles.cardsList}>
                {/* Search Bar with Instant Submit */}
                <View style={styles.searchBarWrapper}>
                  <Search size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    value={studentSearch}
                    onChangeText={(text) => {
                      setStudentSearch(text);
                      if (!text.trim()) {
                        setSelectedDossier(null);
                      }
                    }}
                    onSubmitEditing={() => {
                      if (studentSearch.trim()) {
                        handleOpenStudentDossier(studentSearch.trim());
                      }
                    }}
                    placeholder="Enter Student USN (e.g. 1RV22CS089), Name, or Room..."
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    returnKeyType="search"
                  />
                  {studentSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setStudentSearch('');
                        setSelectedDossier(null);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginRight: 6 }}
                    >
                      <X size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.searchSubmitBtn}
                    onPress={() => {
                      if (studentSearch.trim()) {
                        handleOpenStudentDossier(studentSearch.trim());
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.searchSubmitBtnText}>Search USN</Text>
                  </TouchableOpacity>
                </View>

                {/* Loading indicator */}
                {isLoadingDossier && (
                  <View style={[styles.itemCard, { alignItems: 'center', padding: 24, gap: 8 }]}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                    <Text style={styles.infoRowText}>Fetching complete records for student...</Text>
                  </View>
                )}

                {/* COMPREHENSIVE STUDENT DOSSIER VIEW */}
                {selectedDossier && !isLoadingDossier && (
                  <View style={{ gap: 10 }}>
                    {/* Top bar with back to directory list */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <TouchableOpacity
                        style={styles.backToListBtn}
                        onPress={() => setSelectedDossier(null)}
                      >
                        <ChevronLeft size={16} color="#4F46E5" />
                        <Text style={styles.backToListBtnText}>Back to All Students</Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
                          onPress={() => handleOpenStudentDossier(selectedDossier.student.usn)}
                        >
                          <RefreshCw size={12} color="#64748B" />
                          <Text style={{ fontSize: 11, color: '#64748B' }}>Refresh</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 1. Master Profile Header Card */}
                    <View style={[styles.itemCard, { borderWidth: 1.5, borderColor: '#4F46E535' }]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={styles.studentAvatarCircle}>
                            <Text style={styles.studentAvatarText}>
                              {selectedDossier.student.name.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { fontSize: 16 }]}>{selectedDossier.student.name}</Text>
                            <Text style={styles.cardSubTitle}>
                              USN: {selectedDossier.student.usn} • {selectedDossier.student.branch}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                              Room {selectedDossier.student.roomNumber || 'B-304'} • {selectedDossier.student.hostelBlock || 'Cauvery Block'}
                            </Text>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View
                            style={[
                              styles.badge,
                              selectedDossier.campusStatus === 'INSIDE CAMPUS'
                                ? styles.badgeSuccess
                                : styles.badgeDanger,
                            ]}
                          >
                            <Text style={styles.badgeText}>
                              {selectedDossier.campusStatus === 'INSIDE CAMPUS' ? '● INSIDE CAMPUS' : '● OUTSIDE CAMPUS'}
                            </Text>
                          </View>
                          {selectedDossier.isOutingBlocked ? (
                            <View style={[styles.badge, styles.badgeDanger]}>
                              <Text style={styles.badgeText}>Outing Blocked</Text>
                            </View>
                          ) : (
                            <View style={[styles.badge, styles.badgeSuccess]}>
                              <Text style={styles.badgeText}>Outing Active</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* 4 Stats Tiles */}
                      <View style={styles.dossierStatsRow}>
                        <View style={styles.dossierStatTile}>
                          <Text style={styles.dossierStatVal}>{selectedDossier.student.overallAttendance}%</Text>
                          <Text style={styles.dossierStatLbl}>Attendance</Text>
                        </View>
                        <View style={styles.dossierStatTile}>
                          <Text style={styles.dossierStatVal}>{selectedDossier.student.leavesCount}</Text>
                          <Text style={styles.dossierStatLbl}>Leaves Taken</Text>
                        </View>
                        <View style={styles.dossierStatTile}>
                          <Text style={styles.dossierStatVal}>{selectedDossier.outingOutpass.totalCount}</Text>
                          <Text style={styles.dossierStatLbl}>Total Outings</Text>
                        </View>
                        <View style={styles.dossierStatTile}>
                          <Text style={styles.dossierStatVal}>{selectedDossier.movementHistory.length}</Text>
                          <Text style={styles.dossierStatLbl}>Gate Scans</Text>
                        </View>
                      </View>
                    </View>

                    {/* 2. Contact & Device Details */}
                    <View style={styles.itemCard}>
                      <Text style={styles.sectionHeading}>Personal, Contact & Device Binding</Text>
                      <View style={styles.detailGrid}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Student Mobile:</Text>
                          <Text style={styles.detailValue}>{selectedDossier.student.contactNumber || '+91 98765 43210'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Parent / Guardian:</Text>
                          <Text style={styles.detailValue}>{selectedDossier.student.guardianContact || '+91 98765 01234'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Academic Year:</Text>
                          <Text style={styles.detailValue}>{selectedDossier.student.academicYear || '3rd Year (2024-2025)'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Bound Smartphone:</Text>
                          <Text style={styles.detailValue}>
                            {(selectedDossier.student as any).deviceModel || 'Pixel 8 Pro (Active & Bound)'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Digital Barcode:</Text>
                          <Text style={[styles.detailValue, { fontFamily: 'monospace', fontWeight: '700' }]}>
                            {selectedDossier.barcode || `*STU-${selectedDossier.student.usn}*`}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.secondaryBtn, { marginTop: 8 }]}
                        onPress={() => handleResetDevice(selectedDossier.student.usn)}
                      >
                        <RefreshCw size={14} color="#1E293B" />
                        <Text style={styles.secondaryBtnText}>Reset Smartphone Device Binding</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 3. Active Pass / Outpass */}
                    <View style={styles.itemCard}>
                      <Text style={styles.sectionHeading}>Current Gate Pass Status</Text>
                      {selectedDossier.activePass ? (
                        <View style={{ gap: 6, backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontWeight: '700', color: '#1E293B' }}>
                              {selectedDossier.activePassType} ({(selectedDossier.activePass as any).id || 'ACTIVE'})
                            </Text>
                            <View style={[styles.badge, styles.badgePending]}>
                              <Text style={styles.badgeText}>Active Pass</Text>
                            </View>
                          </View>
                          <Text style={styles.infoRowText}>
                            <Text style={styles.boldText}>Destination:</Text> {(selectedDossier.activePass as any).destination}
                          </Text>
                          <Text style={styles.infoRowText}>
                            <Text style={styles.boldText}>Purpose / Reason:</Text> {(selectedDossier.activePass as any).purpose || (selectedDossier.activePass as any).reason}
                          </Text>
                          <Text style={styles.infoRowText}>
                            <Text style={styles.boldText}>Pass Token:</Text> {(selectedDossier.activePass as any).outpassToken || (selectedDossier.activePass as any).gateToken || 'OP-ACTIVE'}
                          </Text>
                          <Text style={styles.infoRowText}>
                            <Text style={styles.boldText}>Dates / Timing:</Text> {(selectedDossier.activePass as any).outDate || (selectedDossier.activePass as any).startDate} ({(selectedDossier.activePass as any).outTime || (selectedDossier.activePass as any).departureTime || '09:00 AM'})
                          </Text>
                        </View>
                      ) : (
                        <View style={{ padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, color: '#64748B' }}>
                            No active gate pass. Student is currently recorded inside the hostel.
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 4. Gate Movement History (Scans) */}
                    <View style={styles.itemCard}>
                      <Text style={styles.sectionHeading}>
                        Recent Gate Movement Logs ({selectedDossier.movementHistory.length} events)
                      </Text>
                      {selectedDossier.movementHistory.length === 0 ? (
                        <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>
                          No gate check-out or check-in movements recorded yet.
                        </Text>
                      ) : (
                        selectedDossier.movementHistory.slice(0, 5).map((evt, idx) => (
                          <View key={idx} style={styles.movementItem}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontWeight: '700', fontSize: 12, color: evt.action === 'Check Out' ? '#D97706' : '#10B981' }}>
                                {evt.action === 'Check Out' ? '↗ Gate Departure' : '↙ Gate Arrival'}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#64748B' }}>{evt.timestamp}</Text>
                            </View>
                            <Text style={styles.infoRowText}>
                              {evt.gate} • Guard: {evt.guardName}
                            </Text>
                            {evt.remarks ? (
                              <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>
                                Remarks: {evt.remarks}
                              </Text>
                            ) : null}
                          </View>
                        ))
                      )}
                    </View>

                    {/* 5. Sick Bay & Health Records for this Student */}
                    {(() => {
                      const studentHealth = healthLogs.filter(
                        (h) => h.usn.toUpperCase() === selectedDossier.student.usn.toUpperCase()
                      );
                      if (studentHealth.length === 0) return null;
                      return (
                        <View style={styles.itemCard}>
                          <Text style={styles.sectionHeading}>Sick Bay & Health Care Logs ({studentHealth.length})</Text>
                          {studentHealth.map((h) => (
                            <View key={h.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontWeight: '700', fontSize: 12, color: '#1E293B' }}>{h.location} ({h.date})</Text>
                                <View style={[styles.badge, h.status === 'Discharged / Recovered' ? styles.badgeSuccess : styles.badgeDanger]}>
                                  <Text style={styles.badgeText}>{h.status}</Text>
                                </View>
                              </View>
                              <Text style={styles.infoRowText}>Symptoms / Diagnosis: {h.symptomsOrDiagnosis}</Text>
                              {h.prescribedMedicines ? <Text style={styles.infoRowText}>Prescription: {h.prescribedMedicines}</Text> : null}
                              {h.remarks ? <Text style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>Doctor: {h.doctorName} • {h.remarks}</Text> : null}
                            </View>
                          ))}
                        </View>
                      );
                    })()}

                    {/* 6. Academic Attendance & CIE Marks */}
                    {academics.length > 0 && (
                      <View style={styles.itemCard}>
                        <Text style={styles.sectionHeading}>Academic Attendance & CIE Marks</Text>
                        {academics[0]?.subjects?.map((sub) => (
                          <View key={sub.code} style={styles.subjectRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.subjectName}>{sub.name} ({sub.code})</Text>
                              <Text style={[styles.subjectSub, sub.attendancePercentage < 75 && { color: '#EF4444', fontWeight: '700' }]}>
                                Attendance: {sub.attendancePercentage}% ({sub.classesAttended}/{sub.totalClasses}) • IA: {sub.ia1}, {sub.ia2}, {sub.ia3}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* 7. Hostel Complaints Logged by this Student */}
                    {(() => {
                      const studentGrievances = allGrievances.filter(
                        (g) => g.usn && g.usn.toUpperCase() === selectedDossier.student.usn.toUpperCase()
                      );
                      if (studentGrievances.length === 0) return null;
                      return (
                        <View style={styles.itemCard}>
                          <Text style={styles.sectionHeading}>Hostel Complaints Logged ({studentGrievances.length})</Text>
                          {studentGrievances.map((g) => (
                            <View key={g.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontWeight: '700', fontSize: 12, color: '#1E293B' }}>{g.category} (Ticket #{g.id})</Text>
                                <View style={[styles.badge, g.status === 'Resolved' ? styles.badgeSuccess : styles.badgePending]}>
                                  <Text style={styles.badgeText}>{g.status}</Text>
                                </View>
                              </View>
                              <Text style={styles.infoRowText}>{g.description}</Text>
                              {g.adminRemark ? <Text style={{ fontSize: 11, color: '#64748B' }}>Admin Remark: {g.adminRemark}</Text> : null}
                            </View>
                          ))}
                        </View>
                      );
                    })()}

                    {/* 8. Administrative Actions for this Student */}
                    <View style={styles.itemCard}>
                      <Text style={styles.sectionHeading}>Administrative Actions for {selectedDossier.student.name}</Text>
                      <View style={{ gap: 8, marginTop: 4 }}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
                          onPress={() => {
                            setEmergencyUsn(selectedDossier.student.usn);
                            setPassFormType('emergency');
                            setAoTab('passes');
                          }}
                        >
                          <Ticket size={16} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Issue Emergency Leave Pass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: '#4F46E5' }]}
                          onPress={() => {
                            setDuplicateUsn(selectedDossier.student.usn);
                            setPassFormType('duplicate');
                            setAoTab('passes');
                          }}
                        >
                          <Ticket size={16} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Issue Duplicate Compensation Coupon</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            selectedDossier.isOutingBlocked ? styles.approveBtn : styles.rejectBtn,
                          ]}
                          onPress={() => handleToggleOutingBlock(selectedDossier.student.usn, !!selectedDossier.isOutingBlocked)}
                        >
                          {selectedDossier.isOutingBlocked ? (
                            <>
                              <CheckCircle2 size={16} color="#FFFFFF" />
                              <Text style={styles.actionBtnText}>Restore Outing Privilege</Text>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} color="#FFFFFF" />
                              <Text style={styles.actionBtnText}>Suspend Outpass Privilege (Curfew Breach)</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* IF NO DOSSIER SELECTED: DISPLAY MATCHING STUDENTS */}
                {!selectedDossier && !isLoadingDossier && (
                  filteredStudents.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Users size={32} color="#94A3B8" />
                      <Text style={styles.emptyCardText}>No students matching "{studentSearch}".</Text>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.secondaryBtn, { marginTop: 8 }]}
                        onPress={() => setStudentSearch('')}
                      >
                        <Text style={styles.secondaryBtnText}>Clear Search Filter</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    filteredStudents.map((s) => (
                      <View key={s.usn} style={styles.itemCard}>
                        <View style={styles.cardHeaderRow}>
                          <View>
                            <Text style={styles.cardTitle}>{s.name}</Text>
                            <Text style={styles.cardSubTitle}>{s.usn} • {s.branch || 'CSE'}</Text>
                          </View>
                          <View style={styles.devicePill}>
                            <Smartphone size={12} color="#10B981" />
                            <Text style={styles.devicePillText}>Bound</Text>
                          </View>
                        </View>
                        <Text style={styles.infoRowText}>Room: {s.roomNumber || 'B-304'} • {s.hostelBlock || 'Cauvery Block'}</Text>
                        <Text style={styles.infoRowText}>Contact: {s.contactNumber || '+91 98765 43210'}</Text>

                        <View style={styles.cardActionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#4F46E5' }]}
                            onPress={() => handleOpenStudentDossier(s.usn)}
                            activeOpacity={0.8}
                          >
                            <Eye size={14} color="#FFFFFF" />
                            <Text style={styles.actionBtnText}>View All Details & Full Dossier ➔</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.secondaryBtn]}
                            onPress={() => handleResetDevice(s.usn)}
                          >
                            <RefreshCw size={14} color="#1E293B" />
                            <Text style={styles.secondaryBtnText}>Reset Device</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )
                )}
              </View>
            )}

            {/* AO: Latecomers */}
            {aoTab === 'latecomers' && (
              <View style={styles.cardsList}>
                {latecomers.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <CheckCircle2 size={32} color="#10B981" />
                    <Text style={styles.emptyCardText}>No curfew breaches or late check-ins recorded.</Text>
                  </View>
                ) : (
                  latecomers.map((g) => (
                    <View key={g.id} style={styles.itemCard}>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.cardTitle}>{g.studentName || 'Student'}</Text>
                          <Text style={styles.cardSubTitle}>USN: {g.usn} • Station: {g.station}</Text>
                        </View>
                        <View style={[styles.badge, styles.badgeDanger]}>
                          <Text style={styles.badgeText}>Late Return</Text>
                        </View>
                      </View>
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Timestamp:</Text> {g.timestamp}</Text>
                      <Text style={styles.infoRowText}><Text style={styles.boldText}>Remarks:</Text> {g.remarks}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* AO: Issue Passes */}
            {aoTab === 'passes' && (
              <View style={styles.cardsList}>
                <View style={styles.passTypeToggle}>
                  <TouchableOpacity
                    style={[styles.passTypeBtn, passFormType === 'emergency' && styles.passTypeBtnActive]}
                    onPress={() => setPassFormType('emergency')}
                  >
                    <Text style={[styles.passTypeBtnText, passFormType === 'emergency' && styles.passTypeBtnTextActive]}>
                      Emergency Leave Pass
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.passTypeBtn, passFormType === 'duplicate' && styles.passTypeBtnActive]}
                    onPress={() => setPassFormType('duplicate')}
                  >
                    <Text style={[styles.passTypeBtnText, passFormType === 'duplicate' && styles.passTypeBtnTextActive]}>
                      Duplicate Coupon
                    </Text>
                  </TouchableOpacity>
                </View>

                {passFormType === 'emergency' ? (
                  <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Issue AO Emergency Pass</Text>
                    <Text style={styles.fieldLabel}>Student USN</Text>
                    <TextInput
                      style={styles.formInput}
                      value={emergencyUsn}
                      onChangeText={setEmergencyUsn}
                      placeholder="e.g. 1RV22CS089"
                    />
                    <Text style={styles.fieldLabel}>Destination</Text>
                    <TextInput
                      style={styles.formInput}
                      value={emergencyDestination}
                      onChangeText={setEmergencyDestination}
                      placeholder="e.g. Home"
                    />
                    <Text style={styles.fieldLabel}>Duration (Days)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={emergencyDays}
                      onChangeText={setEmergencyDays}
                      keyboardType="numeric"
                    />
                    <Text style={styles.fieldLabel}>Emergency Reason</Text>
                    <TextInput
                      style={styles.formInput}
                      value={emergencyReason}
                      onChangeText={setEmergencyReason}
                    />

                    <TouchableOpacity
                      style={[styles.primaryLoginBtn, { backgroundColor: '#DC2626', marginTop: 12 }]}
                      onPress={handleGrantEmergencyPass}
                    >
                      <Text style={styles.primaryLoginBtnText}>Grant Emergency Pass</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Issue Late Duplicate Coupon</Text>
                    <Text style={styles.fieldLabel}>Student USN</Text>
                    <TextInput
                      style={styles.formInput}
                      value={duplicateUsn}
                      onChangeText={setDuplicateUsn}
                      placeholder="e.g. 1RV22CS089"
                    />
                    <Text style={styles.fieldLabel}>Destination</Text>
                    <TextInput
                      style={styles.formInput}
                      value={duplicateDestination}
                      onChangeText={setDuplicateDestination}
                      placeholder="e.g. Home"
                    />
                    <Text style={styles.fieldLabel}>Reason for Late Application</Text>
                    <TextInput
                      style={styles.formInput}
                      value={duplicateReason}
                      onChangeText={setDuplicateReason}
                    />

                    <TouchableOpacity
                      style={[styles.primaryLoginBtn, { backgroundColor: '#4F46E5', marginTop: 12 }]}
                      onPress={handleIssueDuplicateCoupon}
                    >
                      <Text style={styles.primaryLoginBtnText}>Issue Duplicate Coupon</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* AO: Chronicle Feed */}
            {aoTab === 'feed' && (
              <View style={styles.cardsList}>
                {activityFeed.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardSubTitle}>{item.timestamp}</Text>
                    </View>
                    <Text style={styles.infoRowText}>{item.description}</Text>
                    <Text style={[styles.infoRowText, { color: '#64748B', marginTop: 4 }]}>Logged by: {item.actor}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* AO: Pass Allotment & Gate Performance Analytics */}
            {aoTab === 'performance' && (
              <View style={styles.cardsList}>
                {/* 1. Pass Allotment & Security Capacity Card */}
                <View style={styles.perfHeroCard}>
                  <View style={styles.perfHeroHeader}>
                    <View style={[styles.perfHeroIconBox, { backgroundColor: '#EEF2FF' }]}>
                      <Award size={20} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perfHeroTitle}>Gate Pass Allotment & Security</Text>
                      <Text style={styles.perfHeroSub}>AO Discretionary & Emergency Outpasses</Text>
                    </View>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>100% QR Tamper-Proof</Text>
                    </View>
                  </View>

                  <View style={styles.perfProgressWrap}>
                    <View style={styles.perfProgressRow}>
                      <Text style={styles.perfProgressLabel}>Campus Curfew On-Time Adherence</Text>
                      <Text style={styles.perfProgressPct}>97.9% Compliance</Text>
                    </View>
                    <View style={styles.perfProgressBarBg}>
                      <View style={[styles.perfProgressBarFill, { width: '97.9%', backgroundColor: '#4F46E5' }]} />
                    </View>
                  </View>

                  <View style={styles.perfStatGrid}>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>{students.length}</Text>
                      <Text style={styles.perfStatLbl}>Residents Bound</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={[styles.perfStatVal, { color: '#4F46E5' }]}>{aoPetitions.length}</Text>
                      <Text style={styles.perfStatLbl}>Pass Petitions</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>&lt; 3s</Text>
                      <Text style={styles.perfStatLbl}>Gate Scan TAT</Text>
                    </View>
                    <View style={styles.perfStatItem}>
                      <Text style={styles.perfStatVal}>100%</Text>
                      <Text style={styles.perfStatLbl}>Device Binding</Text>
                    </View>
                  </View>
                </View>

                {/* 2. Gate Movement Velocity & Security Metrics */}
                <View style={styles.itemCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Terminal Gate Security & Logistics SLA</Text>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>Zero Violations</Text>
                    </View>
                  </View>

                  <View style={styles.perfMetricList}>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Zap size={16} color="#4F46E5" />
                        <Text style={styles.perfMetricTitle}>Barcode Verification Scan Velocity</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>&lt; 3 Seconds per student scan</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Smartphone size={16} color="#10B981" />
                        <Text style={styles.perfMetricTitle}>Hardware Lock Integrity</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>100% Single Device Enforced</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Clock size={16} color="#D97706" />
                        <Text style={styles.perfMetricTitle}>Late Check-in Ratio</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>{latecomers.length} Incidents (2.1% of cohort)</Text>
                    </View>
                    <View style={styles.perfMetricRow}>
                      <View style={styles.perfMetricLeft}>
                        <Activity size={16} color="#059669" />
                        <Text style={styles.perfMetricTitle}>Master Activity Feed Throughput</Text>
                      </View>
                      <Text style={styles.perfMetricVal}>{activityFeed.length} Events Real-Time</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================
          MODALS
         ======================================================== */}
      {/* 1. Log Sick Student Modal */}
      <Modal visible={showHealthModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Student in Sick Bay</Text>
            <TextInput
              style={styles.modalInput}
              value={healthUsn}
              onChangeText={setHealthUsn}
              placeholder="Student USN"
            />
            <TextInput
              style={styles.modalInput}
              value={healthName}
              onChangeText={setHealthName}
              placeholder="Student Name"
            />
            <TextInput
              style={styles.modalInput}
              value={healthSymptoms}
              onChangeText={setHealthSymptoms}
              placeholder="Symptoms / Medical Diagnosis"
            />
            <TextInput
              style={styles.modalInput}
              value={healthMedicines}
              onChangeText={setHealthMedicines}
              placeholder="Medicines Prescribed"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setShowHealthModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleSaveHealthRoomLog}
              >
                <Text style={styles.modalSubmitBtnText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Discharge Student Modal */}
      <Modal visible={!!selectedHealthToDischarge} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Discharge Student</Text>
            <Text style={styles.infoRowText}>Student: {selectedHealthToDischarge?.studentName}</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={dischargeRemarks}
              onChangeText={setDischargeRemarks}
              placeholder="Discharge / Recovery remarks"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setSelectedHealthToDischarge(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleConfirmDischarge}
              >
                <Text style={styles.modalSubmitBtnText}>Confirm Discharge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Assign Staff Modal */}
      <Modal visible={!!selectedTicket} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Maintenance Staff</Text>
            <Text style={styles.infoRowText}>Ticket #{selectedTicket?.id}: {selectedTicket?.category}</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 10 }]}
              value={staffName}
              onChangeText={setStaffName}
              placeholder="Staff Name"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setSelectedTicket(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleConfirmAssign}
              >
                <Text style={styles.modalSubmitBtnText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Edit Academics Modal */}
      <Modal visible={!!selectedSubjectToEdit} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Marks & Attendance</Text>
            <Text style={styles.infoRowText}>{selectedSubjectToEdit?.name}</Text>
            <Text style={styles.fieldLabel}>Attendance %</Text>
            <TextInput
              style={styles.modalInput}
              value={editAttendancePct}
              onChangeText={setEditAttendancePct}
              keyboardType="numeric"
            />
            <Text style={styles.fieldLabel}>IA1 Marks</Text>
            <TextInput
              style={styles.modalInput}
              value={editIa1}
              onChangeText={setEditIa1}
              keyboardType="numeric"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setSelectedSubjectToEdit(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleSaveMarksAndAttendance}
              >
                <Text style={styles.modalSubmitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 5. HOD Approval Modal */}
      <Modal visible={!!selectedHodLeaveToApprove} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>HOD Academic Exemption</Text>
            <Text style={styles.infoRowText}>Student: {selectedHodLeaveToApprove?.studentName} ({selectedHodLeaveToApprove?.totalDays} Days)</Text>
            <Text style={styles.fieldLabel}>Official Exemption Reason</Text>
            <TextInput
              style={styles.modalInput}
              value={hodExemptionReason}
              onChangeText={setHodExemptionReason}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setSelectedHodLeaveToApprove(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                onPress={handleConfirmHodApprove}
              >
                <Text style={styles.modalSubmitBtnText}>Approve Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 6. Photo Viewer Modal */}
      <Modal visible={!!selectedPhotoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { padding: 12 }]}>
            <Text style={styles.modalTitle}>{selectedPhotoModal?.title}</Text>
            {selectedPhotoModal?.uri && (
              <Image
                source={{ uri: selectedPhotoModal.uri }}
                style={{ width: '100%', height: 260, borderRadius: 8, marginVertical: 10 }}
                resizeMode="cover"
              />
            )}
            <Text style={styles.infoRowText}>{selectedPhotoModal?.subtitle}</Text>
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalSubmitBtn, { marginTop: 12 }]}
              onPress={() => setSelectedPhotoModal(null)}
            >
              <Text style={styles.modalSubmitBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 7. Room Allotment Execution Modal */}
      <Modal visible={showRoomAllotModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Execute Hostel Room & Bed Allotment</Text>
            <Text style={styles.infoRowText}>Assign room and allocate official hostel residency:</Text>

            <Text style={styles.fieldLabel}>Student USN</Text>
            <TextInput
              style={styles.modalInput}
              value={allotUsn}
              onChangeText={setAllotUsn}
              placeholder="e.g. 1RV22CS089"
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Student Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={allotName}
              onChangeText={setAllotName}
              placeholder="e.g. Aditya Sharma"
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Hostel Block</Text>
                <TextInput
                  style={styles.modalInput}
                  value={allotBlock}
                  onChangeText={setAllotBlock}
                  placeholder="Cauvery Block"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Room & Bed</Text>
                <TextInput
                  style={styles.modalInput}
                  value={allotRoom}
                  onChangeText={setAllotRoom}
                  placeholder="Room B-304"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Hostel Fee Receipt Number</Text>
            <TextInput
              style={styles.modalInput}
              value={allotFeeReceipt}
              onChangeText={setAllotFeeReceipt}
              placeholder="e.g. REC-AIET-2026-9912"
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setShowRoomAllotModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#D97706' }]}
                onPress={handlePerformRoomAllotment}
              >
                <Text style={styles.modalSubmitBtnText}>Confirm Bed Allotment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ========================================================
// CLEAN & SIMPLE STYLES
// ========================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Top Navigation Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  officerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  gatewayTopTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  gatewayTopTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  roleBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  officerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  logoutBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },

  // Role Switcher Tabs
  roleTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  roleTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  roleTabLabelActive: {
    color: '#FFFFFF',
  },
  roleBadgeCount: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  roleBadgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // KPI Row
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },

  // Content Area
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 32,
  },
  viewSection: {
    gap: 12,
  },

  // Sub-tabs Strip
  subTabsStrip: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  subTabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  subTabItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  subTabItemTextActive: {
    color: '#0F172A',
  },

  // Cards List & Item Cards
  cardsList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  cardSubTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardInfoGrid: {
    gap: 2,
    marginTop: 2,
  },
  infoRowText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: '#1E293B',
  },

  // Badges
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Action Buttons inside Cards
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  secondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  // Add Item Button
  addItemBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addItemBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Search & Filter Bars
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  searchSubmitBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  searchSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  backToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToListBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  studentAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  studentAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4F46E5',
  },
  dossierStatsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  dossierStatTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dossierStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  dossierStatLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  detailGrid: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  movementItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 2,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  smallPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  smallPillActive: {
    backgroundColor: '#1E293B',
  },
  smallPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  smallPillTextActive: {
    color: '#FFFFFF',
  },

  // Photo viewer link
  viewPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  viewPhotoText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
  },

  // Subject Table in Academics
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  subjectSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  editSubjectBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editSubjectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // Pass Form in AO
  passTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  passTypeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  passTypeBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  passTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  passTypeBtnTextActive: {
    color: '#0F172A',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 8,
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  devicePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },

  // ========================================================
  // LOGIN SCREEN STYLES
  // ========================================================
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  primaryLoginBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryLoginBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalSubmitBtn: {
    backgroundColor: '#1E293B',
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ========================================================
  // INDEPENDENT GATEWAY DESK SELECTION STYLES
  // ========================================================
  gatewayScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  gatewayHeader: {
    marginBottom: 16,
  },
  gatewayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  gatewayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  gatewayTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  gatewaySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  gatewayGrid: {
    gap: 14,
  },
  gatewayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gatewayCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  gatewayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatewayCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  gatewayCardRoleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  gatewayRolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  gatewayRolePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gatewayCardOfficer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  gatewayCardDept: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  gatewayCardScope: {
    fontSize: 12,
    color: '#475569',
    marginTop: 10,
    lineHeight: 17,
  },
  gatewayCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  gatewayKpiPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
  },
  gatewayKpiPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  gatewayEnterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  gatewayEnterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ========================================================
  // PERFORMANCE & ALLOTMENT ANALYTICS STYLES
  // ========================================================
  perfHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  perfHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perfHeroIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  perfHeroSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  perfAllotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  perfAllotBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  perfProgressWrap: {
    marginTop: 14,
  },
  perfProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  perfProgressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  perfProgressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  perfProgressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  perfProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  perfStatGrid: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  perfStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  perfStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  perfStatLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  perfMetricList: {
    gap: 12,
    marginTop: 8,
  },
  perfMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  perfMetricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  perfMetricTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  perfMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },

  // ========================================================
  // DEDICATED DESK LOGIN SCREEN STYLES
  // ========================================================
  loginScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loginHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 4,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  loginAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  loginRoleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  loginOfficerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  loginDeptText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  loginSecBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  loginSecBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loginCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  loginCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  loginCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  inputBoxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInputWithIcon: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  eyeToggleBtn: {
    padding: 6,
  },
  loginErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  loginErrorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  loginSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
  },
  loginSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickFillBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quickFillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  quickFillTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  quickFillCredText: {
    fontSize: 12,
    color: '#78350F',
    marginTop: 2,
  },
  quickFillBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
    marginTop: 10,
  },
  quickFillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
