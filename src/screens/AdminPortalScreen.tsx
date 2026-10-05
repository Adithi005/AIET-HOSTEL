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
  AlertTriangle,
  AlertCircle,
  Lock,
  RefreshCw,
  LogOut,
  Search,
  Activity,
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
  // Active Desk View
  const [activeRole, setActiveRole] = useState<AdminRole>('AO');

  // Sub-tabs per role
  const [wardenTab, setWardenTab] = useState<'leaves' | 'health' | 'mess'>('leaves');
  const [swoTab, setSwoTab] = useState<'leaves' | 'issues' | 'curfew'>('leaves');
  const [hodTab, setHodTab] = useState<'leaves' | 'academics'>('leaves');
  const [aoTab, setAoTab] = useState<'directory' | 'latecomers' | 'passes' | 'feed'>('directory');

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

  const currentOfficer = ADMIN_CREDENTIALS[activeRole];

  return (
    <SafeAreaView style={styles.container}>
      {/* Clean Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
          activeOpacity={0.7}
        >
          <ChevronLeft size={18} color="#1E293B" />
          <Text style={styles.backBtnText}>Student App</Text>
        </TouchableOpacity>

        <View style={styles.officerPill}>
          <View style={[styles.roleBadgeDot, { backgroundColor: currentOfficer.color }]} />
          <Text style={styles.officerName} numberOfLines={1}>{currentOfficer.adminName} ({activeRole})</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleAdminLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Desk Switcher Tabs (Seamless 1-tap switching) */}
      <View style={styles.roleTabsContainer}>
        {(['AO', 'Warden', 'SWO', 'HOD'] as AdminRole[]).map((r) => {
          const isAct = activeRole === r;
          const conf = ADMIN_CREDENTIALS[r];
          const pendingCount =
            r === 'Warden' ? pendingWarden : r === 'SWO' ? pendingSwo : r === 'HOD' ? pendingHod : 0;

          return (
            <TouchableOpacity
              key={r}
              style={[
                styles.roleTab,
                isAct && { backgroundColor: conf.color, borderColor: conf.color },
              ]}
              onPress={() => setActiveRole(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleTabLabel, isAct && styles.roleTabLabelActive]}>{r} Desk</Text>
              {pendingCount > 0 && (
                <View style={[styles.roleBadgeCount, isAct && { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.roleBadgeCountText, isAct && { color: conf.color }]}>
                    {pendingCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4 Clean Metric Summary Tiles */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{pendingWarden + pendingSwo + pendingHod}</Text>
          <Text style={styles.kpiLabel}>Pending Leaves</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: openGrievancesCount > 0 ? '#D97706' : '#1E293B' }]}>
            {openGrievancesCount}
          </Text>
          <Text style={styles.kpiLabel}>Open Issues</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: activeHealthCount > 0 ? '#EF4444' : '#1E293B' }]}>
            {activeHealthCount}
          </Text>
          <Text style={styles.kpiLabel}>Sick Bay</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: latecomers.length > 0 ? '#EF4444' : '#1E293B' }]}>
            {latecomers.length}
          </Text>
          <Text style={styles.kpiLabel}>Late Check-ins</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================
            VIEW: WARDEN (1–5 Days Leaves & Sick Bay & Mess)
           ======================================================== */}
        {activeRole === 'Warden' && (
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
          </View>
        )}

        {/* ========================================================
            VIEW: SWO (5–8 Days Leaves & Grievances & Curfew)
           ======================================================== */}
        {activeRole === 'SWO' && (
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
          </View>
        )}

        {/* ========================================================
            VIEW: HOD (8–10+ Days Academic Leaves & Marks)
           ======================================================== */}
        {activeRole === 'HOD' && (
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
          </View>
        )}

        {/* ========================================================
            VIEW: AO (Directory, Passes, Latecomers, Chronicle)
           ======================================================== */}
        {activeRole === 'AO' && (
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
});
