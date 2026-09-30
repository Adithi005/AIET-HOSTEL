import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Compass,
  Home,
  Clock,
  Calendar,
  AlertTriangle,
  Sparkles,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { OutingApplication, LeaveApplication, UserProfile } from '../types';
import { CURFEW_CONFIG } from '../utils/curfew';

interface ApplyHolidayPassModalProps {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onApplyHolidayOutpass: (params: {
    destination: string;
    purpose: string;
    outDate?: string;
    contactNumber?: string;
    emergencyContact?: string;
  }) => Promise<OutingApplication>;
  onApplyHolidayHomepass: (params: {
    holidayName: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    destinationAddress: string;
    reason: string;
  }) => Promise<LeaveApplication>;
  onSuccessOutpass: (outing: OutingApplication) => void;
  onSuccessHomepass: (leave: LeaveApplication) => void;
}

export const ApplyHolidayPassModal: React.FC<ApplyHolidayPassModalProps> = ({
  visible,
  profile,
  onClose,
  onApplyHolidayOutpass,
  onApplyHolidayHomepass,
  onSuccessOutpass,
  onSuccessHomepass,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [sectionTab, setSectionTab] = useState<'outpass' | 'homepass'>('outpass');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Holiday Outpass State (9 AM - 2 PM)
  const [outDate, setOutDate] = useState(todayStr);
  const [outDestination, setOutDestination] = useState('');
  const [outPurpose, setOutPurpose] = useState('');
  const [contactNumber, setContactNumber] = useState(profile?.contactNumber || '+91 98765 43210');
  const [emergencyContact, setEmergencyContact] = useState(profile?.guardianContact || '+91 98765 01234');

  // Holiday Homepass State (Auto-Approved 0 Quota)
  const [holidayName, setHolidayName] = useState('Deepavali / Karnataka Rajyotsava Holiday');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [homeAddress, setHomeAddress] = useState('Parent Home, Jayanagar 4th Block, Bangalore');
  const [homeReason, setHomeReason] = useState('Visiting family during declared institutional holiday break');

  const HOLIDAY_PRESETS = [
    'Deepavali Festival Break',
    'Karnataka Rajyotsava',
    'Ayudha Pooja / Dussehra',
    'Republic Day Long Weekend',
    'Ganesh Chaturthi Special Leave',
  ];

  const handleOutpassSubmit = async () => {
    if (profile?.isOutingBlocked) {
      Alert.alert(
        '⛔ Outing Suspended',
        `Your outings are blocked due to: ${profile.outingBlockReason || 'Past late return breach'}.\nPlease contact the Student Welfare Officer (SWO) for permission.`
      );
      return;
    }

    if (!outDestination.trim()) {
      Alert.alert('Destination Required', 'Please specify where you are going.');
      return;
    }
    if (!outPurpose.trim()) {
      Alert.alert('Purpose Required', 'Please specify the purpose of your holiday outing.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await onApplyHolidayOutpass({
        destination: outDestination.trim(),
        purpose: outPurpose.trim(),
        outDate,
        contactNumber,
        emergencyContact,
      });
      setIsSubmitting(false);
      onClose();
      onSuccessOutpass(res);
      Alert.alert(
        '🎉 Holiday Outpass Issued!',
        `Token: ${res.outpassToken}\n\nAllowed Timings: 09:00 AM – 02:00 PM\nCurfew Cutoff: 02:00 PM (Grace alert till 02:30 PM).\nPlease return before 02:30 PM to avoid disciplinary action.`
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Application Failed', err.message || 'Could not generate holiday outpass.');
    }
  };

  const handleHomepassSubmit = async () => {
    if (!homeAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your home destination address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const startObj = new Date(startDate);
      const endObj = new Date(endDate);
      const diffMs = endObj.getTime() - startObj.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

      const res = await onApplyHolidayHomepass({
        holidayName,
        startDate,
        endDate,
        totalDays: diffDays,
        destinationAddress: homeAddress.trim(),
        reason: homeReason.trim(),
      });
      setIsSubmitting(false);
      onClose();
      onSuccessHomepass(res);
      Alert.alert(
        '⚡ Auto-Approved Holiday Homepass!',
        `Gate Token: ${res.gateToken}\n\nYour home visit pass is pre-authorized with 0 DAYS DEDUCTED from your personal quota.\n\nGate scan active for departure starting ${startDate}.`
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Failed', err.message || 'Could not generate homepass.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Sparkles size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Govt Holiday Section</Text>
                <Text style={styles.headerSubtitle}>Select Holiday Outpass or Homepass</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* APPLICANT IDENTITY: ONLY USN IS DISPLAYED OR REVEALED */}
          <View style={styles.applicantUsnStrip}>
            <View style={styles.applicantUsnBadge}>
              <Text style={styles.applicantUsnBadgeText}>APPLICANT USN</Text>
            </View>
            <Text style={styles.applicantUsnValue}>{profile?.usn || '1RV22CS089'}</Text>
            <Text style={styles.applicantUsnPolicy}>(Only USN revealed on application)</Text>
          </View>

          {/* Section Selector Tabs */}
          <View style={styles.selectorBar}>
            <TouchableOpacity
              style={[styles.selectorTab, sectionTab === 'outpass' && styles.selectorTabActive]}
              onPress={() => setSectionTab('outpass')}
            >
              <Compass size={16} color={sectionTab === 'outpass' ? colors.primary : colors.textSecondary} />
              <View>
                <Text
                  style={[styles.selectorTabText, sectionTab === 'outpass' && styles.selectorTabTextActive]}
                >
                  Holiday Outpass
                </Text>
                <Text style={styles.selectorTabSub}>9:00 AM – 2:00 PM</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.selectorTab, sectionTab === 'homepass' && styles.selectorTabActive]}
              onPress={() => setSectionTab('homepass')}
            >
              <Home size={16} color={sectionTab === 'homepass' ? '#10B981' : colors.textSecondary} />
              <View>
                <Text
                  style={[styles.selectorTabText, sectionTab === 'homepass' && { color: '#10B981' }]}
                >
                  Holiday Homepass
                </Text>
                <Text style={styles.selectorTabSub}>Instant Auto-Approved</Text>
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* SUB-SECTION 1: HOLIDAY OUTPASS */}
            {sectionTab === 'outpass' && (
              <View style={styles.formCard}>
                {/* Outing Block Banner if suspended */}
                {profile?.isOutingBlocked && (
                  <View style={styles.blockedAlert}>
                    <AlertTriangle size={18} color="#EF4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.blockedAlertTitle}>Outing Suspended</Text>
                      <Text style={styles.blockedAlertDesc}>
                        {profile.outingBlockReason || 'Past late return violation'}. SWO clearance required.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Timing Rules Banner */}
                <View style={styles.ruleBanner}>
                  <View style={styles.ruleHeader}>
                    <Clock size={16} color="#D97706" />
                    <Text style={styles.ruleTitle}>Govt Holiday Outing Timings</Text>
                  </View>
                  <View style={styles.ruleGrid}>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleLabel}>Permitted Window</Text>
                      <Text style={styles.ruleVal}>09:00 AM – 02:00 PM</Text>
                    </View>
                    <View style={styles.ruleItem}>
                      <Text style={styles.ruleLabel}>Grace Alert Period</Text>
                      <Text style={styles.ruleValAmber}>02:00 PM – 02:30 PM</Text>
                    </View>
                  </View>
                  <Text style={styles.ruleNotice}>
                    ⚠️ Students must return by 02:30 PM. Returning after 02:30 PM marks a late entry and suspends future outings until SWO approval.
                  </Text>
                </View>

                {/* Form Inputs */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Outing Date</Text>
                  <TextInput
                    style={styles.input}
                    value={outDate}
                    onChangeText={setOutDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Destination</Text>
                  <TextInput
                    style={styles.input}
                    value={outDestination}
                    onChangeText={setOutDestination}
                    placeholder="e.g. Mangalore City Center / Forum Fiza"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Purpose of Visit</Text>
                  <TextInput
                    style={styles.input}
                    value={outPurpose}
                    onChangeText={setOutPurpose}
                    placeholder="e.g. Festival shopping and lunch with family"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hosteller Contact</Text>
                  <TextInput
                    style={styles.input}
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    keyboardType="phone-pad"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    profile?.isOutingBlocked && styles.submitBtnDisabled,
                  ]}
                  onPress={handleOutpassSubmit}
                  disabled={isSubmitting || profile?.isOutingBlocked}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Sparkles size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Generate Holiday Outpass (9 AM – 2 PM)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-SECTION 2: HOLIDAY HOMEPASS */}
            {sectionTab === 'homepass' && (
              <View style={styles.formCard}>
                {/* Auto-Approval Notice */}
                <View style={styles.homepassBanner}>
                  <View style={styles.homepassHeader}>
                    <ShieldCheck size={18} color="#10B981" />
                    <Text style={styles.homepassBannerTitle}>Pre-Authorized Instant Homepass</Text>
                  </View>
                  <Text style={styles.homepassBannerDesc}>
                    Institutional Government Holiday Exemption: Automatically approved with 0 days deducted from your personal semester leave quota.
                  </Text>
                </View>

                {/* Holiday Preset Selector */}
                <Text style={styles.inputLabel}>Select Holiday Festival</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {HOLIDAY_PRESETS.map((name) => (
                    <TouchableOpacity
                      key={name}
                      style={[
                        styles.presetChip,
                        holidayName === name && styles.presetChipActive,
                      ]}
                      onPress={() => setHolidayName(name)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          holidayName === name && styles.presetChipTextActive,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Departure Date</Text>
                    <TextInput
                      style={styles.input}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Return Date</Text>
                    <TextInput
                      style={styles.input}
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Destination Home Address</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 52 }]}
                    value={homeAddress}
                    onChangeText={setHomeAddress}
                    placeholder="Complete home residential address"
                    multiline
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Reason / Remarks</Text>
                  <TextInput
                    style={styles.input}
                    value={homeReason}
                    onChangeText={setHomeReason}
                    placeholder="Brief holiday visit purpose"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#10B981' }]}
                  onPress={handleHomepassSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>Generate Instant Homepass (0 Quota)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    minHeight: '60%',
    paddingBottom: 24,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    gap: 8,
  },
  selectorTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  selectorTabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectorTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  selectorTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  selectorTabSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    gap: 14,
  },
  blockedAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  blockedAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  blockedAlertDesc: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 2,
  },
  ruleBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  ruleGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  ruleItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ruleLabel: {
    fontSize: 10,
    color: '#78350F',
    fontWeight: '600',
  },
  ruleVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  ruleValAmber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
    marginTop: 2,
  },
  ruleNotice: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  homepassBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  homepassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  homepassBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  homepassBannerDesc: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 17,
  },
  presetScroll: {
    marginBottom: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  presetChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  presetChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  applicantUsnStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 8,
  },
  applicantUsnBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  applicantUsnBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  applicantUsnValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  applicantUsnPolicy: {
    fontSize: 10,
    color: '#6366F1',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
});
