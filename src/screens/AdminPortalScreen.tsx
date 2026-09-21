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
} from 'react-native';
import {
  ShieldAlert,
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
  UserCheck,
  AlertTriangle,
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
} from '../types';
import { StorageService } from '../services/storage';
import { BarcodeView } from '../components/BarcodeView';
import { calculateLeaveSessionDays } from '../utils/leaveTiming';

export const AdminPortalScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  // 4 Primary Roles: AO (Master Activities) | Warden (1-5d & Health) | SWO (5-8d & Issues) | HOD (8-10d & Academics)
  const [activeRole, setActiveRole] = useState<AdminRole>('AO');

  // Sub-tabs per role
  const [aoSubTab, setAoSubTab] = useState<'feed' | 'gate' | 'emergency' | 'duplicate_coupon' | 'directory'>('feed');
  const [wardenSubTab, setWardenSubTab] = useState<'leaves' | 'health'>('leaves');
  const [swoSubTab, setSwoSubTab] = useState<'leaves' | 'issues' | 'clearance'>('leaves');
  const [blockedStudents, setBlockedStudents] = useState<any[]>([]);
  const [hodSubTab, setHodSubTab] = useState<'leaves' | 'academics'>('leaves');

  // Main data collections
  const [allLeaves, setAllLeaves] = useState<LeaveApplication[]>([]);
  const [allGrievances, setAllGrievances] = useState<GrievanceTicket[]>([]);
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

  // AO Duplicate Coupon Issuance State
  const [couponUsn, setCouponUsn] = useState('1RV22CS089');
  const [couponStartDate, setCouponStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [couponStartSession, setCouponStartSession] = useState<'Morning' | 'Evening'>('Evening');
  const [couponEndDate, setCouponEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [couponReturnSession, setCouponReturnSession] = useState<'Morning' | 'Evening'>('Morning');
  const [couponLeaveType, setCouponLeaveType] = useState<LeaveApplication['leaveType']>('Home Visit');
  const [couponReason, setCouponReason] = useState('Late Leave Application - Urgent Home Visit');
  const [couponDestination, setCouponDestination] = useState('Home');
  const [couponRemarks, setCouponRemarks] = useState('AO Discretionary Duplicate Coupon sanctioned overriding 2-day 5 PM cutoff.');
  const [isIssuingCoupon, setIsIssuingCoupon] = useState(false);
  const [lastIssuedCouponPass, setLastIssuedCouponPass] = useState<LeaveApplication | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      const leaves = await StorageService.getAllLeavesAdmin();
      const grievances = await StorageService.getAllGrievancesAdmin();
      const stdList = await StorageService.getAllStudents();
      const logs = await StorageService.getGateLogs();
      const regs = await StorageService.getAllRegistrations();
      const health = await StorageService.getHealthLogs();
      const feed = await StorageService.getMasterActivityFeed();
      const acads = await StorageService.getAcademics();

      setAllLeaves(leaves);
      setAllGrievances(grievances);
      setStudents(stdList);
      setGateLogs(logs);
      setRegistrations(regs);
      setHealthLogs(health);
      setActivityFeed(feed);
      setAcademics(acads);
      const blocked = await StorageService.getBlockedOutingStudents();
      setBlockedStudents(blocked);

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

  // SWO Late Outing Permit Action
  const handleSwoPermitOuting = async (usn: string) => {
    try {
      const res = await StorageService.swoPermitOuting(
        usn,
        'Dr. Suresh Babu (SWO)',
        'Cleared by Student Welfare Officer for subsequent day outings.'
      );
      await loadAdminData();
      Alert.alert('✅ Outing Privilege Restored', res.message);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not grant clearance.');
    }
  };

  // Leave Actions: Role-based sanctioning
  const handleWardenApprove = async (leaveId: string) => {
    await StorageService.wardenApproveLeave(leaveId, 'Mr. R. K. Gowda (Warden)', 'Sanctioned by Warden (1-5 Days Tier). Gate token active.');
    await loadAdminData();
    Alert.alert('✅ Leave Sanctioned by Warden', 'Approved under 1–5 days jurisdiction. Gate pass barcode generated.');
  };

  const handleWardenReject = async (leaveId: string) => {
    await StorageService.wardenRejectLeave(leaveId, 'Mr. R. K. Gowda (Warden)', 'Rejected by Warden due to disciplinary/attendance grounds.');
    await loadAdminData();
    Alert.alert('Leave Rejected', 'Application marked as Rejected by Warden.');
  };

  const handleSwoApprove = async (leaveId: string) => {
    await StorageService.swoApproveLeave(leaveId, 'Dr. Suresh Babu (SWO)', 'Sanctioned by Student Welfare Officer (5-8 Days Tier). Welfare verified.');
    await loadAdminData();
    Alert.alert('✅ Leave Sanctioned by SWO', 'Approved under 5–8 days jurisdiction. Gate token active.');
  };

  const handleSwoReject = async (leaveId: string) => {
    await StorageService.swoRejectLeave(leaveId, 'Dr. Suresh Babu (SWO)', 'Rejected by SWO after student welfare review.');
    await loadAdminData();
    Alert.alert('Leave Rejected', 'Application marked as Rejected by SWO.');
  };

  const handleHodApprove = async (leaveId: string) => {
    await StorageService.hodApproveLeave(leaveId, 'Dr. M. K. Sridhar (HOD CSE)', 'Sanctioned by Head of Department with academic attendance exemption.');
    await loadAdminData();
    Alert.alert('✅ Academic Leave Sanctioned by HOD', 'Approved under 8–10+ days jurisdiction. Academic exemption recorded.');
  };

  const handleHodReject = async (leaveId: string) => {
    await StorageService.hodRejectLeave(leaveId, 'Dr. M. K. Sridhar (HOD CSE)', 'Rejected by HOD due to internal assessment test schedule.');
    await loadAdminData();
    Alert.alert('Leave Rejected', 'Application marked as Rejected by HOD.');
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
      '✅ Health Room Entry Logged',
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
      '✅ Student Discharged',
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
      '✅ Attendance & IA Marks Updated',
      `Academic records for ${selectedSubjectToEdit.name} saved. Overall semester attendance updated.`
    );
  };

  // Barcode Check-In / Check-Out
  const handleBarcodeCheckInOut = async (barcodeOrId: string, action: 'Check Out' | 'Check In') => {
    try {
      const res = await StorageService.checkInOutByBarcode(barcodeOrId, action, 'Security Guard Ramu', 'Campus Main Gate 1');
      if (res.success) {
        Alert.alert(`✅ Gate ${action} Successful`, res.message);
        if (res.dossier) {
          setStudentDossier(res.dossier);
        } else {
          const fresh = await StorageService.getStudentScanDossier(barcodeOrId);
          if (fresh) setStudentDossier(fresh);
        }
        await loadAdminData();
      } else {
        Alert.alert(action === 'Check In' ? '⛔ Gate Check-In Blocked' : 'Scan Result', res.message);
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
    Alert.alert('⛔ Single Device Policy Enforced', `Login Attempt Blocked for ${studentName}!\n\n${result.message}`);
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
        '🚨 Emergency Leave Granted!',
        `Digital Outpass Token: ${grantedLeave.gateToken}\nRegistration: ${grantedLeave.registrationId}\n\nStudent: ${grantedLeave.studentName} (${grantedLeave.usn})\nDestination: ${grantedLeave.destination}\nDuration: ${grantedLeave.startDate} to ${grantedLeave.endDate} (${grantedLeave.totalDays} Days)\n\n✅ The approved emergency pass and digital barcode are now live on the student's page and available for security gate departure.`
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
        endDate: couponEndDate.trim(),
        returnSession: couponReturnSession,
        leaveType: couponLeaveType,
        reason: couponReason.trim(),
        destination: couponDestination.trim(),
        remarks: couponRemarks.trim(),
        aoOfficerName: 'Administrative Officer (AO)',
      });

      setLastIssuedCouponPass(pass);
      await loadAdminData();

      Alert.alert(
        '🎫 AO Duplicate Coupon Issued!',
        `Coupon Number: ${pass.duplicateCouponNumber}\nGate Token: ${pass.gateToken}\nRegistration: ${pass.registrationId}\n\nStudent: ${pass.studentName} (${pass.usn})\nDates: ${pass.startDate} (${pass.startSession}) to ${pass.endDate} (${pass.returnSession})\nCharged Quota: ${pass.chargedDays} Days\n\n✅ The approved Duplicate Coupon and Barcode are now active on the student's portal.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to issue duplicate coupon.');
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

  // Low attendance check (< 75%)
  const lowAttendanceSubjects: Array<{ sem: number; sub: any }> = [];
  academics.forEach((sem) => {
    sem.subjects.forEach((s) => {
      if (s.attendancePercentage < 75) {
        lowAttendanceSubjects.push({ sem: sem.semester, sub: s });
      }
    });
  });

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
          <View>
            <Text style={styles.adminTitle}>AIETNEST Multi-Role Administration</Text>
            <Text style={styles.adminSub}>A connected home for every AIET hosteller • Command Center</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.switchRoleBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs'))}
        >
          <Text style={styles.switchRoleText}>← Student View</Text>
        </TouchableOpacity>
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
      <View style={styles.roleTabsRow}>
        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'AO' && styles.roleTabBtnActiveAO]}
          onPress={() => setActiveRole('AO')}
        >
          <View style={styles.roleTabIconWrap}>
            <Text style={styles.roleTabEmoji}>👑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleTabTitle, activeRole === 'AO' && styles.roleTabTitleActive]}>AO Desk</Text>
            <Text style={styles.roleTabSub}>All Activities ({activityFeed.length})</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'Warden' && styles.roleTabBtnActiveWarden]}
          onPress={() => setActiveRole('Warden')}
        >
          <View style={styles.roleTabIconWrap}>
            <Text style={styles.roleTabEmoji}>🛡️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.roleTabTitle, activeRole === 'Warden' && styles.roleTabTitleActive]}>Warden</Text>
              {pendingWarden > 0 && <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{pendingWarden}</Text></View>}
            </View>
            <Text style={styles.roleTabSub}>1-5d & Health ({activeHealthCases.length})</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'SWO' && styles.roleTabBtnActiveSWO]}
          onPress={() => setActiveRole('SWO')}
        >
          <View style={styles.roleTabIconWrap}>
            <Text style={styles.roleTabEmoji}>🤝</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.roleTabTitle, activeRole === 'SWO' && styles.roleTabTitleActive]}>SWO</Text>
              {pendingSwo > 0 && <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{pendingSwo}</Text></View>}
            </View>
            <Text style={styles.roleTabSub}>5-8d & Issues ({openGrievances.length})</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleTabBtn, activeRole === 'HOD' && styles.roleTabBtnActiveHOD]}
          onPress={() => setActiveRole('HOD')}
        >
          <View style={styles.roleTabIconWrap}>
            <Text style={styles.roleTabEmoji}>🎓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.roleTabTitle, activeRole === 'HOD' && styles.roleTabTitleActive]}>HOD</Text>
              {pendingHod > 0 && <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{pendingHod}</Text></View>}
            </View>
            <Text style={styles.roleTabSub}>8-10d & Marks</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Scroll Content */}
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* =======================================================
            SECTION 1: AO (ADMINISTRATIVE OFFICER) - MASTER OVERSIGHT
           ======================================================= */}
        {activeRole === 'AO' && (
          <View style={styles.sectionContainer}>
            {/* AO Authority Banner */}
            <View style={styles.roleBannerAO}>
              <Text style={styles.roleBannerTitle}>👑 AO Master Oversight & Institutional Chronicle</Text>
              <Text style={styles.roleBannerSub}>
                Unified surveillance consolidating Gate Scans, Multi-Tier Leave Sanctions (Warden/SWO/HOD), Sick Bay & Hospital Cases, Hostel Grievances, and Academic Marks.
              </Text>
            </View>

            {/* Sub-Tabs for AO */}
            <View style={styles.subTabsRow}>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'feed' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('feed')}
              >
                <Activity size={13} color={aoSubTab === 'feed' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'feed' && styles.subTabBtnTextActive]}>
                  Live Activities ({activityFeed.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'gate' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('gate')}
              >
                <QrCode size={13} color={aoSubTab === 'gate' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'gate' && styles.subTabBtnTextActive]}>
                  Gate Scanner & Dossier
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'emergency' && styles.subTabBtnActiveEmergency]}
                onPress={() => setAoSubTab('emergency')}
              >
                <ShieldAlert size={13} color={aoSubTab === 'emergency' ? '#DC2626' : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'emergency' && styles.subTabBtnTextActiveEmergency]}>
                  Grant Emergency
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'duplicate_coupon' && styles.subTabBtnActiveCoupon]}
                onPress={() => setAoSubTab('duplicate_coupon')}
              >
                <Ticket size={13} color={aoSubTab === 'duplicate_coupon' ? '#D97706' : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'duplicate_coupon' && styles.subTabBtnTextActiveCoupon]}>
                  Duplicate Coupon
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, aoSubTab === 'directory' && styles.subTabBtnActive]}
                onPress={() => setAoSubTab('directory')}
              >
                <Users size={13} color={aoSubTab === 'directory' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, aoSubTab === 'directory' && styles.subTabBtnTextActive]}>
                  Students & Devices ({students.length})
                </Text>
              </TouchableOpacity>
            </View>

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
                          <Text style={styles.dossierBlockedTitle}>⛔ NEXT OUTING PRIVILEGES SUSPENDED</Text>
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

            {/* AO SUB-TAB 3: STUDENT DIRECTORY & SINGLE DEVICE POLICY */}
            {aoSubTab === 'directory' && (
              <View style={{ gap: 12 }}>
                <View style={styles.securityPolicyCard}>
                  <View style={styles.shieldHeader}>
                    <Lock size={16} color="#0F766E" />
                    <Text style={styles.shieldTitle}>Single Device Authorization Security</Text>
                  </View>
                  <Text style={styles.shieldDesc}>
                    Institutional compliance: Students are bound to exactly 1 authenticated smartphone. Second device logins are immediately blocked at the server.
                  </Text>
                </View>

                {students.map((std) => (
                  <View key={std.usn} style={styles.adminCard}>
                    <View style={styles.adminCardHeader}>
                      <View>
                        <Text style={styles.studentNameFull}>{std.name} ({std.usn})</Text>
                        <Text style={styles.studentSub}>Room {std.roomNumber} • {std.branch}</Text>
                      </View>
                      <View style={styles.deviceActiveBadge}>
                        <Text style={styles.deviceActiveText}>1 Device Active</Text>
                      </View>
                    </View>

                    <View style={styles.deviceDetailsBox}>
                      <Smartphone size={18} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.deviceModelText}>{std.deviceModel}</Text>
                        <Text style={styles.deviceIdText}>Bound ID: {std.activeDeviceId}</Text>
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
                    </View>
                  </View>
                ))}
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
                      Emergency Leave Sanctioned for <Text style={{ fontWeight: '800' }}>{lastGrantedEmergencyPass.studentName}</Text> ({lastGrantedEmergencyPass.usn}).
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
                      ✅ Student Notification dispatched. Security Main Gate terminal synchronized for departure.
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
                            <Text style={styles.historyStudentText}>{l.studentName} ({l.usn})</Text>
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

            {/* AO SUB-TAB 5: DUPLICATE COUPON & LATE LEAVE ISSUANCE DESK */}
            {aoSubTab === 'duplicate_coupon' && (
              <View style={{ gap: 14 }}>
                {/* Authority Banner */}
                <View style={styles.couponRoleBanner}>
                  <View style={styles.couponBannerHeader}>
                    <View style={styles.couponIconBadge}>
                      <Ticket size={22} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.couponBannerTitle}>AO Duplicate Coupon & Late Leave Issuance Desk</Text>
                      <Text style={styles.couponBannerSub}>
                        Institutional Policy: Applications must be submitted 2 days before 5:00 PM. If hostellers miss this cutoff, the Administrative Officer (AO) has exclusive authority to generate an authorized Duplicate Coupon (COUPON-XXXXX) overriding the deadline.
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

                  {/* Session Selector Row */}
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>DEPARTURE SESSION *</Text>
                      <View style={styles.couponSessionPillRow}>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponStartSession === 'Morning' && styles.couponSessionPillActive]}
                          onPress={() => setCouponStartSession('Morning')}
                        >
                          <Text style={[styles.couponSessionPillText, couponStartSession === 'Morning' && styles.couponSessionPillTextActive]}>
                            🌅 Morning
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponStartSession === 'Evening' && styles.couponSessionPillActive]}
                          onPress={() => setCouponStartSession('Evening')}
                        >
                          <Text style={[styles.couponSessionPillText, couponStartSession === 'Evening' && styles.couponSessionPillTextActive]}>
                            🌇 Evening
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>RETURN SESSION *</Text>
                      <View style={styles.couponSessionPillRow}>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponReturnSession === 'Morning' && styles.couponSessionPillActive]}
                          onPress={() => setCouponReturnSession('Morning')}
                        >
                          <Text style={[styles.couponSessionPillText, couponReturnSession === 'Morning' && styles.couponSessionPillTextActive]}>
                            🌅 Morning
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.couponSessionPill, couponReturnSession === 'Evening' && styles.couponSessionPillActive]}
                          onPress={() => setCouponReturnSession('Evening')}
                        >
                          <Text style={[styles.couponSessionPillText, couponReturnSession === 'Evening' && styles.couponSessionPillTextActive]}>
                            🌇 Evening
                          </Text>
                        </TouchableOpacity>
                      </View>
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
                              🌇 Evening Departure: Day 1 ({couponStartDate}) excluded from quota count (counting starts next day).
                            </Text>
                          </View>
                        )}
                        {calc.isWeekendExempt && (
                          <View style={[styles.calcNoticeBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                            <Text style={[styles.calcNoticeText, { color: '#92400E' }]}>
                              🏖️ Saturday PM – Monday AM Weekend Exemption: 0 Days charged to quota (AO Approval).
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
                      {isIssuingCoupon ? 'Issuing Duplicate Coupon...' : 'Issue Duplicate Coupon & Generate Pass'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Last Issued Coupon Display */}
                {lastIssuedCouponPass && (
                  <View style={styles.lastGrantedCouponCard}>
                    <View style={styles.lastGrantedHeader}>
                      <View style={styles.grantedBadgeCoupon}>
                        <CheckCircle2 size={14} color="#B45309" />
                        <Text style={styles.grantedBadgeCouponText}>AO DUPLICATE COUPON LIVE ON STUDENT PAGE</Text>
                      </View>
                      <Text style={styles.grantedCouponNumberText}>{lastIssuedCouponPass.duplicateCouponNumber}</Text>
                    </View>

                    <Text style={styles.grantedSummaryText}>
                      Duplicate Coupon Sanctioned for <Text style={{ fontWeight: '800' }}>{lastIssuedCouponPass.studentName}</Text> ({lastIssuedCouponPass.usn}).
                    </Text>
                    <Text style={styles.grantedSubText}>
                      Gate Token: <Text style={{ fontWeight: '700' }}>{lastIssuedCouponPass.gateToken}</Text> • Departure: {lastIssuedCouponPass.startDate} ({lastIssuedCouponPass.startSession}) ➔ Return: {lastIssuedCouponPass.endDate} ({lastIssuedCouponPass.returnSession}) • Quota: {lastIssuedCouponPass.chargedDays} Days
                    </Text>

                    <View style={styles.grantedBarcodeBox}>
                      <BarcodeView
                        value={lastIssuedCouponPass.barcode || `*${lastIssuedCouponPass.registrationId}*`}
                        label={`COUPON BARCODE: ${lastIssuedCouponPass.barcode}`}
                        height={46}
                      />
                    </View>
                    <Text style={styles.grantedNoticeFooter}>
                      ✅ Duplicate coupon notification dispatched to student. Security Main Gate synchronized for departure.
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
                            <Text style={styles.historyStudentText}>{l.studentName} ({l.usn})</Text>
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
            SECTION 2: WARDEN - 1-5 DAYS LEAVES & SICK BAY TRACKER
           ======================================================= */}
        {activeRole === 'Warden' && (
          <View style={styles.sectionContainer}>
            {/* Warden Authority Banner */}
            <View style={styles.roleBannerWarden}>
              <Text style={styles.roleBannerTitle}>🛡️ Hostel Warden Desk (1–5 Days Leaves & Sick Bay Care)</Text>
              <Text style={styles.roleBannerSub}>
                Authorized to sanction 1 to 5 days student leaves, and manage all unwell hostel residents: log Health Room bed rest vs Hospital referrals, doctor prescriptions, and complete check-in/out history.
              </Text>
            </View>

            {/* Sub-Tabs for Warden */}
            <View style={styles.subTabsRow}>
              <TouchableOpacity
                style={[styles.subTabBtn, wardenSubTab === 'leaves' && styles.subTabBtnActive]}
                onPress={() => setWardenSubTab('leaves')}
              >
                <CalendarDays size={13} color={wardenSubTab === 'leaves' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, wardenSubTab === 'leaves' && styles.subTabBtnTextActive]}>
                  1–5 Days Leaves ({wardenLeaves.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, wardenSubTab === 'health' && styles.subTabBtnActive]}
                onPress={() => setWardenSubTab('health')}
              >
                <HeartPulse size={13} color={wardenSubTab === 'health' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.subTabBtnText, wardenSubTab === 'health' && styles.subTabBtnTextActive]}>
                  Sick Bay & Hospital ({activeHealthCases.length} Active)
                </Text>
              </TouchableOpacity>
            </View>

            {/* WARDEN SUB-TAB 1: 1-5 DAYS LEAVES SANCTIONING */}
            {wardenSubTab === 'leaves' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Leaves Under Warden Sanction (1 to 5 Days)</Text>
                {wardenLeaves.map((leave) => (
                  <View key={leave.id} style={styles.adminCard}>
                    <View style={styles.adminCardHeader}>
                      <View>
                        <Text style={styles.studentNameFull}>{leave.studentName} ({leave.usn})</Text>
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
                          <Text style={styles.approveBtnText}>Sanction Leave & Issue Token</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleWardenReject(leave.id)}>
                          <XCircle size={14} color={colors.danger} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* WARDEN SUB-TAB 2: HEALTH ROOM & HOSPITAL CARE TRACKER */}
            {wardenSubTab === 'health' && (
              <View style={{ gap: 14 }}>
                {/* Health Action Bar */}
                <View style={styles.healthActionBar}>
                  <View>
                    <Text style={styles.healthActionTitle}>Hostel Health Room & Hospital Care</Text>
                    <Text style={styles.healthActionSub}>Sick Bay Bed Rest, Doctor Visits, & Hospitalization Registry</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addHealthBtn}
                    onPress={() => setShowHealthModal(true)}
                  >
                    <Plus size={15} color="#FFFFFF" />
                    <Text style={styles.addHealthBtnText}>+ Log Sick Student</Text>
                  </TouchableOpacity>
                </View>

                {/* Health Overview Cards */}
                <View style={styles.healthStatsRow}>
                  <View style={styles.healthStatCard}>
                    <Text style={[styles.healthStatVal, { color: '#D97706' }]}>
                      {healthLogs.filter((h) => h.status === 'Resting in Health Room').length}
                    </Text>
                    <Text style={styles.healthStatLbl}>In Sick Bay</Text>
                  </View>
                  <View style={styles.healthStatCard}>
                    <Text style={[styles.healthStatVal, { color: '#DC2626' }]}>
                      {healthLogs.filter((h) => h.status === 'Referred to Hospital').length}
                    </Text>
                    <Text style={styles.healthStatLbl}>In Hospital</Text>
                  </View>
                  <View style={styles.healthStatCard}>
                    <Text style={[styles.healthStatVal, { color: colors.success }]}>
                      {healthLogs.filter((h) => h.status === 'Discharged / Recovered').length}
                    </Text>
                    <Text style={styles.healthStatLbl}>Discharged</Text>
                  </View>
                </View>

                {/* Active Health Room / Hospital Cases */}
                <Text style={styles.sectionTitle}>Active Cases (Currently Unwell & Missing College)</Text>
                {activeHealthCases.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardText}>No students currently admitted in sick bay or hospital.</Text>
                  </View>
                ) : (
                  activeHealthCases.map((caseItem) => (
                    <View key={caseItem.id} style={styles.activeHealthCard}>
                      <View style={styles.activeHealthHeader}>
                        <View>
                          <Text style={styles.studentNameFull}>{caseItem.studentName} ({caseItem.usn})</Text>
                          <Text style={styles.studentSub}>Room {caseItem.roomNumber} • {caseItem.hostelBlock}</Text>
                        </View>
                        <View
                          style={[
                            styles.healthStatusTag,
                            caseItem.status === 'Referred to Hospital' ? styles.healthTagHospital : styles.healthTagSickBay,
                          ]}
                        >
                          <Text style={styles.healthStatusTagText}>
                            {caseItem.status === 'Referred to Hospital' ? '🏥 HOSPITAL' : '🛌 SICK BAY'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.healthDetailBox}>
                        <Text style={styles.healthDetailLine}>
                          <Text style={{ fontWeight: '700' }}>Diagnosis: </Text>
                          {caseItem.symptomsOrDiagnosis}
                        </Text>
                        <Text style={styles.healthDetailLine}>
                          <Text style={{ fontWeight: '700' }}>Location: </Text>
                          {caseItem.location}{caseItem.hospitalName ? ` (${caseItem.hospitalName})` : ''}
                        </Text>
                        {caseItem.doctorName && (
                          <Text style={styles.healthDetailLine}>
                            <Text style={{ fontWeight: '700' }}>Doctor: </Text>
                            {caseItem.doctorName}
                          </Text>
                        )}
                        {caseItem.prescribedMedicines && (
                          <Text style={styles.healthDetailLine}>
                            <Text style={{ fontWeight: '700' }}>Medicines: </Text>
                            {caseItem.prescribedMedicines}
                          </Text>
                        )}
                        <Text style={styles.healthDetailLine}>
                          <Text style={{ fontWeight: '700' }}>Admitted At: </Text>
                          {caseItem.checkInTime}
                        </Text>
                      </View>

                      <View style={styles.guardianStatusRow}>
                        <View
                          style={[
                            styles.guardianDot,
                            caseItem.guardianIntimated ? { backgroundColor: colors.success } : { backgroundColor: colors.danger },
                          ]}
                        />
                        <Text style={styles.guardianStatusText}>
                          {caseItem.guardianIntimated ? 'Parent / Guardian Intimated via Phone' : 'Guardian Intimation Pending'}
                        </Text>
                      </View>

                      {caseItem.remarks && (
                        <Text style={styles.healthRemarksText}>"{caseItem.remarks}"</Text>
                      )}

                      {/* Health Actions for Warden */}
                      <View style={styles.healthCardActions}>
                        <TouchableOpacity
                          style={styles.dischargeBtn}
                          onPress={() => setSelectedHealthToDischarge(caseItem)}
                        >
                          <CheckCircle2 size={14} color="#FFFFFF" />
                          <Text style={styles.dischargeBtnText}>Discharge / Check Out Student</Text>
                        </TouchableOpacity>

                        {caseItem.status === 'Resting in Health Room' && (
                          <TouchableOpacity
                            style={styles.transferHospitalBtn}
                            onPress={() => handleTransferToHospital(caseItem)}
                          >
                            <Stethoscope size={14} color="#DC2626" />
                            <Text style={styles.transferHospitalText}>Refer to Hospital</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                )}

                {/* Complete Health Room Check-In & Check-Out History */}
                <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Health Room & Hospital Care History (Discharged)</Text>
                {healthLogs
                  .filter((h) => h.status === 'Discharged / Recovered')
                  .map((log) => (
                    <View key={log.id} style={styles.healthHistoryCard}>
                      <View style={styles.healthHistoryHeader}>
                        <Text style={styles.healthHistoryName}>{log.studentName} ({log.usn})</Text>
                        <View style={styles.recoveredBadge}>
                          <Text style={styles.recoveredBadgeText}>DISCHARGED & RECOVERED</Text>
                        </View>
                      </View>

                      <Text style={styles.healthHistoryDates}>
                        Check-in: {log.checkInTime} ➔ Check-out: {log.checkOutTime || 'Cleared'}
                      </Text>
                      <Text style={styles.healthHistoryDiagnosis}>Diagnosis: {log.symptomsOrDiagnosis}</Text>
                      <Text style={styles.healthHistoryDoctor}>Treated by: {log.doctorName || 'Hostel Physician'}</Text>
                      {log.remarks && (
                        <Text style={styles.healthHistoryRemarks}>"{log.remarks}"</Text>
                      )}
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}

        {/* =======================================================
            SECTION 3: SWO - 5-8 DAYS LEAVES & HOSTEL ISSUES
           ======================================================= */}
        {activeRole === 'SWO' && (
          <View style={styles.sectionContainer}>
            {/* SWO Authority Banner */}
            <View style={styles.roleBannerSWO}>
              <Text style={styles.roleBannerTitle}>🤝 SWO Student Welfare Desk (5–8 Days Leaves & Hostel Grievances)</Text>
              <Text style={styles.roleBannerSub}>
                Authorized to sanction 5 to 8 days leaves following welfare verification, and manage all hostel grievances: plumbing, electrical, Wi-Fi, housekeeping, and staff dispatch.
              </Text>
            </View>

            {/* Sub-Tabs for SWO */}
            <View style={styles.subTabsRow}>
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
            </View>

            {/* SWO SUB-TAB 1: 5-8 DAYS LEAVES */}
            {swoSubTab === 'leaves' && (
              <View style={{ gap: 12 }}>
                <Text style={styles.sectionTitle}>Leaves Under SWO Sanction (5 to 8 Days)</Text>
                {swoLeaves.map((leave) => (
                  <View key={leave.id} style={styles.adminCard}>
                    <View style={styles.adminCardHeader}>
                      <View>
                        <Text style={styles.studentNameFull}>{leave.studentName} ({leave.usn})</Text>
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
              <Text style={styles.roleBannerTitle}>🎓 Head of Department (HOD) Academic Desk</Text>
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
                        <Text style={styles.studentNameFull}>{leave.studentName} ({leave.usn})</Text>
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
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleHodApprove(leave.id)}>
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
                        {st === 'Resting in Health Room' ? '🛌 Sick Bay' : '🏥 Hospital'}
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
  },
  adminHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  adminBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  adminTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  adminSub: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  switchRoleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
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
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  roleTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
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
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
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
});
