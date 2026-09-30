import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import {
  X,
  User,
  LogOut,
  LogIn,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react-native';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { colors } from '../theme/colors';
import { OutingApplication, LeaveApplication, UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { BarcodeView } from './BarcodeView';

interface DigitalOutpassModalProps {
  visible: boolean;
  onClose: () => void;
  outing?: OutingApplication | null;
  leave?: LeaveApplication | null;
  profile?: UserProfile | null;
  onGateExit?: (id: string) => Promise<void>;
  onGateReturn?: (id: string) => Promise<void>;
}

export const DigitalOutpassModal: React.FC<DigitalOutpassModalProps> = ({
  visible,
  onClose,
  outing,
  leave,
  profile,
  onGateExit,
  onGateReturn,
}) => {
  // Prevent screenshot and screen recording for this digital gate pass
  usePreventScreenCapture();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(profile || null);

  useEffect(() => {
    if (profile) {
      setUserProfile(profile);
    } else {
      StorageService.getProfile().then(setUserProfile).catch(console.warn);
    }
  }, [profile, visible]);

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

  if (!outing && !leave) return null;

  const isOuting = !!outing;
  const passId = outing ? outing.id : leave?.id || 'PASS-000';
  const usn = outing?.usn || leave?.usn || userProfile?.usn || '1RV22CS089';
  const avatarUri = userProfile?.avatarUri;

  const regId =
    outing?.registrationId ||
    leave?.registrationId ||
    `REG-${isOuting ? 'OUT' : 'LV'}-${usn}-${passId.replace(/[^0-9]/g, '') || '8941'}`;
  const barcodeVal = outing?.barcode || leave?.barcode || `*${regId}*`;

  // Out Timing and Date
  const outDate = outing ? outing.outDate : leave?.startDate || '';
  const outTime = outing
    ? outing.outTime
    : leave?.departureTime || (leave?.startSession === 'Evening' ? '05:00 PM' : '09:00 AM');

  // In Timing and Date (Curfew)
  const inDate = outing ? outing.outDate : leave?.endDate || outDate;
  const inTime = outing
    ? outing.expectedInTime
    : leave?.expectedReturnTime || (leave?.returnSession === 'Evening' ? '06:00 PM' : '08:30 AM');

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
  const checkInTime = outing?.checkInTime || leave?.checkInTime;

  // Pass must NOT be visible to student once closed/returned
  if (status === 'Returned & Closed') {
    return null;
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentSmall}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.passTypeTitle}>
                {isOuting
                  ? outing?.isGovtHolidayOuting
                    ? 'Holiday Outing Pass'
                    : 'Hostel Outing Pass'
                  : leave?.isCompensationPass
                  ? 'AO Compensation Pass'
                  : leave?.isDuplicateCoupon
                  ? 'AO Duplicate Pass'
                  : leave?.isEmergency
                  ? 'AO Emergency Pass'
                  : leave?.isGovtHoliday
                  ? 'Holiday Home Pass'
                  : 'Hostel Home Pass'}
              </Text>
              <Text style={styles.passIdSubtitle}>Pass #{passId}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                status === 'Outpass Generated'
                  ? styles.statusReady
                  : status === 'Exited Gate'
                  ? styles.statusExited
                  : styles.statusClosed,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  status === 'Outpass Generated'
                    ? styles.statusReadyText
                    : status === 'Exited Gate'
                    ? styles.statusExitedText
                    : styles.statusClosedText,
                ]}
              >
                {status === 'Outpass Generated'
                  ? '● Ready to Exit'
                  : status === 'Exited Gate'
                  ? '● Outside Campus'
                  : '● Returned'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body Card */}
          <View style={styles.cardBody}>
            {/* 1. Profile Photo and USN ONLY */}
            <View style={styles.profileUsnRow}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profilePhoto} resizeMode="cover" />
              ) : (
                <View style={styles.profileFallback}>
                  <User size={26} color={colors.primary} />
                </View>
              )}
              <View style={styles.usnContainer}>
                <Text style={styles.usnLabel}>STUDENT USN</Text>
                <Text style={styles.usnValue}>{usn}</Text>
                <Text style={styles.usnSub}>Official Gate Pass</Text>
              </View>
            </View>

            {/* 2. Barcode */}
            <View style={styles.barcodeBox}>
              <BarcodeView value={barcodeVal} label={barcodeVal} height={50} />
            </View>

            {/* 3. In and Out Timing & Date */}
            <View style={styles.timingCardSimple}>
              <View style={styles.timingColSimple}>
                <View style={styles.timingColHeader}>
                  <LogOut size={12} color="#2563EB" />
                  <Text style={styles.timingColHeaderOut}>DEPARTURE (OUT)</Text>
                </View>
                <Text style={styles.timingDateSimple}>{outDate}</Text>
                <Text style={styles.timingTimeSimple}>{outTime}</Text>
                {checkOutTime && (
                  <Text style={styles.gateStampText}>Exited: {checkOutTime}</Text>
                )}
              </View>

              <View style={styles.timingCenterDivider}>
                <ArrowRight size={16} color={colors.textMuted} />
              </View>

              <View style={styles.timingColSimple}>
                <View style={styles.timingColHeader}>
                  <LogIn size={12} color="#DC2626" />
                  <Text style={styles.timingColHeaderIn}>RETURN (IN)</Text>
                </View>
                <Text style={styles.timingDateSimple}>{inDate}</Text>
                <Text style={[styles.timingTimeSimple, { color: '#DC2626' }]}>{inTime}</Text>
                {checkInTime ? (
                  <Text style={[styles.gateStampText, { color: '#16A34A' }]}>
                    Returned: {checkInTime}
                  </Text>
                ) : (
                  <Text style={styles.curfewNoticeSimple}>
                    {isOuting
                      ? outing?.isGovtHolidayOuting
                        ? 'Return by 2:00 PM'
                        : 'Return by 4:00 PM'
                      : 'Scan required at gate'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalContentSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 390,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  headerLeft: {
    flex: 1,
  },
  passTypeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  passIdSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  statusReady: {
    backgroundColor: '#ECFDF5',
  },
  statusReadyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  statusExited: {
    backgroundColor: '#FEF3C7',
  },
  statusExitedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  statusClosed: {
    backgroundColor: '#F3F4F6',
  },
  statusClosedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  cardBody: {
    padding: 16,
    gap: 12,
  },
  profileUsnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profilePhoto: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  profileFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  usnContainer: {
    flex: 1,
  },
  usnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  usnValue: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  usnSub: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 1,
  },
  barcodeBox: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  timingCardSimple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  timingColSimple: {
    flex: 1,
  },
  timingColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  timingColHeaderOut: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  timingColHeaderIn: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  timingDateSimple: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  timingTimeSimple: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 1,
  },
  gateStampText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  curfewNoticeSimple: {
    fontSize: 9,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 2,
  },
  timingCenterDivider: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 10,
    gap: 8,
  },
  gateActionBtnReturn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 8,
  },
  gateActionBtnLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 8,
  },
  gateActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  gateActionBtnLockedText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  completedBadgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
});
