import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
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
  Lock,
  Compass,
  MapPin,
  Landmark,
  Sparkles,
  Gift,
  Ticket,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { ExtendLeaveModal } from '../components/ExtendLeaveModal';
import { ApplyOutingModal } from '../components/ApplyOutingModal';
import { DigitalOutpassModal } from '../components/DigitalOutpassModal';
import { ApplyHolidayPassModal } from '../components/ApplyHolidayPassModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { colors } from '../theme/colors';
import { UserProfile, LeaveApplication, OutingApplication, StudentNotification } from '../types';
import { StorageService } from '../services/storage';
import { getLeaveEscalationInfo } from '../utils/escalation';
import { GOVT_HOLIDAYS } from '../utils/holidays';
import { CURFEW_CONFIG, getCurfewStatus } from '../utils/curfew';

export const LeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myLeaves, setMyLeaves] = useState<LeaveApplication[]>([]);
  const [myOutings, setMyOutings] = useState<OutingApplication[]>([]);
  const [activeTab, setActiveTab] = useState<'outings' | 'leaves' | 'holidays'>('outings');
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
      const notifs = await StorageService.getNotifications(p.usn);
      setProfile(p);
      setMyLeaves(l);
      setMyOutings(outs);
      setNotifications(notifs);
    } catch (err) {
      console.warn('Error loading student history', err);
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
                Movement History • Strictly stores your logged-in outings and leaves
              </Text>

              <View style={styles.historyStatsRow}>
                <TouchableOpacity
                  style={[styles.historyStatBadge, activeTab === 'outings' && styles.historyStatBadgeActive]}
                  onPress={() => setActiveTab('outings')}
                  activeOpacity={0.7}
                >
                  <Compass size={13} color={activeTab === 'outings' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.historyStatText, activeTab === 'outings' && styles.historyStatTextActive]}>
                    Outings: {myOutings.length}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.historyStatBadge, activeTab === 'leaves' && styles.historyStatBadgeActive]}
                  onPress={() => setActiveTab('leaves')}
                  activeOpacity={0.7}
                >
                  <CalendarDays size={13} color={activeTab === 'leaves' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.historyStatText, activeTab === 'leaves' && styles.historyStatTextActive]}>
                    Leaves: {myLeaves.length}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.historyStatBadge, activeTab === 'holidays' && styles.historyStatBadgeActive]}
                  onPress={() => setActiveTab('holidays')}
                  activeOpacity={0.7}
                >
                  <Sparkles size={13} color={activeTab === 'holidays' ? '#6366F1' : colors.textSecondary} />
                  <Text style={[styles.historyStatText, activeTab === 'holidays' && { color: '#6366F1', fontWeight: '800' }]}>
                    Govt Holidays
                  </Text>
                </TouchableOpacity>
              </View>
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
                Leave quota expired (&gt;10). Medical proof & Principal approval required.
              </Text>
            </View>
          )}
        </View>

        {/* Tab Toggle: 3 Sections (Outings, Leaves, Govt Holidays) */}
        <View style={styles.tabToggleRow}>
          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'outings' && styles.tabToggleActive]}
            onPress={() => setActiveTab('outings')}
            activeOpacity={0.8}
          >
            <Compass
              size={15}
              color={activeTab === 'outings' ? colors.primary : colors.textSecondary}
            />
            <Text
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
              size={15}
              color={activeTab === 'leaves' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabToggleText,
                activeTab === 'leaves' && styles.tabToggleTextActive,
              ]}
            >
              Leaves ({myLeaves.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabToggleBtn, activeTab === 'holidays' && styles.tabToggleActive]}
            onPress={() => setActiveTab('holidays')}
            activeOpacity={0.8}
          >
            <Sparkles
              size={15}
              color={activeTab === 'holidays' ? '#6366F1' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabToggleText,
                activeTab === 'holidays' && { color: '#6366F1', fontWeight: '800' },
              ]}
            >
              Govt Holidays
            </Text>
          </TouchableOpacity>
        </View>

        {/* =======================================================
            SECTION 1: HOSTEL OUTINGS & DAY OUTPASSES
           ======================================================= */}
        {activeTab === 'outings' && (
          <View style={styles.cardsList}>
            {/* Outing Top Bar */}
            <View style={styles.outingNoticeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.outingNoticeTitle}>Hostel Day & Evening Outings</Text>
                <Text style={styles.outingNoticeSub}>Curfew: 9:00 PM • Instant QR & Barcode Outpass</Text>
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
                  You have no recorded day or evening outings. Tap Apply Outing to generate your digital gate pass.
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
                        {outing.status}
                      </Text>
                    </View>
                  </View>

                  {/* Registration ID & Barcode Tag */}
                  <View style={styles.regIdBadge}>
                    <Text style={styles.regIdText}>REG: {outing.registrationId || `REG-${outing.id}`}</Text>
                    <Text style={styles.regIdBarcode}>{outing.barcode || `*REG-${outing.id}*`}</Text>
                  </View>

                  {/* Timing */}
                  <View style={styles.datesRow}>
                    <Text style={styles.datesText}>
                      {outing.outDate} • {outing.outTime} ➔ {outing.expectedInTime}
                    </Text>
                  </View>

                  {/* Actual Gate Timestamps if Exited or Returned */}
                  {(outing.checkOutTime || outing.checkInTime) && (
                    <View style={styles.gateTimesRow}>
                      {outing.checkOutTime && (
                        <Text style={styles.gateTimeText}>
                          Gate Check-Out: <Text style={{ fontWeight: '700' }}>{outing.checkOutTime}</Text>
                        </Text>
                      )}
                      {outing.checkInTime && (
                        <Text style={styles.gateTimeText}>
                          Gate Check-In: <Text style={{ fontWeight: '700' }}>{outing.checkInTime}</Text>
                        </Text>
                      )}
                    </View>
                  )}

                  <Text style={styles.reasonText}>
                    <Text style={{ fontWeight: '700' }}>Destination: </Text>{outing.destination}
                  </Text>
                  <Text style={[styles.reasonText, { marginTop: 2 }]}>
                    <Text style={{ fontWeight: '700' }}>Purpose: </Text>{outing.purpose}
                  </Text>

                  {/* Actions */}
                  <View style={styles.outingActionRow}>
                    <TouchableOpacity
                      style={styles.viewPassBtn}
                      onPress={() => setSelectedOutingForPass(outing)}
                      activeOpacity={0.85}
                    >
                      <QrCode size={13} color="#FFFFFF" />
                      <Text style={styles.viewPassBtnText}>View Digital Outpass</Text>
                    </TouchableOpacity>

                    {outing.status === 'Outpass Generated' && (
                      <TouchableOpacity
                        style={styles.quickExitBtn}
                        onPress={() => handleGateExit(outing.id)}
                      >
                        <Text style={styles.quickExitBtnText}>Exit Gate</Text>
                      </TouchableOpacity>
                    )}

                    {outing.status === 'Exited Gate' && (() => {
                      const cooldown = StorageService.getCheckInCooldown(outing);
                      return (
                        <TouchableOpacity
                          style={[styles.quickReturnBtn, cooldown.isRestricted && styles.quickReturnBtnLocked]}
                          onPress={() => {
                            if (cooldown.isRestricted) {
                              Alert.alert(
                                '⏳ Gate Check-In Locked (15-Min Policy)',
                                `Checked out at ${outing.checkOutTime || 'recently'}.\n\nHostel regulations require a 15-minute cooldown outside campus before re-entry.\n\nTime remaining: ${cooldown.remainingFormatted} (Eligible at ${cooldown.allowedCheckInTime}).`
                              );
                              return;
                            }
                            handleGateReturn(outing.id);
                          }}
                        >
                          <Text style={[styles.quickReturnBtnText, cooldown.isRestricted && styles.quickReturnBtnTextLocked]}>
                            {cooldown.isRestricted ? `Locked (${cooldown.remainingFormatted})` : 'Mark Returned'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
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
                <Text style={styles.outingNoticeTitle}>Hostel Extended & Home Leaves</Text>
                <Text style={styles.outingNoticeSub}>
                  Leaves Quota: {leavesTaken} Days • Tier: {escalation.requiredApprover}
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
                        🚨 AO Discretionary Emergency Leave (Instant Gate Pass)
                      </Text>
                    </View>
                  )}

                  {leave.isDuplicateCoupon && (
                    <View style={styles.couponTag}>
                      <Ticket size={12} color="#D97706" />
                      <Text style={styles.couponTagText}>
                        🎫 AO Duplicate Coupon: {leave.duplicateCouponNumber || 'Sanctioned'}
                      </Text>
                    </View>
                  )}

                  {leave.isWeekendExempt && (
                    <View style={styles.weekendExemptTag}>
                      <Text style={styles.weekendExemptTagText}>
                        🏖️ Weekend Exemption (Saturday PM – Monday AM • 0 Quota Days)
                      </Text>
                    </View>
                  )}

                  {/* Duration & Sessions */}
                  <View style={styles.datesRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.datesText}>
                        {leave.startDate} {leave.startSession ? `(${leave.startSession})` : ''} ➔ {leave.endDate} {leave.returnSession ? `(${leave.returnSession})` : ''}
                      </Text>
                      {leave.chargedDays !== undefined && (
                        <Text style={styles.quotaChargedSubText}>
                          Leave Quota Charged: {leave.chargedDays} Days {leave.startSession === 'Evening' ? '• Evening dep. excludes day 1' : ''}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.daysText}>{leave.totalDays} Days</Text>
                  </View>

                  {leave.destination && (
                    <Text style={styles.reasonText}>
                      <Text style={{ fontWeight: '700' }}>Destination: </Text>{leave.destination}
                    </Text>
                  )}
                  <Text style={styles.reasonText}>Reason: {leave.reason}</Text>

                  {/* APPROVED: GATE TOKEN & ACTIONS */}
                  {leave.status === 'Approved' && (
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
                          <Text style={styles.viewPassBtnText}>View Digital Outpass</Text>
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
                  )}

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
      </ScrollView>

      {/* Apply Leave Modal */}
      <ApplyLeaveModal
        visible={isApplyModalVisible}
        leavesCount={leavesTaken}
        onClose={() => setIsApplyModalVisible(false)}
        onSubmitSuccess={() => loadData()}
        onApplyLeave={async (params) => {
          return await StorageService.applyLeave(params);
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
            const leaves = await StorageService.getMyLeaves();
            setSelectedLeaveForPass(leaves.find((l) => l.id === id) || null);
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
    gap: 6,
  },
  tabToggleActive: {
    backgroundColor: colors.primarySubtle,
  },
  tabToggleText: {
    fontSize: 12,
    fontWeight: '600',
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
});
