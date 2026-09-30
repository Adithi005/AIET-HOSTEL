import React, { useState, useMemo } from 'react';
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
  Landmark,
  Sun,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { OutingType, OutingApplication, UserProfile } from '../types';
import { getEligibleOutingDates, validateOutingDate, EligibleOutingDate } from '../utils/outingDates';

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
    isGovtHolidayOuting?: boolean;
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

  // Retrieve strictly and only Sundays and declared Government Holidays
  const eligibleDates = useMemo(() => getEligibleOutingDates(new Date(), 60), []);
  const initialDate = eligibleDates.length > 0 ? eligibleDates[0] : null;

  const [dateFilter, setDateFilter] = useState<'all' | 'sundays' | 'holidays'>('all');
  const [isGovtHolidayOuting, setIsGovtHolidayOuting] = useState(
    initialDate ? initialDate.isGovtHoliday : false
  );
  const [outingType, setOutingType] = useState<OutingType>('Local City Outing');
  const [outDate, setOutDate] = useState(initialDate ? initialDate.dateStr : todayStr);
  const [outTime, setOutTime] = useState('09:00 AM');
  const [expectedInTime, setExpectedInTime] = useState(
    initialDate ? initialDate.allowedCurfew : '04:00 PM'
  );
  const [destination, setDestination] = useState('');
  const [purpose, setPurpose] = useState('');
  const [contactNumber, setContactNumber] = useState(profile?.contactNumber || '+91 98765 43210');
  const [emergencyContact, setEmergencyContact] = useState(profile?.guardianContact || '+91 98765 01234');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate the chosen date
  const dateValidation = validateOutingDate(outDate);

  const OUTING_OPTIONS: OutingType[] = [
    'Local City Outing',
    'Market / Shopping',
    'Library / Study',
    'Evening Dinner',
    'Medical / Clinic',
    'Personal',
  ];

  // Filtered list of outing dates
  const filteredDates = useMemo(() => {
    if (dateFilter === 'sundays') {
      return eligibleDates.filter((d) => d.isSunday && !d.isGovtHoliday);
    }
    if (dateFilter === 'holidays') {
      return eligibleDates.filter((d) => d.isGovtHoliday);
    }
    return eligibleDates;
  }, [eligibleDates, dateFilter]);

  const sundaysCount = useMemo(() => eligibleDates.filter((d) => d.isSunday).length, [eligibleDates]);
  const holidaysCount = useMemo(() => eligibleDates.filter((d) => d.isGovtHoliday).length, [eligibleDates]);

  const handleSelectEligibleDate = (item: EligibleOutingDate) => {
    setOutDate(item.dateStr);
    setIsGovtHolidayOuting(item.isGovtHoliday);
    setOutTime('09:00 AM');
    setExpectedInTime(item.allowedCurfew);
  };

  const handleSubmit = async () => {
    if (profile?.isOutingBlocked) {
      Alert.alert(
        '⛔ Outing Suspended by SWO',
        `Reason: ${profile.outingBlockReason || 'Past late return curfew breach'}.\n\nYou cannot apply for outings until the Student Welfare Officer (SWO) clears your account.`
      );
      return;
    }

    if (!dateValidation.isValid) {
      Alert.alert(
        '⛔ Outings Restricted to Sundays & Govt Holidays',
        'College Hostel Regulation:\nDay outings are permitted ONLY on Sundays (9:00 AM – 4:00 PM) and Declared Government Holidays (9:00 AM – 2:00 PM).\n\nWeekdays are non-outing days. Please select an eligible date from the list.'
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
        isGovtHolidayOuting: dateValidation.isGovtHoliday,
      });

      setIsSubmitting(false);
      onClose();
      onSubmitSuccess(newOuting);

      Alert.alert(
        '🎉 Outpass Generated Successfully!',
        `Digital Outpass Token: ${newOuting.outpassToken}\n\nDate: ${outDate} (${dateValidation.isGovtHoliday ? 'Govt Holiday' : 'Sunday Outing'})\nAllowed Timings: ${dateValidation.isGovtHoliday ? '09:00 AM – 02:00 PM' : '09:00 AM – 04:00 PM'}\nCurfew Cutoff: ${dateValidation.allowedCurfew}\nGrace Cutoff: ${dateValidation.allowedGraceEnd}\n\nDigital pass is active and ready to present at the gate!`
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
              <View style={[styles.iconBadge, dateValidation.isGovtHoliday && { backgroundColor: '#10B981' }]}>
                <Compass size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {dateValidation.isGovtHoliday ? 'Govt Holiday Outing Pass' : 'Sunday Outing Pass'}
                </Text>
                <Text style={[styles.modalSubtitle, dateValidation.isGovtHoliday && { color: '#059669' }]}>
                  {dateValidation.isGovtHoliday ? 'Instant Pass • 9:00 AM – 2:00 PM' : 'Instant Digital Pass • 9:00 AM – 4:00 PM'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* APPLICANT IDENTITY: ONLY USN IS DISPLAYED OR REVEALED */}
            <View style={styles.applicantUsnStrip}>
              <View style={styles.applicantUsnBadge}>
                <Text style={styles.applicantUsnBadgeText}>APPLICANT USN</Text>
              </View>
              <Text style={styles.applicantUsnValue}>{profile?.usn || '1RV22CS089'}</Text>
              <Text style={styles.applicantUsnPolicy}>(Only USN is displayed or revealed on application)</Text>
            </View>

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

            {/* Institutional Outing Day Policy Notice */}
            <View style={styles.policyNoticeCard}>
              <Sun size={18} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={styles.policyNoticeTitle}>Official Outing Schedule</Text>
                <Text style={styles.policyNoticeText}>
                  Day outings are permitted <Text style={{ fontWeight: '800' }}>ONLY on Sundays (9 AM – 4 PM)</Text> and <Text style={{ fontWeight: '800' }}>Declared Govt Holidays (9 AM – 2 PM)</Text>. Regular weekdays are strictly non-outing days.
                </Text>
              </View>
            </View>

            {/* Filter Tabs for Outing Dates */}
            <View style={styles.filterTabsRow}>
              <TouchableOpacity
                style={[styles.filterTab, dateFilter === 'all' && styles.filterTabActive]}
                onPress={() => setDateFilter('all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, dateFilter === 'all' && styles.filterTabTextActive]}>
                  All Dates ({eligibleDates.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, dateFilter === 'sundays' && styles.filterTabActive]}
                onPress={() => setDateFilter('sundays')}
                activeOpacity={0.8}
              >
                <Sun size={12} color={dateFilter === 'sundays' ? '#FFFFFF' : '#D97706'} />
                <Text style={[styles.filterTabText, dateFilter === 'sundays' && styles.filterTabTextActive]}>
                  Sundays ({sundaysCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, dateFilter === 'holidays' && styles.filterTabActiveHoliday]}
                onPress={() => setDateFilter('holidays')}
                activeOpacity={0.8}
              >
                <Landmark size={12} color={dateFilter === 'holidays' ? '#FFFFFF' : '#059669'} />
                <Text style={[styles.filterTabText, dateFilter === 'holidays' && styles.filterTabTextActive]}>
                  Govt Holidays ({holidaysCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* ONLY SUNDAYS & GOVT HOLIDAYS LIST */}
            <Text style={styles.fieldLabel}>Select Outing Date (Sundays & Govt Holidays Only) *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eligibleCardsScroll}
            >
              {filteredDates.map((item) => {
                const isSelected = outDate === item.dateStr;
                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    style={[
                      styles.dateCard,
                      isSelected && (item.isGovtHoliday ? styles.dateCardActiveHoliday : styles.dateCardActiveSunday),
                    ]}
                    onPress={() => handleSelectEligibleDate(item)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.dateCardTop}>
                      <Text style={[styles.dateCardDay, isSelected && styles.dateCardTextActive]}>
                        {item.dayName}
                      </Text>
                      <View
                        style={[
                          styles.dateBadge,
                          item.isGovtHoliday ? styles.dateBadgeHoliday : styles.dateBadgeSunday,
                          isSelected && { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateBadgeText,
                            item.isGovtHoliday ? styles.dateBadgeTextHoliday : styles.dateBadgeTextSunday,
                            isSelected && { color: '#FFFFFF' },
                          ]}
                        >
                          {item.isGovtHoliday ? 'Govt Holiday' : 'Sunday'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.dateCardFormatted, isSelected && styles.dateCardTextActive]}>
                      {item.formattedDate}
                    </Text>

                    <View style={styles.dateCardTimingRow}>
                      <Clock size={11} color={isSelected ? '#FFFFFF' : colors.textSecondary} />
                      <Text style={[styles.dateCardTimingText, isSelected && styles.dateCardTextActive]}>
                        {item.timingsDescription}
                      </Text>
                    </View>

                    {item.holidayName && (
                      <Text
                        numberOfLines={1}
                        style={[styles.dateCardHolidayName, isSelected && { color: '#E0E7FF' }]}
                      >
                        {item.holidayName}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Curfew & Timing Notification Banner based on chosen date */}
            {dateValidation.isValid ? (
              <View
                style={[
                  styles.curfewBanner,
                  dateValidation.isGovtHoliday && { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
                ]}
              >
                <View style={styles.curfewHeaderRow}>
                  <Clock size={16} color={dateValidation.isGovtHoliday ? '#065F46' : '#B45309'} />
                  <Text
                    style={[
                      styles.curfewTitle,
                      dateValidation.isGovtHoliday && { color: '#065F46' },
                    ]}
                  >
                    {dateValidation.isGovtHoliday
                      ? `Govt Holiday Curfew: 9:00 AM – 2:00 PM (${dateValidation.holidayName || 'Official Holiday'})`
                      : 'Sunday Outing Curfew: 9:00 AM – 4:00 PM'}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.curfewSub,
                    dateValidation.isGovtHoliday && { color: '#047857' },
                  ]}
                >
                  Grace window ends at{' '}
                  <Text style={{ fontWeight: '800' }}>{dateValidation.allowedGraceEnd}</Text>.
                  Instant digital pass is generated directly upon application.
                </Text>
              </View>
            ) : (
              <View style={styles.invalidDateAlert}>
                <AlertCircle size={18} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.invalidDateTitle}>⛔ Non-Outing Date: {outDate}</Text>
                  <Text style={styles.invalidDateSub}>
                    College hostel regulations permit day outings strictly on Sundays (9:00 AM – 4:00 PM) and Declared Government Holidays (9:00 AM – 2:00 PM). Weekdays are non-outing days. Please choose an eligible date above.
                  </Text>
                </View>
              </View>
            )}

            {/* Instant Outpass Generation Banner */}
            <View style={styles.instantNoticeBox}>
              <QrCode size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.instantNoticeTitle}>Instant Gate Pass Generation</Text>
                <Text style={styles.instantNoticeText}>
                  Your digital Outpass with scannable QR Code and barcode token is generated
                  directly upon submission. Present it at the hostel security gate.
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
                <Text style={styles.fieldLabel}>Selected Out Date</Text>
                <View style={[styles.inputBox, !dateValidation.isValid && { borderColor: '#DC2626' }]}>
                  <Calendar size={15} color={colors.primary} />
                  <TextInput
                    style={[styles.textInput, !dateValidation.isValid && { color: '#DC2626', fontWeight: '700' }]}
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
                    placeholder="09:00 AM"
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
                    placeholder={dateValidation.allowedCurfew}
                  />
                </View>
              </View>
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
              style={[
                styles.submitBtn,
                (!dateValidation.isValid || profile?.isOutingBlocked) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !dateValidation.isValid || Boolean(profile?.isOutingBlocked)}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : !dateValidation.isValid ? (
                <>
                  <AlertCircle size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>⛔ Select a Sunday or Govt Holiday</Text>
                </>
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
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
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
  modeSelectorWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeButtonActiveHoliday: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  modeButtonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modeButtonTitleActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modeButtonSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  modeButtonSubtitleActive: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
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
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  policyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  policyNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  policyNoticeText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
    marginTop: 2,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabActiveHoliday: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  eligibleCardsScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 12,
  },
  dateCard: {
    width: 140,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'space-between',
  },
  dateCardActiveSunday: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  dateCardActiveHoliday: {
    backgroundColor: '#059669',
    borderColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  dateCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateCardDay: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  dateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateBadgeSunday: {
    backgroundColor: '#FEF3C7',
  },
  dateBadgeHoliday: {
    backgroundColor: '#D1FAE5',
  },
  dateBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dateBadgeTextSunday: {
    color: '#B45309',
  },
  dateBadgeTextHoliday: {
    color: '#047857',
  },
  dateCardFormatted: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  dateCardTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateCardTimingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dateCardHolidayName: {
    fontSize: 9,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  dateCardTextActive: {
    color: '#FFFFFF',
  },
  invalidDateAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  invalidDateTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  invalidDateSub: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
    marginTop: 2,
  },
  applicantUsnStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
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

