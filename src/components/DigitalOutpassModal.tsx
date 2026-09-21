import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  QrCode,
  ShieldCheck,
  MapPin,
  Clock,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  ArrowRight,
  LogOut,
  LogIn,
  AlertCircle,
  ShieldAlert,
  Radio,
  Lock,
  Ticket,
} from 'lucide-react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { colors } from '../theme/colors';
import { OutingApplication, LeaveApplication } from '../types';
import { StorageService } from '../services/storage';
import { BarcodeView } from './BarcodeView';
import { getCurfewStatus } from '../utils/curfew';

interface DigitalOutpassModalProps {
  visible: boolean;
  onClose: () => void;
  outing?: OutingApplication | null;
  leave?: LeaveApplication | null;
  onGateExit?: (id: string) => Promise<void>;
  onGateReturn?: (id: string) => Promise<void>;
}

export const DigitalOutpassModal: React.FC<DigitalOutpassModalProps> = ({
  visible,
  onClose,
  outing,
  leave,
  onGateExit,
  onGateReturn,
}) => {
  // Prevent screenshot and screen recording for this digital gate pass
  usePreventScreenCapture();

  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeApp = outing || leave;
  const [cooldown, setCooldown] = useState(() => StorageService.getCheckInCooldown(activeApp));

  useEffect(() => {
    const update = () => {
      setCooldown(StorageService.getCheckInCooldown(activeApp));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [activeApp]);

  if (!visible || (!outing && !leave)) return null;

  const isLeave = Boolean(leave && !outing);
  const isOuting = Boolean(outing);
  const isHolidayLeave = Boolean(leave && (leave.leaveType === 'Home Visit' || Boolean(leave.isGovtHoliday)));
  const isRegularLeave = Boolean(leave && !isHolidayLeave);

  const token = outing ? outing.outpassToken : leave?.gateToken || 'TK-84920';
  const passId = outing ? outing.id : leave?.id || 'PASS-001';
  const usn = outing ? outing.usn : leave?.usn || '1RV22CS089';
  const name = outing ? outing.studentName : leave?.studentName || 'Student Resident';
  const room = outing ? outing.roomNumber : leave?.roomNumber || 'B-304';
  const block = outing?.hostelBlock || 'Cauvery Block B-3';
  const typeLabel = outing ? outing.outingType : leave?.leaveType || 'Hostel Pass';
  const destination = outing?.destination || (leave ? `Home / Destination (${leave.leaveType})` : 'Local');
  const purpose = outing?.purpose || leave?.reason || 'Permitted Hostel Absence';

  const studentBarcode = `*STU-${usn}*`;
  const regId =
    outing?.registrationId ||
    leave?.registrationId ||
    `REG-${isLeave ? 'LV' : 'OUT'}-${usn}-${passId.replace(/[^0-9]/g, '') || '8941'}`;
  const barcodeVal = outing?.barcode || leave?.barcode || studentBarcode;

  const outDate = outing ? outing.outDate : leave?.startDate || '';
  const returnDateOrTime = outing
    ? outing.expectedInTime
    : leave?.endDate || '';

  const status = outing
    ? outing.status
    : leave?.checkInTime
    ? 'Returned & Closed'
    : leave?.checkOutTime
    ? 'Exited Gate'
    : leave?.status === 'Approved'
    ? 'Outpass Generated'
    : leave?.status || 'Pending';

  const checkOutTime = outing?.checkOutTime || leave?.checkOutTime;
  const checkOutGate = outing?.checkOutGate || leave?.checkOutGate || 'Campus Main Gate 1';
  const checkOutGuard = outing?.checkOutGuard || leave?.checkOutGuard || 'Security Guard Ramu';
  const checkInTime = outing?.checkInTime || leave?.checkInTime;
  const checkInGate = outing?.checkInGate || leave?.checkInGate || 'Campus Main Gate 1';
  const checkInGuard = outing?.checkInGuard || leave?.checkInGuard || 'Security Guard Ramu';
  const movementHistory = outing?.movementHistory || leave?.movementHistory || [];

  const curfewEval = outing
    ? getCurfewStatus(
        outing,
        status === 'Exited Gate' ? liveTime : outing.checkInTime || liveTime
      )
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.badgeShield}>
                <Image
                  source={require('../../assets/alvas-logo.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.headerTitle}>AIETNEST HOSTEL DIGITAL OUTPASS</Text>
                <Text style={styles.headerSubtitle}>Alva's Education Foundation • Gate Pass</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Outpass Ticket Container */}
            <View style={styles.ticketCard}>
              {/* Anti-Screenshot Security Notice Banner */}
              <View style={styles.screenshotSecurityBanner}>
                <ShieldAlert size={14} color="#B91C1C" />
                <Text style={styles.screenshotSecurityText}>
                  SCREENSHOTS BLOCKED • SECURE DIGITAL PASS
                </Text>
              </View>

              {/* Live Anti-Forgery Clock Ticker */}
              <View style={styles.liveClockBadge}>
                <View style={styles.livePulsingDot} />
                <Text style={styles.liveClockText}>
                  LIVE SECURE TOKEN • {liveTime} (ACTIVE PASS)
                </Text>
              </View>

              {/* 5 Outpass Categories Pill Indicator */}
              <View
                style={[
                  styles.outpassCategoryBanner,
                  isOuting
                    ? styles.catBannerOuting
                    : isHolidayLeave
                    ? styles.catBannerHoliday
                    : leave?.isEmergency
                    ? styles.catBannerEmergency
                    : leave?.isDuplicateCoupon
                    ? styles.catBannerCoupon
                    : styles.catBannerLeave,
                ]}
              >
                <Text
                  style={[
                    styles.outpassCategoryBannerText,
                    isOuting
                      ? styles.catBannerTextOuting
                      : isHolidayLeave
                      ? styles.catBannerTextHoliday
                      : leave?.isEmergency
                      ? styles.catBannerTextEmergency
                      : leave?.isDuplicateCoupon
                      ? styles.catBannerTextCoupon
                      : styles.catBannerTextLeave,
                  ]}
                >
                  {isOuting
                    ? '🏙️ CATEGORY 1: OUTING OUTPASS (DAILY 9:00 PM CURFEW)'
                    : isHolidayLeave
                    ? '🏠 CATEGORY 2: HOME GOING (GOVT HOLIDAYS • 0 QUOTA)'
                    : leave?.isEmergency
                    ? '🚨 CATEGORY 4: AO DISCRETIONARY EMERGENCY LEAVE PASS'
                    : leave?.isDuplicateCoupon
                    ? '🎫 CATEGORY 5: AO DUPLICATE COUPON PASS (LATE OVERRIDE)'
                    : '📋 CATEGORY 3: REGULAR LEAVE OUTPASS (WARDEN SANCTIONED)'}
                </Text>
              </View>

              {/* Duplicate Coupon Callout */}
              {leave?.duplicateCouponNumber && (
                <View style={styles.duplicateCouponCard}>
                  <Ticket size={16} color="#B45309" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.duplicateCouponTitle}>AO DUPLICATE COUPON AUTHORIZED</Text>
                    <Text style={styles.duplicateCouponSub}>
                      Coupon #{leave.duplicateCouponNumber} • Late deadline override sanctioned by AO
                    </Text>
                  </View>
                </View>
              )}

              {/* Weekend Exemption Callout */}
              {leave?.isWeekendExempt && (
                <View style={styles.weekendExemptCard}>
                  <Text style={styles.weekendExemptTitle}>🏖️ Weekend Exemption Active</Text>
                  <Text style={styles.weekendExemptSub}>
                    Saturday PM to Monday AM period is charged 0 days against personal leave quota.
                  </Text>
                </View>
              )}

              {/* Ticket Top Ribbon */}
              <View style={styles.ticketRibbon}>
                <View>
                  <Text style={styles.ribbonCategory}>{typeLabel.toUpperCase()}</Text>
                  <Text style={styles.ribbonPassId}>Pass ID: {passId}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    status === 'Outpass Generated'
                      ? styles.statusReady
                      : status === 'Exited Gate'
                      ? styles.statusExited
                      : styles.statusClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      status === 'Outpass Generated'
                        ? styles.statusReadyText
                        : status === 'Exited Gate'
                        ? styles.statusExitedText
                        : styles.statusClosedText,
                    ]}
                  >
                    {status === 'Outpass Generated'
                      ? '● Ready at Gate'
                      : status === 'Exited Gate'
                      ? '● Exited Campus'
                      : '● Returned & Closed'}
                  </Text>
                </View>
              </View>

              {/* QR Code Presentation Box */}
              <View style={styles.qrContainer}>
                <View style={styles.qrBorderFrame}>
                  <QrCode size={120} color={colors.primaryDark} />
                </View>
                <Text style={styles.tokenHighlight}>{token}</Text>
                <Text style={styles.qrInstruction}>
                  Present this QR token to Main Gate Security for terminal scan
                </Text>
              </View>

              {/* Barcode Presentation Box for Check In / Check Out */}
              <View style={styles.barcodeSection}>
                <BarcodeView
                  value={studentBarcode}
                  label={`STUDENT BARCODE: ${studentBarcode} • PASS REG: ${regId}`}
                  height={52}
                />
                <Text style={styles.unifiedPassNotice}>
                  Same Student Barcode verifies Outings, Govt Holiday Home, & Leaves with shared student details.
                </Text>
              </View>

              {/* Perforation Divider */}
              <View style={styles.perforationRow}>
                <View style={styles.perforationHoleLeft} />
                <View style={styles.perforationLine} />
                <View style={styles.perforationHoleRight} />
              </View>

              {/* Student Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>REGISTRATION ID</Text>
                  <Text style={[styles.detailValBold, { color: colors.primary }]}>{regId}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>USN</Text>
                  <Text style={styles.detailValBold}>{usn}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>ROOM & BLOCK</Text>
                  <Text style={styles.detailValBold}>
                    {room} • {block}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>STUDENT NAME</Text>
                  <Text style={styles.detailVal}>{name}</Text>
                </View>
              </View>

              {/* Timing Box */}
              <View style={styles.timingCard}>
                <View style={styles.timingCol}>
                  <View style={styles.timingHeader}>
                    <Clock size={13} color={colors.primary} />
                    <Text style={styles.timingLabel}>DEPARTURE / OUT</Text>
                  </View>
                  <Text style={styles.timingTime}>{outDate}</Text>
                  {outing && <Text style={styles.timingSub}>{outing.outTime}</Text>}
                  {leave?.startSession && (
                    <Text style={styles.timingSessionBadge}>
                      {leave.startSession === 'Evening' ? '🌇 Evening Departure' : '🌅 Morning Departure'}
                    </Text>
                  )}
                </View>

                <View style={styles.timingArrow}>
                  <ArrowRight size={18} color={colors.textSecondary} />
                </View>

                <View style={styles.timingCol}>
                  <View style={styles.timingHeader}>
                    <Clock size={13} color={colors.dangerDark} />
                    <Text style={[styles.timingLabel, { color: colors.dangerDark }]}>
                      GATE CURFEW / IN
                    </Text>
                  </View>
                  <Text style={styles.timingTime}>{returnDateOrTime}</Text>
                  {outing && <Text style={styles.timingSub}>Before 9:00 PM Curfew</Text>}
                  {leave?.returnSession && (
                    <Text style={styles.timingSessionBadge}>
                      {leave.returnSession === 'Evening' ? '🌇 Evening Return' : '🌅 Morning Return'}
                    </Text>
                  )}
                </View>
              </View>

              {/* Destination & Reason */}
              <View style={styles.destinationBox}>
                <View style={styles.destHeader}>
                  <MapPin size={14} color={colors.primary} />
                  <Text style={styles.destTitle}>Destination / Location</Text>
                </View>
                <Text style={styles.destText}>{destination}</Text>

                <Text style={styles.reasonHeader}>PURPOSE:</Text>
                <Text style={styles.reasonText}>"{purpose}"</Text>
              </View>

              {/* Security Guard Terminal Status */}
              {outing?.gateSecurityRemark && (
                <View style={styles.securityRemarkBox}>
                  <CheckCircle2 size={14} color={colors.successDark} />
                  <Text style={styles.securityRemarkText}>
                    {outing.gateSecurityRemark}
                  </Text>
                </View>
              )}

              {/* =======================================================
                  ACTIVE CHECK-IN / CHECK-OUT DETAIL & HISTORY
                 ======================================================= */}
              <View style={styles.activeCheckDetailCard}>
                <View style={styles.activeCheckHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={styles.activeCheckHeaderTitle}>
                      ACTIVE CHECK-IN / CHECK-OUT DETAIL
                    </Text>
                    <Text style={styles.activeCheckHeaderSub}>
                      {status === 'Outpass Generated'
                        ? 'Resident Inside Campus • Check-Out Scan Pending'
                        : status === 'Exited Gate'
                        ? 'Resident Outside Campus • Curfew Return Check-In Due'
                        : 'Completed • Hosteller Checked In from Outpass'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.movementStatePill,
                      status === 'Outpass Generated'
                        ? styles.pillInside
                        : status === 'Exited Gate'
                        ? styles.pillOutside
                        : styles.pillReturned,
                    ]}
                  >
                    <Text
                      style={[
                        styles.movementStatePillText,
                        status === 'Outpass Generated'
                          ? styles.pillInsideText
                          : status === 'Exited Gate'
                          ? styles.pillOutsideText
                          : styles.pillReturnedText,
                      ]}
                    >
                      {status === 'Outpass Generated'
                        ? 'INSIDE'
                        : status === 'Exited Gate'
                        ? 'CHECKED OUT'
                        : 'CHECKED IN'}
                    </Text>
                  </View>
                </View>

                {/* Gate Movement Columns (Check Out & Check In) */}
                <View style={styles.checkGrid}>
                  {/* Check Out Column */}
                  <View style={styles.checkCol}>
                    <View style={styles.checkColHeader}>
                      <LogOut size={12} color="#D97706" />
                      <Text style={styles.checkColTitle}>DEPARTURE CHECK-OUT</Text>
                    </View>
                    <Text style={styles.checkColTime}>
                      {checkOutTime || 'Pending Gate Scan'}
                    </Text>
                    <Text style={styles.checkColMeta}>
                      Gate: <Text style={{ fontWeight: '700', color: colors.text }}>{checkOutGate}</Text>
                    </Text>
                    <Text style={styles.checkColMeta}>
                      Guard: <Text style={{ fontWeight: '700', color: colors.text }}>{checkOutGuard}</Text>
                    </Text>
                  </View>

                  <View style={styles.checkColDivider} />

                  {/* Check In Column */}
                  <View style={styles.checkCol}>
                    <View style={styles.checkColHeader}>
                      <LogIn size={12} color={colors.successDark} />
                      <Text style={styles.checkColTitle}>CURFEW CHECK-IN</Text>
                    </View>
                    <Text style={styles.checkColTime}>
                      {checkInTime || (status === 'Exited Gate' ? `Due by ${returnDateOrTime}` : 'Pending Return')}
                    </Text>
                    <Text style={styles.checkColMeta}>
                      Gate: <Text style={{ fontWeight: '700', color: colors.text }}>{checkInGate}</Text>
                    </Text>
                    <Text style={styles.checkColMeta}>
                      Guard: <Text style={{ fontWeight: '700', color: colors.text }}>{checkInGuard}</Text>
                    </Text>
                  </View>
                </View>

                {/* Recorded Movement History Audit Trail */}
                {movementHistory && movementHistory.length > 0 && (
                  <View style={styles.auditTrailContainer}>
                    <Text style={styles.auditTrailHeader}>
                      RECORDED CHECK-IN / CHECK-OUT HISTORY ({movementHistory.length}):
                    </Text>
                    {movementHistory.map((evt, idx) => (
                      <View key={evt.id || idx} style={styles.auditEventRow}>
                        <View
                          style={[
                            styles.auditBadge,
                            evt.action === 'Check Out' ? styles.badgeExit : styles.badgeReturn,
                          ]}
                        >
                          <Text
                            style={[
                              styles.auditBadgeText,
                              evt.action === 'Check Out' ? styles.textExit : styles.textReturn,
                            ]}
                          >
                            {evt.action.toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.auditEventTime}>
                            {evt.timestamp} • {evt.gate}
                          </Text>
                          <Text style={styles.auditEventRemarks}>
                            {evt.remarks || `Verified by ${evt.guardName}`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Interactive Gate Verification Buttons (for Check-In and Check-Out) */}
            <View style={styles.gateActionsContainer}>
              <Text style={styles.gateActionsPrompt}>
                Campus Gate Barcode Check-In & Check-Out:
              </Text>

              {status !== 'Exited Gate' && status !== 'Returned & Closed' && (
                <TouchableOpacity
                  style={styles.exitCampusBtn}
                  onPress={async () => {
                    const targetId = outing ? outing.id : leave?.id;
                    if (onGateExit && targetId) {
                      await onGateExit(targetId);
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <LogOut size={16} color="#FFFFFF" />
                  <Text style={styles.exitCampusBtnText}>
                    Scan Barcode & Check Out (Exit Campus)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Curfew & Grace Alert Live Card */}
              {isOuting && curfewEval && (
                <View
                  style={[
                    styles.curfewLiveCard,
                    curfewEval.isLate
                      ? styles.curfewLiveCardLate
                      : curfewEval.isGraceAlert
                      ? styles.curfewLiveCardGrace
                      : styles.curfewLiveCardNormal,
                  ]}
                >
                  <View style={styles.curfewLiveHeader}>
                    {curfewEval.isLate ? (
                      <ShieldAlert size={16} color="#EF4444" />
                    ) : curfewEval.isGraceAlert ? (
                      <AlertCircle size={16} color="#D97706" />
                    ) : (
                      <Clock size={16} color="#10B981" />
                    )}
                    <Text
                      style={[
                        styles.curfewLiveTitle,
                        { color: curfewEval.badgeColor },
                      ]}
                    >
                      {curfewEval.isLate
                        ? '🚨 LATE ENTRY BREACH DETECTED'
                        : curfewEval.isGraceAlert
                        ? '⚠️ CURFEW GRACE PERIOD ACTIVE'
                        : 'INSTITUTIONAL CURFEW WINDOW'}
                    </Text>
                  </View>
                  <Text style={styles.curfewLiveMsg}>{curfewEval.alertMessage}</Text>
                  <View style={styles.curfewTimingsRow}>
                    <Text style={styles.curfewPillText}>
                      Curfew: <Text style={{ fontWeight: '800' }}>{curfewEval.curfewTime}</Text>
                    </Text>
                    <Text style={styles.curfewPillText}>
                      Grace Cutoff: <Text style={{ fontWeight: '800' }}>{curfewEval.graceEndTime}</Text>
                    </Text>
                  </View>
                </View>
              )}

              {status === 'Exited Gate' && (
                <>
                  {cooldown.isRestricted ? (
                    <View style={{ gap: 8 }}>
                      {/* Cooldown Active Warning Card */}
                      <View style={styles.cooldownBannerCard}>
                        <View style={styles.cooldownHeaderRow}>
                          <View style={styles.cooldownIconBadge}>
                            <Lock size={15} color="#B45309" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cooldownTitle}>15-MIN RE-ENTRY COOLDOWN ACTIVE</Text>
                            <Text style={styles.cooldownSubtitle}>
                              Hostel security policy: Students must remain outside campus for at least 15 minutes after exit.
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cooldownTimerStrip}>
                          <Clock size={14} color="#D97706" />
                          <Text style={styles.cooldownTimerText}>
                            Re-entry unlocks in{' '}
                            <Text style={styles.cooldownCountdownHighlight}>
                              {cooldown.remainingFormatted}
                            </Text>{' '}
                            (at {cooldown.allowedCheckInTime})
                          </Text>
                        </View>
                      </View>

                      {/* Locked Check-In Button */}
                      <TouchableOpacity
                        style={styles.lockedReturnBtn}
                        onPress={() => {
                          Alert.alert(
                            '⏳ Gate Check-In Locked (15-Min Policy)',
                            `Hostel regulations require students to spend a minimum of 15 minutes outside campus upon exit.\n\nChecked Out: ${cooldown.checkOutTimeStr || 'Recently'}\nRemaining: ${cooldown.remainingFormatted}\nEligible Check-In: ${cooldown.allowedCheckInTime}\n\nPlease wait for the cooldown to finish before scanning back in.`
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Lock size={16} color="#B45309" />
                        <Text style={styles.lockedReturnBtnText}>
                          Check-In Locked ({cooldown.remainingFormatted} remaining)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <View style={styles.cooldownSatisfiedBadge}>
                        <CheckCircle2 size={13} color={colors.successDark} />
                        <Text style={styles.cooldownSatisfiedText}>
                          15-Minute Cooldown Satisfied • Eligible for Gate Re-Entry
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.returnCampusBtn}
                        onPress={async () => {
                          const targetId = outing ? outing.id : leave?.id;
                          if (onGateReturn && targetId) {
                            try {
                              await onGateReturn(targetId);
                            } catch (err: any) {
                              Alert.alert('Gate Check-In Blocked', err.message || 'Failed to complete check-in.');
                            }
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <LogIn size={16} color="#FFFFFF" />
                        <Text style={styles.returnCampusBtnText}>
                          Scan Barcode & Check In (Enter Campus)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {status === 'Returned & Closed' && (
                <View style={styles.completedTag}>
                  <CheckCircle2 size={16} color={colors.successDark} />
                  <Text style={styles.completedTagText}>
                    Checked In & Returned • Barcode Outpass Closed
                  </Text>
                </View>
              )}
            </View>

            {/* Institutional Watermark */}
            <View style={styles.footerNote}>
              <AlertCircle size={13} color={colors.textSecondary} />
              <Text style={styles.footerNoteText}>
                Official Digital Gate Pass issued under AIETNEST Hostel Rules. Must be
                scanned at security checkpost. Curfew is strictly 9:00 PM.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeShield: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceCard,
  },
  scrollArea: {
    padding: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  screenshotSecurityBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    paddingVertical: 7,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  screenshotSecurityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.8,
  },
  liveClockBadge: {
    backgroundColor: '#0F172A',
    paddingVertical: 5,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  livePulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22C55E',
  },
  liveClockText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  ticketRibbon: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  ribbonCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  ribbonPassId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusReady: {
    backgroundColor: '#DCFCE7',
  },
  statusReadyText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  statusExited: {
    backgroundColor: '#FEF3C7',
  },
  statusExitedText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  statusClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusClosedText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillText: {
    fontSize: 11,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  qrBorderFrame: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primarySubtle,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  tokenHighlight: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 2,
    marginTop: 12,
  },
  qrInstruction: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  barcodeSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: 'stretch',
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  perforationHoleLeft: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    marginLeft: -9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  perforationLine: {
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  perforationHoleRight: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    marginRight: -9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    width: '47%',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  timingCard: {
    marginHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timingCol: {
    flex: 1,
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  timingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  timingTime: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  timingSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  timingArrow: {
    paddingHorizontal: 8,
  },
  destinationBox: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
  },
  destHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  destTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  destText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  reasonHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reasonText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: 2,
  },
  securityRemarkBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  securityRemarkText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  activeCheckDetailCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeCheckHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  activeCheckHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  activeCheckHeaderSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  movementStatePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  movementStatePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pillInside: {
    backgroundColor: '#DCFCE7',
  },
  pillInsideText: {
    color: '#15803D',
  },
  pillOutside: {
    backgroundColor: '#FEF3C7',
  },
  pillOutsideText: {
    color: '#B45309',
  },
  pillReturned: {
    backgroundColor: '#E0E7FF',
  },
  pillReturnedText: {
    color: '#4338CA',
  },
  checkGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  checkCol: {
    flex: 1,
  },
  checkColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  checkColTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  checkColTime: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  checkColMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  checkColDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  auditTrailContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  auditTrailHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  auditEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  auditBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeExit: {
    backgroundColor: '#FEF3C7',
  },
  badgeReturn: {
    backgroundColor: '#DCFCE7',
  },
  auditBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textExit: {
    color: '#B45309',
  },
  textReturn: {
    color: '#15803D',
  },
  auditEventTime: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  auditEventRemarks: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  gateActionsContainer: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gateActionsPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  exitCampusBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exitCampusBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  returnCampusBtn: {
    backgroundColor: colors.successDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  returnCampusBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
  },
  completedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  footerNoteText: {
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 14,
  },
  outpassCategoryBanner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  catBannerOuting: {
    backgroundColor: '#FEF3C7',
    borderBottomColor: '#FDE68A',
  },
  catBannerHoliday: {
    backgroundColor: '#DCFCE7',
    borderBottomColor: '#BBF7D0',
  },
  catBannerLeave: {
    backgroundColor: '#EEF2FF',
    borderBottomColor: '#C7D2FE',
  },
  catBannerEmergency: {
    backgroundColor: '#FEE2E2',
    borderBottomColor: '#FCA5A5',
  },
  catBannerCoupon: {
    backgroundColor: '#FFFBEB',
    borderBottomColor: '#FCD34D',
  },
  outpassCategoryBannerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catBannerTextOuting: {
    color: '#B45309',
  },
  catBannerTextHoliday: {
    color: '#15803D',
  },
  catBannerTextEmergency: {
    color: '#B91C1C',
  },
  catBannerTextCoupon: {
    color: '#B45309',
  },
  catBannerTextLeave: {
    color: '#4338CA',
  },
  duplicateCouponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  duplicateCouponTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  duplicateCouponSub: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 1,
  },
  weekendExemptCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  weekendExemptTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
  },
  weekendExemptSub: {
    fontSize: 10,
    color: '#3B82F6',
    marginTop: 1,
  },
  timingSessionBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  unifiedPassNotice: {
    fontSize: 9,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  cooldownBannerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    gap: 8,
  },
  cooldownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cooldownIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cooldownTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.4,
  },
  cooldownSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  cooldownTimerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  cooldownTimerText: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '500',
  },
  cooldownCountdownHighlight: {
    fontWeight: '800',
    color: '#B45309',
  },
  lockedReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDE68A',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  lockedReturnBtnText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cooldownSatisfiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  cooldownSatisfiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successDark,
  },
  curfewLiveCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 6,
    marginBottom: 6,
  },
  curfewLiveCardNormal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  curfewLiveCardGrace: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  curfewLiveCardLate: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  curfewLiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  curfewLiveTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  curfewLiveMsg: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  curfewTimingsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  curfewPillText: {
    fontSize: 11,
    color: colors.text,
  },
});
