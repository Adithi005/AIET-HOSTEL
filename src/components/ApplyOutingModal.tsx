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
  MapPin,
  Clock,
  Calendar,
  Compass,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Phone,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { OutingType, OutingApplication, UserProfile } from '../types';

interface ApplyOutingModalProps {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSubmitSuccess: (outing: OutingApplication) => void;
  onApplyOuting: (params: {
    outingType: OutingType;
    outDate: string;
    outTime: string;
    expectedInTime: string;
    destination: string;
    purpose: string;
    contactNumber?: string;
    emergencyContact?: string;
  }) => Promise<OutingApplication>;
}

export const ApplyOutingModal: React.FC<ApplyOutingModalProps> = ({
  visible,
  profile,
  onClose,
  onSubmitSuccess,
  onApplyOuting,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [outingType, setOutingType] = useState<OutingType>('Local City Outing');
  const [outDate, setOutDate] = useState(todayStr);
  const [outTime, setOutTime] = useState('09:00 AM');
  const [expectedInTime, setExpectedInTime] = useState('04:00 PM');
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [contactNumber, setContactNumber] = useState(profile?.contactNumber || '+91 98765 43210');
  const [emergencyContact, setEmergencyContact] = useState(profile?.guardianContact || '+91 98765 01234');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const OUTING_OPTIONS: OutingType[] = [
    'Local City Outing',
    'Market / Shopping',
    'Library / Study',
    'Evening Dinner',
    'Medical / Clinic',
    'Personal',
  ];

  const handleSubmit = async () => {
    if (profile?.isOutingBlocked) {
      Alert.alert(
        '⛔ Outing Suspended by SWO',
        `Reason: ${profile.outingBlockReason || 'Past late return curfew breach'}.\n\nYou cannot apply for outings until the Student Welfare Officer (SWO) clears your account.`
      );
      return;
    }

    if (!destination.trim()) {
      Alert.alert('Destination Required', 'Please specify where you are visiting.');
      return;
    }

    if (!purpose.trim()) {
      Alert.alert('Purpose Required', 'Please provide a brief reason for the outing.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newOuting = await onApplyOuting({
        outingType,
        outDate,
        outTime,
        expectedInTime,
        destination: destination.trim(),
        purpose: purpose.trim(),
        contactNumber,
        emergencyContact,
      });

      setIsSubmitting(false);
      onClose();
      onSubmitSuccess(newOuting);

      Alert.alert(
        '🎉 Outpass Generated Successfully!',
        `Digital Outpass Token: ${newOuting.outpassToken}\n\nAllowed Timings: 09:00 AM – 04:00 PM\nGrace Cutoff: 04:30 PM\n\nPlease return before 04:30 PM to avoid disciplinary action.`
      );
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to generate outing outpass. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Compass size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Apply for Hostel Outing</Text>
                <Text style={styles.modalSubtitle}>
                  Instant Digital Outpass Generation
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Outing Suspended Disciplinary Notice */}
            {profile?.isOutingBlocked && (
              <View style={styles.blockedAlertCard}>
                <AlertCircle size={20} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.blockedAlertTitle}>Outing Privileges Suspended</Text>
                  <Text style={styles.blockedAlertText}>
                    {profile.outingBlockReason || 'Past late return curfew breach'}.
                    {'\n'}Please contact the Student Welfare Officer (SWO) for clearance.
                  </Text>
                </View>
              </View>
            )}

            {/* Curfew Timings Policy Notice */}
            <View style={styles.curfewBanner}>
              <View style={styles.curfewHeaderRow}>
                <Clock size={16} color="#B45309" />
                <Text style={styles.curfewTitle}>Outing Timings: 9:00 AM – 4:00 PM</Text>
              </View>
              <Text style={styles.curfewSub}>
                Grace alert window is <Text style={{ fontWeight: '800' }}>4:00 PM – 4:30 PM</Text>. Returning after 4:30 PM will suspend subsequent outings until SWO clearance.
              </Text>
            </View>

            {/* Instant Outpass Generation Banner */}
            <View style={styles.instantNoticeBox}>
              <QrCode size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.instantNoticeTitle}>Instant Gate Pass Generation</Text>
                <Text style={styles.instantNoticeText}>
                  Your digital Outpass with a scannable QR Code and token will be generated
                  immediately upon submission. Present it at the hostel main security gate.
                </Text>
              </View>
            </View>

            {/* Outing Type Category */}
            <Text style={styles.fieldLabel}>Outing Category</Text>
            <View style={styles.pillsWrap}>
              {OUTING_OPTIONS.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typePill,
                    outingType === type && styles.typePillActive,
                  ]}
                  onPress={() => setOutingType(type)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      outingType === type && styles.typePillTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Timings Row */}
            <View style={styles.timingRow}>
              {/* Out-Date */}
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Out Date</Text>
                <View style={styles.inputBox}>
                  <Calendar size={15} color={colors.primary} />
                  <TextInput
                    style={styles.textInput}
                    value={outDate}
                    onChangeText={setOutDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              {/* Out-Time */}
              <View style={{ width: 115 }}>
                <Text style={styles.fieldLabel}>Out Time</Text>
                <View style={styles.inputBox}>
                  <Clock size={15} color={colors.primary} />
                  <TextInput
                    style={[styles.textInput, { fontWeight: '700' }]}
                    value={outTime}
                    onChangeText={setOutTime}
                    placeholder="04:30 PM"
                  />
                </View>
              </View>

              {/* In-Time (Curfew) */}
              <View style={{ width: 115 }}>
                <Text style={[styles.fieldLabel, { color: colors.dangerDark }]}>
                  Return (Curfew)
                </Text>
                <View style={[styles.inputBox, { borderColor: '#FECACA' }]}>
                  <Clock size={15} color={colors.dangerDark} />
                  <TextInput
                    style={[styles.textInput, { fontWeight: '700', color: colors.dangerDark }]}
                    value={expectedInTime}
                    onChangeText={setExpectedInTime}
                    placeholder="08:30 PM"
                  />
                </View>
              </View>
            </View>

            {/* Curfew Reminder Alert */}
            <View style={styles.curfewNotice}>
              <AlertCircle size={14} color="#B45309" />
              <Text style={styles.curfewNoticeText}>
                Hostel Curfew Rule: All residents must be checked into campus by 9:00 PM.
              </Text>
            </View>

            {/* Destination Field */}
            <Text style={styles.fieldLabel}>Destination / Visiting Location *</Text>
            <View style={styles.inputBox}>
              <MapPin size={16} color={colors.primary} />
              <TextInput
                style={styles.textInput}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g., Jayanagar 4th Block / Orion Mall"
              />
            </View>

            {/* Reason / Purpose */}
            <Text style={styles.fieldLabel}>Purpose of Outing *</Text>
            <TextInput
              style={styles.textArea}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g., Buying project components, dinner with local guardian, buying stationery..."
              multiline
              numberOfLines={3}
            />

            {/* Contact Verification */}
            <View style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Student Mobile</Text>
                <View style={styles.inputBox}>
                  <Phone size={14} color={colors.textSecondary} />
                  <TextInput
                    style={styles.textInput}
                    value={contactNumber}
                    onChangeText={setContactNumber}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Guardian Contact</Text>
                <View style={styles.inputBox}>
                  <Phone size={14} color={colors.textSecondary} />
                  <TextInput
                    style={styles.textInput}
                    value={emergencyContact}
                    onChangeText={setEmergencyContact}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <ShieldCheck size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Apply & Generate Outpass</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
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
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceCard,
  },
  scrollArea: {
    padding: 16,
  },
  instantNoticeBox: {
    backgroundColor: colors.primarySubtle,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 16,
  },
  instantNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  instantNoticeText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typePillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  timingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 42,
    gap: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  curfewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  curfewNoticeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    fontSize: 13,
    color: colors.text,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 18,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  blockedAlertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  blockedAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  blockedAlertText: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
    marginTop: 2,
  },
  curfewBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  curfewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  curfewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  curfewSub: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
});
