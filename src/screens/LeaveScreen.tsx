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
  Image,
} from 'react-native';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  Plus,
  ArrowRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  LogIn,
  LogOut,
  Lock,
  Compass,
  MapPin,
  Landmark,
  Sparkles,
  Gift,
  Ticket,
  User,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { ExtendLeaveModal } from '../components/ExtendLeaveModal';
import { ApplyOutingModal } from '../components/ApplyOutingModal';
import { DigitalOutpassModal } from '../components/DigitalOutpassModal';
import { ApplyHolidayPassModal } from '../components/ApplyHolidayPassModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { colors } from '../theme/colors';
import {
  UserProfile,
  LeaveApplication,
  OutingApplication,
  StudentNotification,
  GateLogEntry,
} from '../types';
import { StorageService } from '../services/storage';
import { getLeaveEscalationInfo } from '../utils/escalation';
import { GOVT_HOLIDAYS } from '../utils/holidays';
import { CURFEW_CONFIG, getCurfewStatus } from '../utils/curfew';

export const LeaveScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myLeaves, setMyLeaves] = useState<LeaveApplication[]>([]);
  const [myOutings, setMyOutings] = useState<OutingApplication[]>([]);
  const [myGateLogs, setMyGateLogs] = useState<GateLogEntry[]>([]);
  const [gateFilter, setGateFilter] = useState<'all' | 'Check Out' | 'Check In'>('all');
  const [activeTab, setActiveTab] = useState<'outings' | 'leaves' | 'gatelogs' | 'holidays'>(
    route?.params?.initialTab || 'outings'
  );
  const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
  const [isOutingModalVisible, setIsOutingModalVisible] = useState(false);
  const [isHolidayModalVisible, setIsHolidayModalVisible] = useState(false);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [selectedLeaveForExtend, setSelectedLeaveForExtend] = useState<LeaveApplication | null>(null);
  const [selectedOutingForPass, setSelectedOutingForPass] = useState<OutingApplication | null>(null);
  const [selectedLeaveForPass, setSelectedLeaveForPass] = useState<LeaveApplication | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await StorageService.getProfile();
      const l = await StorageService.getMyLeaves();
      const outs = await StorageService.getMyOutings();
      const logs = await StorageService.getMyGateLogs(p.usn);
      const notifs = await StorageService.getNotifications(p.usn);
      setProfile(p);
      setMyLeaves(l);
      setMyOutings(outs);
      setMyGateLogs(logs);
      setNotifications(notifs);
    } catch (err) {
      console.warn('Error loading student history', err);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const leavesTaken = profile?.leavesCount || 0;
  const escalation = getLeaveEscalationInfo(leavesTaken);

  // Quick helper to test approval & instant token generation on pending leaves
  const handleSimulateApprove = async (leaveId: string) => {
    await StorageService.approveLeave(leaveId);
    await loadData();
    Alert.alert('Leave Approved', 'Gate Pass Token generated successfully.');
  };

  const handleGateExit = async (outingId: string) => {
    await StorageService.markOutingExited(outingId);
    await loadData();
    Alert.alert('Gate Exit Recorded', 'Security guard scan verified. Status: Exited Campus.');
  };

  const handleGateReturn = async (outingId: string) => {
    try {
      await StorageService.markOutingReturned(outingId);
      await loadData();
      Alert.alert('Welcome Back', 'Security check-in verified. Outpass closed.');
    } catch (err: any) {
      Alert.alert('Gate Check-In Blocked', err.message || 'Failed to record check-in.');
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
        {/* Outing Suspended Disciplinary Banner */}
        {profile?.isOutingBlocked && (
          <View style={styles.disciplinaryBlockBanner}>
            <ShieldAlert size={22} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.disciplinaryBlockTitle}>⛔ Next Outing Blocked by SWO</Text>
              <Text style={styles.disciplinaryBlockText}>
                {profile.outingBlockReason || 'Late return curfew violation'}.
                {'\n'}Your subsequent outings are suspended. Please report to the Student Welfare Officer (SWO) for clearance.
              </Text>
            </View>
          </View>
        )}

        {/* Student History Header Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.studentBadgeRow}>
                <Text style={styles.studentNameHeader}>{profile?.name || 'Logged-in Student'}</Text>
                <View style={styles.usnTag}>
                  <Text style={styles.usnTagText}>{profile?.usn || '1RV22CS089'}</Text>
                </View>
              </View>
              <Text style={styles.exemptNoticeSub}>
                View all your approved outings and leave records
              </Text>
            </View>

            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => {
                if (activeTab === 'outings') {
                  setIsOutingModalVisible(true);
                } else if (activeTab === 'leaves') {
                  setIsApplyModalVisible(true);
                } else {
                  setIsHolidayModalVisible(true);
                }
              }}
              activeOpacity={0.85}
            >
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.applyBtnText}>
                {activeTab === 'outings'
                  ? 'Apply Outing'
                  : activeTab === 'leaves'
                  ? 'Apply Leave'
                  : 'Apply Pass'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Simple alert if limitation expired */}
          {escalation.isExpiredLimit && activeTab === 'leaves' && (
            <View style={styles.alertNotice}>
              <ShieldAlert size={16} color="#991B1B" />
              <Text style={styles.alertNoticeText}>
                Leave limit reached (over 10 days). Requires medical proof and Principal approval.
              </Text>
            </View>
          )}
        </View>

        {/* Tab Toggle: 4 Sections (Outing History, Leave History, Check In/Out Gate Logs, Govt Holidays) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabToggleRowScroll}
          style={styles.tabToggleRowWrapper}
        >
          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'outings' && styles.tabToggleActive]}
            onPress={() => setActiveTab('outings')}
            activeOpacity={0.8}
          >
            <Compass
              size={14}
              color={activeTab === 'outings' ? colors.primary : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabToggleText,
                activeTab === 'outings' && styles.tabToggleTextActive,
              ]}
            >
              Outings ({myOutings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'leaves' && styles.tabToggleActive]}
            onPress={() => setActiveTab('leaves')}
            activeOpacity={0.8}
          >
            <CalendarDays
              size={14}
              color={activeTab === 'leaves' ? colors.primary : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabToggleText,
                activeTab === 'leaves' && styles.tabToggleTextActive,
              ]}
            >
              Leaves ({myLeaves.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'gatelogs' && styles.tabToggleActive]}
            onPress={() => setActiveTab('gatelogs')}
            activeOpacity={0.8}
          >
            <History
              size={14}
              color={activeTab === 'gatelogs' ? colors.primary : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabToggleText,
                activeTab === 'gatelogs' && styles.tabToggleTextActive,
              ]}
            >
              Check In / Out ({myGateLogs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'holidays' && styles.tabToggleActive]}
            onPress={() => setActiveTab('holidays')}
            activeOpacity={0.8}
          >
            <Sparkles
              size={14}
              color={activeTab === 'holidays' ? '#6366F1' : colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.tabToggleText,
                activeTab === 'holidays' && { color: '#6366F1', fontWeight: '800' },
              ]}
            >
              Holidays
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* =======================================================
            SECTION 1: HOSTEL OUTINGS & DAY OUTPASSES
           ======================================================= */}
        {activeTab === 'outings' && (
          <View style={styles.cardsList}>
            {/* Outing Top Bar */}
            <View style={styles.outingNoticeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.outingNoticeTitle}>Hostel Outing History</Text>
                <Text style={styles.outingNoticeSub}>Sundays (9 AM – 4 PM) & Govt Holidays (9 AM – 2 PM) only</Text>
              </View>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setIsOutingModalVisible(true)}
                activeOpacity={0.85}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.applyBtnText}>Apply Outing</Text>
              </TouchableOpacity>
            </View>

            {myOutings.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Compass size={36} color={colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No Outing History</Text>
                <Text style={styles.emptyStateSub}>
                  You have not applied for any hostel outings yet.
                </Text>
                <TouchableOpacity
                  style={styles.emptyApplyBtn}
                  onPress={() => setIsOutingModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.emptyApplyBtnText}>Apply Outing</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myOutings.map((outing) => (
                <View key={outing.id} style={styles.leaveCard}>
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.cardId}>{outing.outpassToken}</Text>
                      <Text style={styles.cardType}>{outing.outingType}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        outing.status === 'Outpass Generated'
                          ? styles.statusPillApproved
                          : outing.status === 'Exited Gate'
                          ? styles.statusPillPending
                          : styles.statusPillClosed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          outing.status === 'Outpass Generated'
                            ? styles.statusApprovedText
                            : outing.status === 'Exited Gate'
                            ? styles.statusPendingText
                            : styles.statusClosedText,
                        ]}
                      >
                        {outing.status === 'Outpass Generated'
                          ? '● Ready to Exit'
                          : outing.status === 'Exited Gate'
                          ? '● Outside Campus'
                          : '● Returned'}
                      </Text>
                    </View>
                  </View>

                  {/* Student Info with Photo & USN */}
                  <View style={styles.cardStudentInfoRow}>
                    {profile?.avatarUri ? (
                      <Image source={{ uri: profile.avatarUri }} style={styles.cardAvatarPhoto} />
                    ) : (
                      <View style={styles.cardAvatarFallback}>
                        <User size={13} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={styles.cardStudentUsn}>USN: {outing.usn || profile?.usn}</Text>
                    </View>
                  </View>

                  {/* Registration ID & Barcode Tag */}
                  <View style={styles.regIdBadge}>
                    <Text style={styles.regIdText}>REG: {outing.registrationId || `REG-${outing.id}`}</Text>
                    <Text style={styles.regIdBarcode}>{outing.barcode || `*REG-${outing.id}*`}</Text>
                  </View>

                  {/* Clean Dedicated Date & Time Entry Box */}
                  <View style={styles.entryTimingBox}>
                    <View style={styles.entryTimingCol}>
                      <Text style={styles.entryTimingLabelOut}>OUT (DEPARTURE)</Text>
                      <Text style={styles.entryTimingDate}>{outing.outDate}</Text>
                      <Text style={styles.entryTimingTime}>{outing.outTime}</Text>
                      {outing.checkOutTime && (
                        <Text style={styles.entryGateTime}>Exit Scan: {outing.checkOutTime}</Text>
                      )}
                    </View>

                    <View style={styles.entryTimingDivider} />

                    <View style={styles.entryTimingCol}>
                      <Text style={styles.entryTimingLabelIn}>IN (RETURN / CURFEW)</Text>
                      <Text style={styles.entryTimingDate}>{outing.outDate}</Text>
                      <Text style={[styles.entryTimingTime, { color: '#DC2626' }]}>
                        {outing.expectedInTime}
                      </Text>
                      {outing.checkInTime ? (
                        <Text style={[styles.entryGateTime, { color: '#059669' }]}>
                          Return Scan: {outing.checkInTime}
                        </Text>
                      ) : (
                        <Text style={styles.entryCurfewNotice}>
                          {outing.isGovtHolidayOuting ? 'Curfew: 2:00 PM' : 'Curfew: 4:00 PM'}
                        </Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.reasonText}>
                    <Text style={{ fontWeight: '700' }}>Destination: </Text>{outing.destination}
                  </Text>
                  <Text style={[styles.reasonText, { marginTop: 2 }]}>
                    <Text style={{ fontWeight: '700' }}>Purpose: </Text>{outing.purpose}
                  </Text>

                  {/* Actions / Closed Indicator */}
                  {outing.status !== 'Returned & Closed' ? (
                    <View style={styles.outingActionRow}>
                      <TouchableOpacity
                        style={styles.viewPassBtn}
                        onPress={() => setSelectedOutingForPass(outing)}
                        activeOpacity={0.85}
                      >
                        <QrCode size={13} color="#FFFFFF" />
                        <Text style={styles.viewPassBtnText}>View Active Pass</Text>
                      </TouchableOpacity>

                      {outing.status === 'Exited Gate' && (
                        <View style={styles.exitedGateTag}>
                          <Clock size={12} color="#D97706" />
                          <Text style={styles.exitedGateTagText}>
                            Exited Gate • Outside Campus
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.closedHistoryEntryTag}>
                      <CheckCircle2 size={12} color="#059669" />
                      <Text style={styles.closedHistoryEntryText}>
                        Returned on {outing.checkInTime || outing.outDate} • Pass Closed
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* =======================================================
            SECTION 2: HOSTEL EXTENDED & HOME LEAVES
           ======================================================= */}
        {activeTab === 'leaves' && (
          <View style={styles.cardsList}>
            {/* Leaves Top Bar */}
            <View style={styles.outingNoticeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.outingNoticeTitle}>Hostel Leave History</Text>
                <Text style={styles.outingNoticeSub}>
                  Apply 2 days before 5 PM • Quota: {leavesTaken} Days
                </Text>
              </View>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setIsApplyModalVisible(true)}
                activeOpacity={0.85}
              >
                <Plus size={15} color="#FFFFFF" />
                <Text style={styles.applyBtnText}>Apply Leave</Text>
              </TouchableOpacity>
            </View>

            {myLeaves.length === 0 ? (
              <View style={styles.emptyStateCard}>
                <CalendarDays size={36} color={colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No Leave History</Text>
                <Text style={styles.emptyStateSub}>
                  You have not applied for any hostel leaves yet. Tap Apply Leave to submit a request.
                </Text>
                <TouchableOpacity
                  style={styles.emptyApplyBtn}
                  onPress={() => setIsApplyModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Plus size={14} color="#FFFFFF" />
                  <Text style={styles.emptyApplyBtnText}>Apply Leave</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myLeaves.map((leave) => (
                <View key={leave.id} style={styles.leaveCard}>
                  <View style={styles.cardTopRow}>
                    <View>
                      <Text style={styles.cardId}>{leave.id}</Text>
                      <Text style={styles.cardType}>{leave.leaveType}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        leave.status === 'Approved'
                          ? styles.statusPillApproved
                          : styles.statusPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          leave.status === 'Approved'
                            ? styles.statusApprovedText
                            : styles.statusPendingText,
                        ]}
                      >
                        {leave.status}
                      </Text>
                    </View>
                  </View>

                  {/* Student Info with Photo & USN */}
                  <View style={styles.cardStudentInfoRow}>
                    {profile?.avatarUri ? (
                      <Image source={{ uri: profile.avatarUri }} style={styles.cardAvatarPhoto} />
                    ) : (
                      <View style={styles.cardAvatarFallback}>
                        <User size={13} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={styles.cardStudentUsn}>USN: {leave.usn || profile?.usn}</Text>
                    </View>
                  </View>

                  {/* Registration ID & Barcode Tag */}
                  <View style={styles.regIdBadge}>
                    <Text style={styles.regIdText}>REG: {leave.registrationId || `REG-${leave.id}`}</Text>
                    <Text style={styles.regIdBarcode}>{leave.barcode || `*REG-${leave.id}*`}</Text>
                  </View>

                  {/* Government Holiday Exemption & Auto-Approval Tags */}
                  {leave.isGovtHoliday && (
                    <View style={styles.govtExemptTag}>
                      <Landmark size={12} color="#15803D" />
                      <Text style={styles.govtExemptTagText}>
                        Govt Holiday: {leave.holidayName || 'Holiday'} (0 Days Quota)
                      </Text>
                    </View>
                  )}

                  {leave.isAutoApproved && (
                    <View style={styles.autoApproveTag}>
                      <Sparkles size={12} color="#0D9488" />
                      <Text style={styles.autoApproveTagText}>
                        Auto-Sanctioned (Going Home Outpass)
                      </Text>
                    </View>
                  )}

                  {leave.isEmergency && (
                    <View style={styles.emergencyTag}>
                      <ShieldAlert size={12} color="#DC2626" />
                      <Text style={styles.emergencyTagText}>
                        🚨 Emergency Leave Pass
                      </Text>
                    </View>
                  )}

                  {(leave.isCompensationPass || leave.isDuplicateCoupon) && (
                    <View style={styles.couponTag}>
                      <Ticket size={12} color="#D97706" />
                      <Text style={styles.couponTagText}>
                        🎫 AO Compensation Pass #{leave.compensationPassNumber || leave.duplicateCouponNumber || 'Sanctioned'}
                      </Text>
                    </View>
                  )}

                  {leave.isWeekendExempt && (
                    <View style={styles.weekendExemptTag}>
                      <Text style={styles.weekendExemptTagText}>
                        🏖️ Weekend Pass (No leave quota used)
                      </Text>
                    </View>
                  )}

                  {/* Clean Dedicated Date & Time Entry Box */}
                  <View style={styles.entryTimingBox}>
                    <View style={styles.entryTimingCol}>
                      <Text style={styles.entryTimingLabelOut}>FROM (DEPARTURE)</Text>
                      <Text style={styles.entryTimingDate}>{leave.startDate}</Text>
                      <Text style={styles.entryTimingTime}>
                        {leave.departureTime || (leave.startSession === 'Evening' ? '05:00 PM (Evening)' : '09:00 AM (Morning)')}
                      </Text>
                      {leave.checkOutTime && (
                        <Text style={styles.entryGateTime}>Exit Scan: {leave.checkOutTime}</Text>
                      )}
                    </View>

                    <View style={styles.entryTimingDivider} />

                    <View style={styles.entryTimingCol}>
                      <Text style={styles.entryTimingLabelIn}>TO (RETURN)</Text>
                      <Text style={styles.entryTimingDate}>{leave.endDate}</Text>
                      <Text style={[styles.entryTimingTime, { color: '#DC2626' }]}>
                        {leave.expectedReturnTime || (leave.returnSession === 'Evening' ? '06:00 PM (Evening)' : '08:30 AM (Morning)')}
                      </Text>
                      {leave.checkInTime ? (
                        <Text style={[styles.entryGateTime, { color: '#059669' }]}>
                          Return Scan: {leave.checkInTime}
                        </Text>
                      ) : (
                        <Text style={styles.entryCurfewNotice}>
                          {leave.totalDays} Days {leave.isGovtHoliday ? '• 0 Quota' : ''}
                        </Text>
                      )}
                    </View>
                  </View>

                  {leave.destination && (
                    <Text style={styles.reasonText}>
                      <Text style={{ fontWeight: '700' }}>Destination: </Text>{leave.destination}
                    </Text>
                  )}
                  <Text style={styles.reasonText}>Reason: {leave.reason}</Text>

                  {/* Gate Return Completed / Closed State */}
                  {leave.checkInTime ? (
                    <View style={styles.closedHistoryEntryTag}>
                      <CheckCircle2 size={12} color="#059669" />
                      <Text style={styles.closedHistoryEntryText}>
                        Returned on {leave.checkInTime} • Leave Completed
                      </Text>
                    </View>
                  ) : leave.status === 'Approved' ? (
                    <View style={styles.tokenSection}>
                      <View style={styles.tokenBox}>
                        <View style={styles.tokenLeft}>
                          <QrCode size={22} color={colors.primary} />
                          <View>
                            <Text style={styles.tokenLabel}>GATE PASS TOKEN</Text>
                            <Text style={styles.tokenNumber}>
                              {leave.gateToken || 'TK-84920'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.gateVerifiedTag}>
                          <CheckCircle2 size={12} color={colors.successDark} />
                          <Text style={styles.gateVerifiedText}>Ready at Gate</Text>
                        </View>
                      </View>

                      {leave.isExtended && (
                        <View style={styles.extendedNotice}>
                          <Text style={styles.extendedNoticeText}>
                            Extended by +{leave.extendedDays} days: "{leave.extensionReason}"
                          </Text>
                        </View>
                      )}

                      <View style={styles.leaveActionsRow}>
                        <TouchableOpacity
                          style={styles.viewPassBtn}
                          onPress={() => setSelectedLeaveForPass(leave)}
                          activeOpacity={0.85}
                        >
                          <QrCode size={13} color="#FFFFFF" />
                          <Text style={styles.viewPassBtnText}>View Active Pass</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.extendBtn}
                          onPress={() => setSelectedLeaveForExtend(leave)}
                          activeOpacity={0.85}
                        >
                          <Plus size={13} color={colors.primary} />
                          <Text style={styles.extendBtnText}>Extend</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {/* Pending State */}
                  {leave.status === 'Pending' && (
                    <View style={styles.pendingActionRow}>
                      <Text style={styles.pendingHint}>
                        Awaiting {leave.requiredApprover} sanction
                      </Text>
                      <TouchableOpacity
                        style={styles.quickApproveBtn}
                        onPress={() => handleSimulateApprove(leave.id)}
                      >
                        <Text style={styles.quickApproveText}>Simulate Approval</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* =======================================================
            SECTION 3: DEDICATED GOVERNMENT HOLIDAY SECTION
           ======================================================= */}
        {activeTab === 'holidays' && (
          <View style={styles.cardsList}>
            {/* Header Banner */}
            <View style={styles.holidaySectionBanner}>
              <View style={styles.holidayBannerHeader}>
                <View style={styles.holidayBannerIconBadge}>
                  <Sparkles size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.holidayBannerTitle}>Government & Institutional Holidays</Text>
                  <Text style={styles.holidayBannerSub}>
                    Separate dedicated portal for holiday outpasses and auto-approved homepasses with 0 quota deduction.
                  </Text>
                </View>
              </View>
            </View>

            {/* TWO DEDICATED PASS OPTIONS */}
            <View style={styles.holidayOptionsRow}>
              {/* Option 1: Holiday Outpass */}
              <View style={styles.holidayOptionCard}>
                <View style={styles.holidayOptHeader}>
                  <View style={[styles.optIconBadge, { backgroundColor: '#EEF2FF' }]}>
                    <Compass size={18} color="#6366F1" />
                  </View>
                  <View style={styles.optPill}>
                    <Text style={styles.optPillText}>09:00 AM – 02:00 PM</Text>
                  </View>
                </View>
                <Text style={styles.optTitle}>Holiday Outpass</Text>
                <Text style={styles.optDesc}>
                  Day outing during declared holiday. Curfew is strictly 02:00 PM. Grace alert window: 02:00 PM – 02:30 PM.
                </Text>
                <View style={styles.optWarningBox}>
                  <Text style={styles.optWarningText}>
                    ⚠️ Late return after 02:30 PM blocks subsequent outings until SWO approval.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.optApplyBtn, { backgroundColor: '#6366F1' }]}
                  onPress={() => setIsHolidayModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optApplyBtnText}>Apply Holiday Outpass</Text>
                </TouchableOpacity>
              </View>

              {/* Option 2: Holiday Homepass */}
              <View style={styles.holidayOptionCard}>
                <View style={styles.holidayOptHeader}>
                  <View style={[styles.optIconBadge, { backgroundColor: '#ECFDF5' }]}>
                    <Sparkles size={18} color="#10B981" />
                  </View>
                  <View style={[styles.optPill, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.optPillText, { color: '#065F46' }]}>0 Quota Deduction</Text>
                  </View>
                </View>
                <Text style={styles.optTitle}>Holiday Homepass</Text>
                <Text style={styles.optDesc}>
                  Festival & official institutional break pass. Pre-authorized instant gate pass auto-generated upon application.
                </Text>
                <View style={[styles.optWarningBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.optWarningText, { color: '#047857' }]}>
                    ⚡ 100% exempt from personal leave limit. Instant barcode issued.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.optApplyBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => setIsHolidayModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.optApplyBtnText}>Apply Holiday Homepass</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Active & Past Holiday Passes List */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionDividerTitle}>My Holiday Passes & Tokens</Text>
            </View>

            {myOutings.filter((o) => o.isGovtHolidayOuting).length === 0 &&
            myLeaves.filter((l) => l.isGovtHoliday || l.leaveType === 'Home Visit').length === 0 ? (
              <View style={styles.emptyStateCard}>
                <Sparkles size={32} color={colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No Holiday Passes Generated Yet</Text>
                <Text style={styles.emptyStateSub}>
                  Use the options above to apply for a 9 AM – 2 PM Holiday Outpass or an instant Homepass.
                </Text>
              </View>
            ) : (
              <>
                {myOutings
                  .filter((o) => o.isGovtHolidayOuting)
                  .map((outing) => (
                    <View key={outing.id} style={styles.leaveCard}>
                      <View style={styles.leaveCardHeader}>
                        <View style={styles.leaveCardTitleBox}>
                          <View style={styles.cardTypeRow}>
                            <View style={[styles.categoryBadge, { backgroundColor: '#EEF2FF' }]}>
                              <Compass size={11} color="#6366F1" />
                              <Text style={[styles.categoryBadgeText, { color: '#6366F1' }]}>
                                Govt Holiday Outpass
                              </Text>
                            </View>
                            <View style={styles.statusPillApproved}>
                              <Text style={styles.statusPillTextApproved}>{outing.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.leaveReasonText}>
                            {outing.destination} • {outing.purpose}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.leaveDatesRow}>
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>OUTING DATE</Text>
                          <Text style={styles.dateColVal}>{outing.outDate}</Text>
                        </View>
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>TIMINGS</Text>
                          <Text style={styles.dateColVal}>
                            {outing.outTime} - {outing.expectedInTime}
                          </Text>
                        </View>
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>CURFEW</Text>
                          <Text style={[styles.dateColVal, { color: '#D97706' }]}>
                            {outing.curfewTime || '02:00 PM'} (Grace: {outing.graceCurfewTime || '02:30 PM'})
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.viewPassBtn, { backgroundColor: '#6366F1' }]}
                        onPress={() => setSelectedOutingForPass(outing)}
                        activeOpacity={0.8}
                      >
                        <QrCode size={14} color="#FFFFFF" />
                        <Text style={styles.viewPassBtnText}>
                          View Holiday Outpass Token ({outing.outpassToken})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                {myLeaves
                  .filter((l) => l.isGovtHoliday || l.leaveType === 'Home Visit')
                  .map((leave) => (
                    <View key={leave.id} style={styles.leaveCard}>
                      <View style={styles.leaveCardHeader}>
                        <View style={styles.leaveCardTitleBox}>
                          <View style={styles.cardTypeRow}>
                            <View style={[styles.categoryBadge, { backgroundColor: '#ECFDF5' }]}>
                              <Sparkles size={11} color="#10B981" />
                              <Text style={[styles.categoryBadgeText, { color: '#065F46' }]}>
                                Holiday Homepass (0 Quota)
                              </Text>
                            </View>
                            <View style={styles.statusPillApproved}>
                              <Text style={styles.statusPillTextApproved}>{leave.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.leaveReasonText}>{leave.reason}</Text>
                        </View>
                      </View>
                      <View style={styles.leaveDatesRow}>
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>START</Text>
                          <Text style={styles.dateColVal}>{leave.startDate}</Text>
                        </View>
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>RETURN</Text>
                          <Text style={styles.dateColVal}>{leave.endDate}</Text>
                        </View>
                        <View style={styles.dateCol}>
                          <Text style={styles.dateColLabel}>QUOTA CHARGE</Text>
                          <Text style={[styles.dateColVal, { color: '#10B981' }]}>0 Days (Exempt)</Text>
                        </View>
                      </View>
                      {leave.gateToken && (
                        <TouchableOpacity
                          style={styles.viewPassBtn}
                          onPress={() => setSelectedLeaveForPass(leave)}
                          activeOpacity={0.8}
                        >
                          <QrCode size={14} color="#FFFFFF" />
                          <Text style={styles.viewPassBtnText}>
                            View Homepass Barcode ({leave.gateToken})
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
              </>
            )}

            {/* Declared Government Holidays Calendar */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionDividerTitle}>Upcoming Declared Government Holidays</Text>
            </View>
            <View style={styles.holidaysCalendarCard}>
              {GOVT_HOLIDAYS.slice(10, 20).map((h, idx) => (
                <View key={idx} style={styles.calHolidayRow}>
                  <View style={styles.calHolidayDateBadge}>
                    <Text style={styles.calHolidayDateText}>{h.date.substring(5)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calHolidayName}>{h.name}</Text>
                    <Text style={styles.calHolidayDesc}>{h.description}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.calApplyPill}
                    onPress={() => setIsHolidayModalVisible(true)}
                  >
                    <Text style={styles.calApplyPillText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =======================================================
            SECTION 4: CAMPUS GATE CHECK-IN & CHECK-OUT HISTORY
           ======================================================= */}
        {activeTab === 'gatelogs' && (
          <View style={styles.cardsList}>
            {/* Header Banner */}
            <View style={styles.gateBannerCard}>
              <View style={styles.gateBannerHeader}>
                <View style={styles.gateBannerIconBadge}>
                  <History size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gateBannerTitle}>Gate Check-In & Check-Out History</Text>
                  <Text style={styles.gateBannerSub}>
                    Security barcode logs tracking all campus exits and returns with gate station and guard details.
                  </Text>
                </View>
              </View>

              {/* Real-time Presence Status Indicator */}
              <View style={styles.gatePresenceRow}>
                <View style={styles.gatePresenceLabelBox}>
                  <Text style={styles.gatePresenceLabel}>CURRENT STATUS:</Text>
                  <View
                    style={[
                      styles.gatePresenceBadge,
                      myGateLogs.length > 0 && myGateLogs[0]?.action === 'Check Out'
                        ? styles.gatePresenceOutside
                        : styles.gatePresenceInside,
                    ]}
                  >
                    <View
                      style={[
                        styles.gatePresenceDot,
                        myGateLogs.length > 0 && myGateLogs[0]?.action === 'Check Out'
                          ? { backgroundColor: '#D97706' }
                          : { backgroundColor: '#10B981' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.gatePresenceText,
                        myGateLogs.length > 0 && myGateLogs[0]?.action === 'Check Out'
                          ? { color: '#B45309' }
                          : { color: '#047857' },
                      ]}
                    >
                      {myGateLogs.length > 0 && myGateLogs[0]?.action === 'Check Out'
                        ? `Outside Campus (Exited at ${myGateLogs[0].timestamp})`
                        : 'Inside Hostel Campus'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Movement Summary Stats */}
              <View style={styles.gateStatsRow}>
                <View style={styles.gateStatBox}>
                  <Text style={styles.gateStatVal}>{myGateLogs.length}</Text>
                  <Text style={styles.gateStatLbl}>Total Scans</Text>
                </View>
                <View style={styles.gateStatBox}>
                  <Text style={[styles.gateStatVal, { color: '#D97706' }]}>
                    {myGateLogs.filter((l) => l.action === 'Check Out').length}
                  </Text>
                  <Text style={styles.gateStatLbl}>Check Outs</Text>
                </View>
                <View style={styles.gateStatBox}>
                  <Text style={[styles.gateStatVal, { color: '#059669' }]}>
                    {myGateLogs.filter((l) => l.action === 'Check In').length}
                  </Text>
                  <Text style={styles.gateStatLbl}>Check Ins</Text>
                </View>
              </View>
            </View>

            {/* Filter Pills */}
            <View style={styles.gateFilterRow}>
              {(['all', 'Check Out', 'Check In'] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.gateFilterPill, gateFilter === filter && styles.gateFilterPillActive]}
                  onPress={() => setGateFilter(filter)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.gateFilterPillText,
                      gateFilter === filter && styles.gateFilterPillTextActive,
                    ]}
                  >
                    {filter === 'all'
                      ? `All Events (${myGateLogs.length})`
                      : filter === 'Check Out'
                      ? `Check Outs (${myGateLogs.filter((l) => l.action === 'Check Out').length})`
                      : `Check Ins (${myGateLogs.filter((l) => l.action === 'Check In').length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Movement Cards List */}
            {myGateLogs.filter((l) => gateFilter === 'all' || l.action === gateFilter).length === 0 ? (
              <View style={styles.emptyStateCard}>
                <History size={36} color={colors.textMuted} />
                <Text style={styles.emptyStateTitle}>No Gate Movement Logs</Text>
                <Text style={styles.emptyStateSub}>
                  Gate check-in and check-out logs appear automatically once security guards scan your barcode.
                </Text>
              </View>
            ) : (
              myGateLogs
                .filter((l) => gateFilter === 'all' || l.action === gateFilter)
                .map((log) => {
                  const isCheckOut = log.action === 'Check Out';
                  return (
                    <View
                      key={log.id}
                      style={[
                        styles.gateLogCard,
                        isCheckOut ? styles.gateLogCardOut : styles.gateLogCardIn,
                      ]}
                    >
                      {/* Top Action Header */}
                      <View style={styles.gateLogCardHeader}>
                        <View
                          style={[
                            styles.gateActionBadge,
                            isCheckOut ? styles.gateActionBadgeOut : styles.gateActionBadgeIn,
                          ]}
                        >
                          {isCheckOut ? (
                            <ArrowUpRight size={13} color="#D97706" />
                          ) : (
                            <ArrowDownLeft size={13} color="#059669" />
                          )}
                          <Text
                            style={[
                              styles.gateActionBadgeText,
                              isCheckOut ? { color: '#B45309' } : { color: '#047857' },
                            ]}
                          >
                            {isCheckOut ? 'CHECK OUT • CAMPUS EXIT' : 'CHECK IN • CAMPUS RETURN'}
                          </Text>
                        </View>
                        <View style={styles.gateTimeTag}>
                          <Clock size={11} color={colors.textSecondary} />
                          <Text style={styles.gateTimeTagText}>{log.timestamp}</Text>
                        </View>
                      </View>

                      {/* Pass details */}
                      <View style={styles.gateLogDetailsBlock}>
                        <View style={styles.gateDetailItem}>
                          <Text style={styles.gateDetailItemLabel}>Pass Type & USN:</Text>
                          <Text style={styles.gateDetailItemVal}>
                            {log.type} Pass • {log.usn} ({log.studentName})
                          </Text>
                        </View>

                        <View style={styles.gateDetailItem}>
                          <Text style={styles.gateDetailItemLabel}>Registration & Barcode:</Text>
                          <Text style={styles.gateDetailBarcodeVal}>
                            {log.registrationId} • {log.barcode}
                          </Text>
                        </View>

                        <View style={styles.gateDetailItem}>
                          <Text style={styles.gateDetailItemLabel}>Station & Security:</Text>
                          <Text style={styles.gateDetailItemVal}>
                            {log.station} • {log.guardName}
                          </Text>
                        </View>

                        {log.destination && (
                          <View style={styles.gateDetailItem}>
                            <Text style={styles.gateDetailItemLabel}>Destination:</Text>
                            <Text style={styles.gateDetailItemVal}>{log.destination}</Text>
                          </View>
                        )}
                      </View>

                      {/* Security Verification Remarks */}
                      {log.remarks && (
                        <View style={styles.gateRemarksBox}>
                          <Text style={styles.gateRemarksText}>
                            <Text style={{ fontWeight: '700' }}>Security Note: </Text>
                            {log.remarks}
                          </Text>
                        </View>
                      )}

                      {/* Late Curfew Breach Alert */}
                      {log.isLate && (
                        <View style={styles.gateLateBreachAlert}>
                          <ShieldAlert size={12} color="#DC2626" />
                          <Text style={styles.gateLateBreachAlertText}>
                            Late Entry Curfew Breach Logged • Forwarded to SWO Desk
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
            )}
          </View>
        )}
      </ScrollView>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        visible={isApplyModalVisible}
        leavesCount={leavesTaken}
        usn={profile?.usn || '1RV22CS089'}
        onClose={() => setIsApplyModalVisible(false)}
        onSubmitSuccess={() => loadData()}
        onApplyLeave={async (params) => {
          const res = await StorageService.applyLeave(params);
          if (res.leave.status === 'Approved' && res.leave.gateToken) {
            setSelectedLeaveForPass(res.leave);
          }
          return res;
        }}
      />

      {/* Extend Leave Modal */}
      <ExtendLeaveModal
        visible={!!selectedLeaveForExtend}
        leave={selectedLeaveForExtend}
        currentLeavesCount={leavesTaken}
        onClose={() => setSelectedLeaveForExtend(null)}
        onExtendSuccess={() => loadData()}
        onExtendLeave={async (params) => {
          return await StorageService.extendLeave(params);
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

      {/* Digital Outpass Modal (Outings) */}
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
          try {
            await StorageService.markOutingReturned(id);
            await loadData();
            setSelectedOutingForPass(null);
          } catch (err: any) {
            Alert.alert('Gate Check-In Blocked', err.message || 'Failed to record check-in.');
            const updated = await StorageService.getActiveOuting();
            setSelectedOutingForPass(updated);
          }
        }}
      />

      {/* Digital Outpass Modal (Leaves) */}
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

      {/* Student Notifications Modal */}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
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
  summaryCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simpleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  simpleApprover: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  alertNoticeText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  tabToggleActive: {
    backgroundColor: colors.primarySubtle,
  },
  tabToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabToggleTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  cardsList: {
    gap: 12,
  },
  leaveCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardId: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  cardType: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillApproved: {
    backgroundColor: colors.successSubtle,
  },
  statusPillPending: {
    backgroundColor: colors.accentSubtle,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusApprovedText: {
    color: colors.successDark,
  },
  statusPendingText: {
    color: '#B45309',
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  cardStudentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardAvatarPhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  cardAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStudentName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  cardStudentUsn: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  datesText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  daysText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  reasonText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  tokenSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  tokenBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 8,
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  tokenNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  gateVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSubtle,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  gateVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.successDark,
  },
  extendedNotice: {
    backgroundColor: colors.background,
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  extendedNoticeText: {
    fontSize: 10,
    color: colors.primaryDark,
    fontStyle: 'italic',
  },
  extendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingVertical: 8,
    borderRadius: 8,
  },
  extendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pendingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  pendingHint: {
    fontSize: 10,
    color: colors.textMuted,
  },
  quickApproveBtn: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickApproveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  studentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  studentNameHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  usnTag: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  usnTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    fontFamily: 'monospace',
  },
  historyStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  historyStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyStatBadgeActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: '#C7D2FE',
  },
  historyStatText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  historyStatTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  emptyStateCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
  },
  emptyStateSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  emptyApplyBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  emptyApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  regIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  regIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'monospace',
  },
  regIdBarcode: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  gateTimesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gateTimeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  exemptNoticeSub: {
    fontSize: 10,
    color: colors.successDark,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 2,
  },
  govtExemptTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  govtExemptTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  autoApproveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  autoApproveTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  emergencyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  couponTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  couponTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  weekendExemptTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  weekendExemptTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  quotaChargedSubText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  leaveActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
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
  outingNoticeHeader: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  outingNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  outingNoticeSub: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    marginTop: 2,
  },
  statusPillClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusClosedText: {
    color: '#64748B',
  },
  outingActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  exitedGateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  exitedGateTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },

  disciplinaryBlockBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  disciplinaryBlockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  disciplinaryBlockText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
    marginTop: 3,
  },
  holidaySectionBanner: {
    backgroundColor: '#312E81',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
  },
  holidayBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  holidayBannerIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holidayBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  holidayBannerSub: {
    fontSize: 12,
    color: '#C7D2FE',
    marginTop: 3,
    lineHeight: 16,
  },
  holidayOptionsRow: {
    gap: 12,
  },
  holidayOptionCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  holidayOptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  optPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
  },
  optTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  optDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  optWarningBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 8,
  },
  optWarningText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  optApplyBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  optApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionDivider: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionDividerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  holidaysCalendarCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  calHolidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  calHolidayDateBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  calHolidayDateText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  calHolidayName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  calHolidayDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  calApplyPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  calApplyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leaveCardHeader: {
    marginBottom: 6,
  },
  leaveCardTitleBox: {
    flex: 1,
  },
  cardTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextApproved: {
    color: colors.successDark,
    fontSize: 10,
    fontWeight: '700',
  },
  leaveReasonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  leaveDatesRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateCol: {
    flex: 1,
  },
  dateColLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateColVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  entryTimingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
  },
  entryTimingCol: {
    flex: 1,
  },
  entryTimingDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  entryTimingLabelOut: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  entryTimingLabelIn: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  entryTimingDate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  entryTimingTime: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
  },
  entryGateTime: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  entryCurfewNotice: {
    fontSize: 9,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 2,
  },
  closedHistoryEntryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  closedHistoryEntryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tabToggleRowWrapper: {
    marginBottom: 12,
  },
  tabToggleRowScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  gateBannerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  gateBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gateBannerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  gateBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  gatePresenceRow: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gatePresenceLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  gatePresenceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  gatePresenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gatePresenceInside: {
    backgroundColor: '#ECFDF5',
  },
  gatePresenceOutside: {
    backgroundColor: '#FEF3C7',
  },
  gatePresenceDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  gatePresenceText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gateStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gateStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  gateStatVal: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.primaryLight,
  },
  gateStatLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  gateFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  gateFilterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gateFilterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gateFilterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  gateFilterPillTextActive: {
    color: '#FFFFFF',
  },
  gateLogCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  gateLogCardOut: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFEF5',
  },
  gateLogCardIn: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F9FEFB',
  },
  gateLogCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  gateActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gateActionBadgeOut: {
    backgroundColor: '#FEF3C7',
  },
  gateActionBadgeIn: {
    backgroundColor: '#D1FAE5',
  },
  gateActionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  gateTimeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gateTimeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  gateLogDetailsBlock: {
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  gateDetailItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexWrap: 'wrap',
  },
  gateDetailItemLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  gateDetailItemVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  gateDetailBarcodeVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  gateRemarksBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  gateRemarksText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  gateLateBreachAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  gateLateBreachAlertText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
  },
});
