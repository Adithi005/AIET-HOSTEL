import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import {
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  ShieldCheck,
  Utensils,
  Wrench,
  QrCode,
  Plus,
  Compass,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Bus,
  User,
  History,
  ChevronRight,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { ApplyOutingModal } from '../components/ApplyOutingModal';
import { ApplyHolidayPassModal } from '../components/ApplyHolidayPassModal';
import { DigitalOutpassModal } from '../components/DigitalOutpassModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { colors } from '../theme/colors';
import { UserProfile, SemesterRecord, LeaveApplication, OutingApplication, StudentNotification } from '../types';
import { StorageService } from '../services/storage';
import { getLeaveEscalationInfo } from '../utils/escalation';
import { getCurfewStatus } from '../utils/curfew';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [academics, setAcademics] = useState<SemesterRecord[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveApplication[]>([]);
  const [outings, setOutings] = useState<OutingApplication[]>([]);
  const [activeOuting, setActiveOuting] = useState<OutingApplication | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [isOutingModalVisible, setIsOutingModalVisible] = useState(false);
  const [isHolidayModalVisible, setIsHolidayModalVisible] = useState(false);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [selectedOutingForPass, setSelectedOutingForPass] = useState<OutingApplication | null>(null);
  const [selectedLeaveForPass, setSelectedLeaveForPass] = useState<LeaveApplication | null>(null);
  const [vehicleStats, setVehicleStats] = useState({ vidyagiriTotal: 0, healthCenterTotal: 0, totalBooked: 0 });

  const { width } = useWindowDimensions();
  const isDesktop = width >= 860;

  const loadData = useCallback(async () => {
    try {
      const userProfile = await StorageService.getProfile();
      const academicRecords = await StorageService.getAcademics();
      const leaves = await StorageService.getMyLeaves();
      const studentOutings = await StorageService.getMyOutings();
      const active = await StorageService.getActiveOuting();
      const notifs = await StorageService.getNotifications(userProfile.usn);
      const vStats = await StorageService.getVehicleStats();

      setProfile(userProfile);
      setAcademics(academicRecords);
      setMyLeaves(leaves);
      setOutings(studentOutings);
      setActiveOuting(active);
      setNotifications(notifs);
      setVehicleStats(vStats);
    } catch (err) {
      console.warn('Load error in HomeScreen', err);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const currentSem = academics.find((s) => s.semester === (profile?.currentSemester || 5)) || academics[4];
  const leavesTaken = profile?.leavesCount || 0;
  const escalation = getLeaveEscalationInfo(leavesTaken);

  // Quick simulation switcher for escalation policy
  const handleSimulateLeaves = async (count: number) => {
    const updated = await StorageService.setLeaveCountForTesting(count);
    setProfile(updated);
    Alert.alert(
      'Leave Count Updated',
      `Leave count set to ${count}. Open Apply Leave to see the approval tier.`
    );
  };

  // Find latest active approved leave with gate token (not closed/returned)
  const latestApprovedLeave = myLeaves.find(
    (l) => l.status === 'Approved' && l.gateToken && !l.checkInTime
  );

  const handleGateExit = async (outingId: string) => {
    await StorageService.markOutingExited(outingId);
    await loadData();
    Alert.alert('Gate Exit Recorded', 'Security guard scan completed. Outpass status updated to Exited Campus.');
  };

  const handleGateReturn = async (outingId: string) => {
    try {
      await StorageService.markOutingReturned(outingId);
      await loadData();
      Alert.alert('Welcome Back', 'Security check-in verified. Outpass closed.');
    } catch (err: any) {
      Alert.alert('Gate Check-In Blocked', err.message || 'Failed to complete check-in.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        profile={profile}
        onProfilePress={() => navigation.navigate('Profile')}
        onAdminPress={() => navigation.navigate('AdminPortal')}
        onNotificationsPress={() => setIsNotifModalVisible(true)}
        unreadNotificationCount={notifications.filter((n) => !n.read).length}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Outing Suspended Disciplinary Warning Card */}
        {profile?.isOutingBlocked && (
          <TouchableOpacity
            style={styles.homeDisciplinaryAlert}
            onPress={() => setIsNotifModalVisible(true)}
            activeOpacity={0.85}
          >
            <ShieldAlert size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.homeDisciplinaryTitle}>⛔ Outings Blocked: Pending SWO Clearance</Text>
              <Text style={styles.homeDisciplinarySub}>
                {profile.outingBlockReason || 'Past late return curfew breach'}. Tap to view disciplinary notice.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Welcome Header */}
        <View style={styles.welcomeBar}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greetingText} numberOfLines={1}>Welcome, {profile?.name || 'Student'}</Text>
            <Text style={styles.subText} numberOfLines={1}>{profile?.branch} • {profile?.academicYear}</Text>
          </View>
          <View style={styles.roomBadge}>
            <Text style={styles.roomBadgeText}>{profile?.roomNumber}</Text>
          </View>
        </View>

        {/* Single Device Policy & Admin Management Strip */}
        <TouchableOpacity
          style={styles.deviceSecurityStrip}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.85}
        >
          <View style={styles.deviceSecurityLeft}>
            <ShieldCheck size={16} color="#0D9488" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.deviceSecurityTitle} numberOfLines={1}>Single-Device Policy Active</Text>
              <Text style={styles.deviceSecuritySub} numberOfLines={1} ellipsizeMode="tail">
                Bound to {profile?.deviceModel || 'Samsung Galaxy S23'} • Handled by Admin
              </Text>
            </View>
          </View>
          <View style={styles.singleDeviceTag}>
            <Text style={styles.singleDeviceTagText}>1 Device Only</Text>
          </View>
        </TouchableOpacity>

        {/* Main Sections: 2-Column Responsive Dashboard on Laptop/Desktop, Sequential on Mobile */}
        {(() => {
          const renderAcademicSection = () => (
            <View style={{ marginBottom: 16 }}>
              <View style={styles.sectionHeadingRow}>
                <GraduationCap size={16} color={colors.primary} />
                <Text style={styles.sectionHeadingText}>IA & Attendance Update (Sem {currentSem?.semester || 5})</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.metricsRow}>
                  {/* Attendance */}
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Overall Attendance</Text>
                    <View style={styles.metricValRow}>
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color:
                              (currentSem?.overallAttendance || 0) >= 75
                                ? colors.successDark
                                : colors.danger,
                          },
                        ]}
                      >
                        {currentSem?.overallAttendance || 87.2}%
                      </Text>
                      <View
                        style={
                          (currentSem?.overallAttendance || 0) >= 75
                            ? styles.tagSuccess
                            : styles.tagDanger
                        }
                      >
                        <Text style={styles.tagText}>
                          {(currentSem?.overallAttendance || 0) >= 75 ? 'Eligible' : 'Shortage'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.metricNote}>Min 75% required</Text>
                  </View>

                  <View style={styles.divider} />

                  {/* IA Score Average */}
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Latest IA Average</Text>
                    <View style={styles.metricValRow}>
                      <Text style={[styles.metricValue, { color: colors.primaryDark }]}>
                        27.4
                      </Text>
                      <Text style={styles.metricOutOf}>/ 30</Text>
                    </View>
                    <Text style={styles.metricNote}>IA-1 & IA-2 recorded</Text>
                  </View>
                </View>

                {/* Simple Subject Quick View */}
                <View style={styles.subjectList}>
                  {currentSem?.subjects.slice(0, 3).map((sub) => (
                    <View key={sub.code} style={styles.subjectRow}>
                      <Text style={styles.subjectName} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <View style={styles.subjectNumbers}>
                        <Text style={styles.iaScoreText}>IA: {sub.ia2}/30</Text>
                        <Text
                          style={[
                            styles.attPercentText,
                            {
                              color:
                                sub.attendancePercentage >= 75
                                  ? colors.successDark
                                  : colors.danger,
                            },
                          ]}
                        >
                          {sub.attendancePercentage}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          );

          const renderLeaveSection = () => (
            <View style={{ marginBottom: 16 }}>
              <View style={styles.sectionHeadingRow}>
                <CalendarDays size={16} color={colors.primary} />
                <Text style={styles.sectionHeadingText}>Hostel Leave</Text>
              </View>

              <View style={styles.leaveCard}>
                <View style={styles.leaveStatsCol}>
                  <Text style={styles.leaveCountLabel}>LEAVES TAKEN</Text>
                  <Text style={styles.leaveCountNumber}>{leavesTaken} Days</Text>
                  <Text style={styles.exemptNoteText}>Govt holidays exempt (0 days)</Text>

                  <View
                    style={[
                      styles.approverBadge,
                      escalation.isExpiredLimit && styles.approverBadgeDanger,
                    ]}
                  >
                    {escalation.isExpiredLimit ? (
                      <AlertTriangle size={12} color={colors.dangerDark} />
                    ) : (
                      <ShieldCheck size={12} color={colors.primary} />
                    )}
                    <Text
                      style={[
                        styles.approverBadgeText,
                        escalation.isExpiredLimit && { color: colors.dangerDark },
                      ]}
                    >
                      {escalation.requiredApprover} Approval
                    </Text>
                  </View>
                </View>

                <View style={styles.applyBtnCol}>
                  <TouchableOpacity
                    style={styles.primaryApplyBtn}
                    onPress={() => setIsLeaveModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.primaryApplyBtnText}>Apply Leave</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryApplyBtn, { backgroundColor: '#10B981', marginTop: 6 }]}
                    onPress={() => setIsHolidayModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Sparkles size={14} color="#FFFFFF" />
                    <Text style={[styles.primaryApplyBtnText, { fontSize: 11 }]}>Govt Holiday Pass</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {latestApprovedLeave && (
                <TouchableOpacity
                  style={styles.activeTokenCard}
                  onPress={() => setSelectedLeaveForPass(latestApprovedLeave)}
                  activeOpacity={0.85}
                >
                  <View style={styles.activeTokenHeaderRow}>
                    <View style={styles.activeTokenStudentRow}>
                      {profile?.avatarUri ? (
                        <Image source={{ uri: profile.avatarUri }} style={styles.tokenAvatarPhoto} />
                      ) : (
                        <View style={styles.tokenAvatarFallback}>
                          <User size={16} color={colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                        <Text style={styles.activeTokenUsn}>USN: {latestApprovedLeave.usn || profile?.usn}</Text>
                      </View>
                    </View>
                    <View style={styles.readyBadge}>
                      <Text style={styles.readyBadgeText}>View Active Pass</Text>
                    </View>
                  </View>

                  <View style={styles.activeTokenDetailsBox}>
                    <Text style={styles.activeTokenTitle}>
                      {latestApprovedLeave.isGovtHoliday ? '🏛️ Holiday Home Pass' : '🏠 Hostel Home Pass'} • Token: {latestApprovedLeave.gateToken}
                    </Text>
                    <Text style={styles.activeTokenTimingText}>
                      OUT: {latestApprovedLeave.startDate} ➔ RETURN: {latestApprovedLeave.endDate}
                    </Text>
                    <Text style={styles.activeTokenBarcodeText}>
                      BARCODE: {latestApprovedLeave.barcode || `*REG-LV-${latestApprovedLeave.usn}*`}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );

          const renderOutingSection = () => (
            <View style={{ marginBottom: 16 }}>
              <View style={styles.sectionHeadingRow}>
                <Compass size={16} color={colors.primary} />
                <Text style={styles.sectionHeadingText}>Hostel Outing & Day Outpass</Text>
              </View>

              <View style={styles.outingCard}>
                <View style={styles.outingHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.outingSectionTitle}>Day & Evening Outing</Text>
                    <Text style={styles.outingCurfewText}>Curfew: 9:00 AM – 4:00 PM (Holiday: 2:00 PM)</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.outingApplyBtn}
                    onPress={() => setIsOutingModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Plus size={15} color="#FFFFFF" />
                    <Text style={styles.outingApplyBtnText}>Apply Outing</Text>
                  </TouchableOpacity>
                </View>

                {/* Active Generated Outing Outpass */}
                {activeOuting ? (
                  <View style={styles.activeOutpassWidget}>
                    <View style={styles.activeOutpassTop}>
                      <View style={styles.outpassBadgeCol}>
                        <Text style={styles.outpassBadgeLabel}>
                          {activeOuting.registrationId || 'ACTIVE GATE OUTPASS'}
                        </Text>
                        <Text style={styles.outpassTokenNumber}>{activeOuting.outpassToken}</Text>
                      </View>

                      <View
                        style={[
                          styles.outpassStatusTag,
                          activeOuting.status === 'Outpass Generated'
                            ? styles.outpassReadyTag
                            : styles.outpassExitedTag,
                        ]}
                      >
                        <Text
                          style={[
                            styles.outpassStatusTagText,
                            activeOuting.status === 'Outpass Generated'
                              ? styles.outpassReadyText
                              : styles.outpassExitedText,
                          ]}
                        >
                          {activeOuting.status === 'Outpass Generated'
                            ? '● Ready to Exit'
                            : '● Outside Campus'}
                        </Text>
                      </View>
                    </View>

                    {/* Student Info with Photo & USN */}
                    <View style={styles.homeWidgetStudentRow}>
                      {profile?.avatarUri ? (
                        <Image source={{ uri: profile.avatarUri }} style={styles.tokenAvatarPhoto} />
                      ) : (
                        <View style={styles.tokenAvatarFallback}>
                          <User size={16} color={colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={styles.activeTokenUsn}>USN: {activeOuting.usn || profile?.usn}</Text>
                      </View>
                    </View>

                    {/* Timing & Destination */}
                    <View style={styles.outpassDetailsRow}>
                      <View style={styles.detailCol}>
                        <Text style={styles.outpassSubLabel}>OUT TIME</Text>
                        <Text style={styles.outpassValText}>
                          {activeOuting.outDate} • {activeOuting.outTime}
                        </Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.outpassSubLabel}>RETURN BY</Text>
                        <Text style={[styles.outpassValText, { color: colors.dangerDark }]}>
                          {activeOuting.outDate} • {activeOuting.expectedInTime}
                        </Text>
                      </View>
                    </View>

                    {/* Active Movement & Gate Check-In/Check-Out Detail */}
                    <View style={styles.homeActiveCheckDetail}>
                      <View style={styles.homeActiveCheckRow}>
                        <Text style={styles.homeActiveCheckLabel}>CAMPUS STATUS:</Text>
                        <Text
                          style={[
                            styles.homeActiveCheckStatus,
                            activeOuting.status === 'Outpass Generated'
                              ? styles.homeStatusInside
                              : styles.homeStatusOutside,
                          ]}
                        >
                          {activeOuting.status === 'Outpass Generated'
                            ? 'Inside Hostel • Ready to Exit'
                            : `Outside Campus • Checked Out at ${activeOuting.checkOutTime || 'Gate'}`}
                        </Text>
                      </View>
                      {(activeOuting.barcode || activeOuting.barcodeNumber) && (
                        <View style={styles.homeBarcodeTagRow}>
                          <Text style={styles.homeBarcodeTagLabel}>BARCODE:</Text>
                          <Text style={styles.homeBarcodeTagVal}>
                            {activeOuting.barcode || activeOuting.barcodeNumber}
                          </Text>
                        </View>
                      )}
                      {activeOuting.movementHistory && activeOuting.movementHistory.length > 0 && (
                        <Text style={styles.homeRecordedLogText}>
                          History: {activeOuting.movementHistory.length} event(s) recorded • Last: {activeOuting.movementHistory[activeOuting.movementHistory.length - 1].action} ({activeOuting.movementHistory[activeOuting.movementHistory.length - 1].timestamp})
                        </Text>
                      )}

                      <TouchableOpacity
                        style={styles.trackHistoryLinkBtn}
                        onPress={() => navigation.navigate('LeaveTab', { initialTab: 'gatelogs' })}
                        activeOpacity={0.8}
                      >
                        <History size={12} color={colors.primary} />
                        <Text style={styles.trackHistoryLinkText}>Track Complete Gate Check-In & Check-Out History →</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Action button inside active widget */}
                    <View style={styles.outpassActionButtons}>
                      <TouchableOpacity
                        style={styles.viewPassBtn}
                        onPress={() => setSelectedOutingForPass(activeOuting)}
                        activeOpacity={0.85}
                      >
                        <QrCode size={14} color="#FFFFFF" />
                        <Text style={styles.viewPassBtnText}>
                          View Active Pass ({activeOuting.outpassToken})
                        </Text>
                      </TouchableOpacity>

                      {/* Cooldown or Curfew notice & Return action */}
                      {activeOuting.status === 'Exited Gate' && (() => {
                        const cooldown = StorageService.getCheckInCooldown(activeOuting);
                        const curfew = getCurfewStatus(activeOuting);
                        return (
                          <View style={{ gap: 8, alignItems: 'flex-start' }}>
                            {curfew.isLate ? (
                              <View style={[styles.homeCooldownBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                <ShieldAlert size={12} color="#DC2626" />
                                <Text style={[styles.homeCooldownText, { color: '#991B1B' }]}>
                                  🚨 Past Curfew Cutoff (+{curfew.minutesPastCurfew}m). Next outing will be blocked.
                                </Text>
                              </View>
                            ) : curfew.isGraceAlert ? (
                              <View style={[styles.homeCooldownBadge, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                                <AlertTriangle size={12} color="#D97706" />
                                <Text style={[styles.homeCooldownText, { color: '#92400E' }]}>
                                  ⚠️ Curfew grace period ending at {curfew.graceEndTime}. Return immediately!
                                </Text>
                              </View>
                            ) : null}

                            {cooldown.isRestricted && (
                              <View style={styles.homeCooldownBadge}>
                                <Clock size={11} color="#B45309" />
                                <Text style={styles.homeCooldownText}>
                                  Re-entry locked for next 15 min ({cooldown.remainingFormatted} left)
                                </Text>
                              </View>
                            )}
                            <TouchableOpacity
                              style={[styles.quickReturnBtn, cooldown.isRestricted && styles.quickReturnBtnLocked]}
                              onPress={() => {
                                if (cooldown.isRestricted) {
                                  Alert.alert(
                                    '⏳ Gate Check-In Locked (15-Min Policy)',
                                    `Student checked out at ${activeOuting.checkOutTime || 'recently'}.\n\nHostel policy requires a 15-minute cooldown before re-entry.\n\nTime remaining: ${cooldown.remainingFormatted} (Eligible at ${cooldown.allowedCheckInTime}).`
                                  );
                                  return;
                                }
                                handleGateReturn(activeOuting.id);
                              }}
                              activeOpacity={0.85}
                            >
                              <Text style={[styles.quickReturnBtnText, cooldown.isRestricted && styles.quickReturnBtnTextLocked]}>
                                {cooldown.isRestricted ? `Locked (${cooldown.remainingFormatted})` : 'Mark Returned'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                ) : (
                  <View style={styles.noActiveOutingBox}>
                    <Text style={styles.noActiveOutingText}>
                      No active outing outpass. Apply for an outing to generate an instant digital gate pass with QR code for town visits, market, or study.
                    </Text>
                  </View>
                )}

                {/* Recent Outings Mini Strip */}
                {outings.length > 0 && (
                  <View style={styles.recentOutingsContainer}>
                    <Text style={styles.recentOutingsHeading}>RECENT OUTING PASSES</Text>
                    {outings.slice(0, 2).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.recentOutingRow}
                        onPress={() => setSelectedOutingForPass(item)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recentOutingDest} numberOfLines={1}>
                            {item.destination} ({item.outingType})
                          </Text>
                          <Text style={styles.recentOutingSub}>
                            {item.outDate} • {item.outTime} - {item.expectedInTime}
                          </Text>
                        </View>
                        <View style={styles.recentOutingRight}>
                          <Text style={styles.recentOutingToken}>{item.outpassToken}</Text>
                          <Text style={styles.recentOutingStatus}>{item.status}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Gate Movement Tracking Banner Card */}
                <TouchableOpacity
                  style={styles.gateHistoryBannerRow}
                  onPress={() => navigation.navigate('LeaveTab', { initialTab: 'gatelogs' })}
                  activeOpacity={0.85}
                >
                  <View style={styles.gateHistoryBannerLeft}>
                    <View style={styles.gateHistoryIconBadge}>
                      <History size={16} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gateHistoryBannerTitle}>Track Check-In & Check-Out History</Text>
                      <Text style={styles.gateHistoryBannerSub}>View live gate scanner logs, campus exit & return timings</Text>
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          );

          const renderAlertsAndSimBar = () => (
            <View style={{ marginBottom: 16 }}>
              {escalation.isExpiredLimit && (
                <View style={styles.alertCard}>
                  <AlertTriangle size={16} color="#991B1B" />
                  <Text style={styles.alertCardText}>
                    Limitation of leave is expired! Further leave requires medical document and Principal approval.
                  </Text>
                </View>
              )}

              <View style={styles.simBar}>
                <Text style={styles.simBarLabel}>Simulate Leaves for Testing:</Text>
                <View style={styles.simButtonsRow}>
                  <TouchableOpacity
                    style={[styles.simButton, leavesTaken === 3 && styles.simActive]}
                    onPress={() => handleSimulateLeaves(3)}
                  >
                    <Text style={styles.simText}>3 (Warden)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.simButton, leavesTaken === 6 && styles.simActive]}
                    onPress={() => handleSimulateLeaves(6)}
                  >
                    <Text style={styles.simText}>6 (SWO)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.simButton, leavesTaken === 9 && styles.simActive]}
                    onPress={() => handleSimulateLeaves(9)}
                  >
                    <Text style={styles.simText}>9 (HOD/AO)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.simButton, leavesTaken === 11 && styles.simActiveDanger]}
                    onPress={() => handleSimulateLeaves(11)}
                  >
                    <Text style={[styles.simText, leavesTaken === 11 && { color: '#FFF' }]}>
                      11 (&gt;10 Expired)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );

          const renderVehicleTransitSection = () => (
            <View style={{ marginBottom: 16 }}>
              <TouchableOpacity
                style={styles.vehicleTransitCard}
                onPress={() => navigation.navigate('GrievanceTab', { initialTab: 'vehicles' })}
                activeOpacity={0.88}
              >
                <View style={styles.vehicleTransitHeader}>
                  <View style={styles.vehicleTransitIconWrap}>
                    <Bus size={18} color="#0D9488" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.vehicleTransitTitle}>Hostel Care • Vehicle Booking</Text>
                    <Text style={styles.vehicleTransitSub} numberOfLines={1}>
                      Eco • TT • Mini Bus • Bus | Book ≥15m before departure
                    </Text>
                  </View>
                  <ArrowRight size={16} color="#0D9488" />
                </View>

                <View style={styles.vehicleStatsGrid}>
                  <View style={styles.vehicleStatBox}>
                    <Text style={styles.vehicleStatNum}>{vehicleStats.vidyagiriTotal}</Text>
                    <Text style={styles.vehicleStatLabel}>Going Vidyagiri</Text>
                  </View>
                  <View style={styles.vehicleStatDivider} />
                  <View style={styles.vehicleStatBox}>
                    <Text style={[styles.vehicleStatNum, { color: '#DC2626' }]}>{vehicleStats.healthCenterTotal}</Text>
                    <Text style={styles.vehicleStatLabel}>Health Center Care</Text>
                  </View>
                  <View style={styles.vehicleStatDivider} />
                  <View style={styles.vehicleStatBox}>
                    <Text style={[styles.vehicleStatNum, { color: colors.primary }]}>{vehicleStats.totalBooked}</Text>
                    <Text style={styles.vehicleStatLabel}>Total In Transit</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );

          const renderShortcutsSection = () => (
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={styles.shortcutCard}
                onPress={() => navigation.navigate('MessTab')}
                activeOpacity={0.85}
              >
                <Utensils size={18} color="#D97706" />
                <Text style={styles.shortcutTitle}>Today's Mess</Text>
                <Text style={styles.shortcutSub}>View Meals & Review</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutCard}
                onPress={() => navigation.navigate('GrievanceTab', { initialTab: 'maintenance' })}
                activeOpacity={0.85}
              >
                <Wrench size={18} color={colors.primary} />
                <Text style={styles.shortcutTitle}>Hostel Care</Text>
                <Text style={styles.shortcutSub}>Room Maintenance</Text>
              </TouchableOpacity>
            </View>
          );

          if (isDesktop) {
            return (
              <View style={styles.desktopColumnsRow}>
                <View style={styles.desktopColLeft}>
                  {renderAcademicSection()}
                  {renderVehicleTransitSection()}
                  {renderShortcutsSection()}
                </View>
                <View style={styles.desktopColRight}>
                  {renderLeaveSection()}
                  {renderOutingSection()}
                  {renderAlertsAndSimBar()}
                </View>
              </View>
            );
          }

          return (
            <>
              {renderAcademicSection()}
              {renderLeaveSection()}
              {renderOutingSection()}
              {renderAlertsAndSimBar()}
              {renderVehicleTransitSection()}
              {renderShortcutsSection()}
            </>
          );
        })()}
      </ScrollView>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        visible={isLeaveModalVisible}
        leavesCount={leavesTaken}
        onClose={() => setIsLeaveModalVisible(false)}
        onSubmitSuccess={() => loadData()}
        onApplyLeave={async (params) => {
          const res = await StorageService.applyLeave(params);
          if (res.leave.status === 'Approved' && res.leave.gateToken) {
            setSelectedLeaveForPass(res.leave);
          }
          return res;
        }}
      />

      {/* Apply Outing Modal */}
      <ApplyOutingModal
        visible={isOutingModalVisible}
        profile={profile}
        onClose={() => setIsOutingModalVisible(false)}
        onSubmitSuccess={(newOuting) => {
          loadData();
          setSelectedOutingForPass(newOuting);
        }}
        onApplyOuting={async (params) => {
          return await StorageService.applyOuting(params);
        }}
      />

      {/* Digital Outpass Viewer Modal (Outings) */}
      <DigitalOutpassModal
        visible={!!selectedOutingForPass}
        outing={selectedOutingForPass}
        profile={profile}
        onClose={() => setSelectedOutingForPass(null)}
        onGateExit={async (id) => {
          await handleGateExit(id);
          const updated = await StorageService.getActiveOuting();
          setSelectedOutingForPass(updated);
        }}
        onGateReturn={async (id) => {
          await handleGateReturn(id);
          setSelectedOutingForPass(null);
        }}
      />

      {/* Digital Outpass Viewer Modal (Leaves) */}
      <DigitalOutpassModal
        visible={!!selectedLeaveForPass}
        leave={selectedLeaveForPass}
        profile={profile}
        onClose={() => setSelectedLeaveForPass(null)}
        onGateExit={async (id) => {
          await StorageService.markLeaveExited(id);
          await loadData();
          const leaves = await StorageService.getMyLeaves();
          setSelectedLeaveForPass(leaves.find((l) => l.id === id) || null);
        }}
        onGateReturn={async (id) => {
          try {
            await StorageService.markLeaveReturned(id);
            await loadData();
            setSelectedLeaveForPass(null);
          } catch (err: any) {
            Alert.alert('Gate Check-In Blocked', err.message || 'Failed to complete check-in.');
          }
        }}
      />

      {/* Apply Holiday Pass Modal */}
      <ApplyHolidayPassModal
        visible={isHolidayModalVisible}
        profile={profile}
        onClose={() => setIsHolidayModalVisible(false)}
        onApplyHolidayOutpass={async (params) => {
          return await StorageService.applyHolidayOutpass(params);
        }}
        onApplyHolidayHomepass={async (params) => {
          return await StorageService.applyHolidayHomepass(params);
        }}
        onSuccessOutpass={(newOuting) => {
          loadData();
          setSelectedOutingForPass(newOuting);
        }}
        onSuccessHomepass={(newLeave) => {
          loadData();
          setSelectedLeaveForPass(newLeave);
        }}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={isNotifModalVisible}
        notifications={notifications}
        onClose={() => setIsNotifModalVisible(false)}
        onMarkAllRead={async () => {
          if (profile?.usn) {
            await StorageService.markNotificationsAsRead(profile.usn);
            await loadData();
          }
        }}
        onClearAll={async () => {
          if (profile?.usn) {
            await StorageService.clearNotifications(profile.usn);
            await loadData();
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  homeDisciplinaryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  homeDisciplinaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  homeDisciplinarySub: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
    lineHeight: 15,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
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
  desktopColumnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    width: '100%',
  },
  desktopColLeft: {
    flex: 1.05,
    minWidth: 0,
  },
  desktopColRight: {
    flex: 0.95,
    minWidth: 0,
  },
  welcomeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  roomBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 6,
  },
  sectionHeadingText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: '75%',
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  metricOutOf: {
    fontSize: 12,
    color: colors.textMuted,
  },
  tagSuccess: {
    backgroundColor: colors.successSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagDanger: {
    backgroundColor: colors.dangerSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
  },
  metricNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  subjectList: {
    marginTop: 8,
    gap: 6,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  subjectName: {
    fontSize: 11,
    color: colors.text,
    flex: 1,
  },
  subjectNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iaScoreText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  attPercentText: {
    fontSize: 11,
    fontWeight: '700',
    width: 38,
    textAlign: 'right',
  },
  leaveCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leaveStatsCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  leaveCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  leaveCountNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.primaryDark,
    marginVertical: 2,
  },
  approverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  approverBadgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  approverBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 1,
  },
  applyBtnCol: {
    marginLeft: 4,
    flexShrink: 0,
  },
  primaryApplyBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
  },
  primaryApplyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  activeTokenCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  activeTokenHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeTokenStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tokenAvatarPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  tokenAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTokenStudentName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  activeTokenUsn: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  activeTokenDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  activeTokenTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  activeTokenTimingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  activeTokenBarcodeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  homeWidgetStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  readyBadge: {
    backgroundColor: colors.successSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.successDark,
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertCardText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
    lineHeight: 14,
  },
  simBar: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  simBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  simButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  simButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  simActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  simActiveDanger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  simText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  shortcutSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  deviceSecurityStrip: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceSecurityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deviceSecurityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  deviceSecuritySub: {
    fontSize: 10,
    color: '#115E59',
    marginTop: 1,
  },
  singleDeviceTag: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  singleDeviceTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  exemptNoteText: {
    fontSize: 10,
    color: colors.successDark,
    fontWeight: '600',
    marginBottom: 4,
  },
  outingCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  outingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  outingSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  outingCurfewText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    marginTop: 2,
  },
  outingApplyBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  outingApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activeOutpassWidget: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 10,
  },
  activeOutpassTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  outpassBadgeCol: {},
  outpassBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  outpassTokenNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  outpassStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  outpassReadyTag: {
    backgroundColor: '#DCFCE7',
  },
  outpassExitedTag: {
    backgroundColor: '#FEF3C7',
  },
  outpassStatusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  outpassReadyText: {
    color: '#15803D',
  },
  outpassExitedText: {
    color: '#B45309',
  },
  outpassDetailsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 10,
  },
  detailCol: {
    flex: 1,
  },
  outpassSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  outpassValText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  homeActiveCheckDetail: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  homeActiveCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  homeActiveCheckLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  homeActiveCheckStatus: {
    fontSize: 10,
    fontWeight: '800',
  },
  homeStatusInside: {
    color: '#15803D',
  },
  homeStatusOutside: {
    color: '#B45309',
  },
  homeBarcodeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  homeBarcodeTagLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  homeBarcodeTagVal: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  homeRecordedLogText: {
    fontSize: 9,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  outpassActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewPassBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewPassBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickExitBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickExitBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickReturnBtn: {
    backgroundColor: colors.successDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickReturnBtnLocked: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  quickReturnBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickReturnBtnTextLocked: {
    color: '#92400E',
  },
  homeCooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 5,
  },
  homeCooldownText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  noActiveOutingBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  noActiveOutingText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  recentOutingsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  recentOutingsHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  recentOutingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentOutingDest: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  recentOutingSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  recentOutingRight: {
    alignItems: 'flex-end',
  },
  recentOutingToken: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  recentOutingStatus: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  vehicleTransitCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    padding: 14,
    marginBottom: 14,
  },
  vehicleTransitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  vehicleTransitIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTransitTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  vehicleTransitSub: {
    fontSize: 11,
    color: '#115E59',
    marginTop: 1,
  },
  vehicleStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  vehicleStatBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleStatNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0D9488',
  },
  vehicleStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  vehicleStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  trackHistoryLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingVertical: 3,
  },
  trackHistoryLinkText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  gateHistoryBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 10,
    marginTop: 8,
  },
  gateHistoryBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  gateHistoryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateHistoryBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  gateHistoryBannerSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
