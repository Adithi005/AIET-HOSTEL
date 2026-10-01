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
import * as DocumentPicker from 'expo-document-picker';
import {
  X,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Calendar,
  FileText,
  UserCheck,
  ShieldAlert,
  Landmark,
  QrCode,
  Sparkles,
  Clock,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { LeaveApplication } from '../types';
import { getLeaveEscalationInfo } from '../utils/escalation';
import { checkHolidayOverlap } from '../utils/holidays';
import {
  getCutoffStatus,
  calculateLeaveSessionDays,
  getMinEligibleLeaveStartDate,
  getEligibleLeaveDatesList,
  validateLeaveStartDate,
} from '../utils/leaveTiming';

interface ApplyLeaveModalProps {
  visible: boolean;
  leavesCount: number;
  usn?: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
  onApplyLeave: (params: {
    leaveType: LeaveApplication['leaveType'];
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    startSession?: 'Morning' | 'Evening';
    returnSession?: 'Morning' | 'Evening';
    medicalDocumentUri?: string;
    medicalDocumentName?: string;
    isGovtHoliday?: boolean;
    holidayName?: string;
  }) => Promise<any>;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({
  visible,
  leavesCount,
  usn = '1RV22CS089',
  onClose,
  onSubmitSuccess,
  onApplyLeave,
}) => {
  // Institutional Policy: Leave must be applied 2 days before 5:00 PM.
  // E.g., if today is Sep 29, applications start strictly from Oct 2.
  const minLeaveEligible = React.useMemo(() => getMinEligibleLeaveStartDate(), []);
  const eligibleDatesList = React.useMemo(() => getEligibleLeaveDatesList(), []);

  const defaultEnd = React.useMemo(() => {
    const parts = minLeaveEligible.minDateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    d.setDate(d.getDate() + 2);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, [minLeaveEligible]);

  const [leaveType, setLeaveType] = useState<LeaveApplication['leaveType']>('Home Visit');
  const [startDate, setStartDate] = useState(minLeaveEligible.minDateStr);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [startSession, setStartSession] = useState<'Morning' | 'Evening'>('Morning');
  const [returnSession, setReturnSession] = useState<'Morning' | 'Evening'>('Morning');
  const [totalDays, setTotalDays] = useState('3');
  const [reason, setReason] = useState('');
  const [medicalDocName, setMedicalDocName] = useState<string | null>(null);
  const [medicalDocUri, setMedicalDocUri] = useState<string | null>(null);
  const [isManualGovtHoliday, setIsManualGovtHoliday] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const escalation = getLeaveEscalationInfo(leavesCount);

  const holidayCheck = checkHolidayOverlap(startDate, endDate);
  const isGovtHoliday = isManualGovtHoliday || holidayCheck.isHoliday;
  const holidayName = holidayCheck.holidayNames || 'Government / College Declared Holiday';

  // 2-Day Prior 5:00 PM Cutoff Check and Minimum Date Validation
  const cutoff = getCutoffStatus(startDate);
  const leaveDateValidation = validateLeaveStartDate(startDate);
  const isDateBeforeMinimum = !leaveDateValidation.isAllowed;
  const isCutoffMissed = (cutoff.isMissed || isDateBeforeMinimum) && !isGovtHoliday;

  // Session Quota & Weekend Exemption Calculation
  const sessionCalc = calculateLeaveSessionDays({
    startDate,
    startSession,
    endDate,
    returnSession,
    isGovtHoliday,
  });

  // Keep totalDays in sync with sessionCalc calendar days
  React.useEffect(() => {
    if (sessionCalc.totalCalendarDays > 0) {
      setTotalDays(String(sessionCalc.totalCalendarDays));
    }
  }, [startDate, startSession, endDate, returnSession, sessionCalc.totalCalendarDays]);


  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setMedicalDocName(file.name);
        setMedicalDocUri(file.uri);
      }
    } catch (err) {
      console.warn('Doc picker err', err);
      // Fallback for mock in web demo if picker is cancelled or restricted
      const mockFileName = `Medical_Fitness_Cert_${Date.now()}.pdf`;
      setMedicalDocName(mockFileName);
      setMedicalDocUri('https://example.com/docs/medical_cert.pdf');
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please enter a valid reason for your leave request.');
      return;
    }

    const days = parseInt(totalDays, 10) || sessionCalc.totalCalendarDays || 1;
    if (days <= 0) {
      Alert.alert('Invalid Days', 'Please specify a valid number of days.');
      return;
    }

    const isGoingHome = leaveType === 'Home Visit';

    // 2-DAY PRIOR 5:00 PM CUTOFF & ADVANCE NOTICE ENFORCEMENT:
    // If the student fails to apply at least 2 days before 5:00 PM, or selects a short-notice departure date, only the AO Admin can generate a Duplicate / Compensation Pass!
    if (isCutoffMissed) {
      Alert.alert(
        '⛔ Application Cutoff Passed (2 Days Before 5:00 PM)',
        `Institutional Leave Rule:\nStudents must apply for hostel leave at least 2 days before 5:00 PM.\n\nAs of today (${minLeaveEligible.todayFormatted}), leave applications start from ${minLeaveEligible.minFormatted} onwards.\n\nThe requested departure on ${startDate} is closed for student self-submission.\n\nOnly the Administrative Officer (AO Admin) can generate an authorized Duplicate Pass or Compensation Pass by entering your USN, departure & return dates, and departure & return times.`
      );
      return;
    }


    // MANDATORY VALIDATION: If leaves >= 10, medical doc is required for medical leaves!
    if (escalation.requiresMedicalCert && !medicalDocUri && leaveType === 'Medical') {
      Alert.alert(
        '⚠️ Limitation of Leave Expired',
        'You have exceeded the allowed threshold of 10 leaves. Under hostel disciplinary regulations, uploading an authorized medical document or doctor certificate is strictly mandatory for medical leave.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onApplyLeave({
        leaveType,
        startDate,
        endDate,
        totalDays: days,
        startSession,
        returnSession,
        reason: reason.trim(),
        medicalDocumentUri: medicalDocUri || undefined,
        medicalDocumentName: medicalDocName || undefined,
        isGovtHoliday,
        holidayName: isGovtHoliday ? holidayName : undefined,
      });
      setIsSubmitting(false);

      if (sessionCalc.isWeekendExempt) {
        Alert.alert(
          '🏖️ Weekend Exemption Leave Queued',
          'Saturday PM to Monday AM leave applied (0 Days charged to quota). This leave requires explicit sanction by the Administrative Officer (AO).'
        );
      } else if (cutoff.isMissed) {
        Alert.alert(
          '⚠️ Late Application Submitted',
          `You missed the 2-day prior 5:00 PM cutoff for ${startDate}.\nYour application is queued. If urgent gate departure is required, please request the Administrative Officer (AO) to issue an AO Duplicate Coupon.`
        );
      } else if (isGovtHoliday) {
        Alert.alert(
          '⚡ Govt Holiday Pass Generated!',
          `Your pass for "${holidayName}" has been directly generated! This leave is NOT considered against your personal quota (0 Days charged).`
        );
      } else if (isGoingHome) {
        Alert.alert(
          '🎉 Going Home Outpass Generated!',
          'Your Home Visit application has been automatically approved and an official Gate Pass Token has been generated immediately.'
        );
      } else {
        Alert.alert(
          'Leave Application Submitted',
          `Your request has been queued for ${escalation.requiredApprover} approval.`
        );
      }

      onClose();
      onSubmitSuccess();
    } catch (e) {
      setIsSubmitting(false);
      Alert.alert('Submission Error', 'Could not submit leave application.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Apply for Hostel Leave</Text>
              <Text style={styles.modalSubtitle}>
                Cumulative Leaves Taken: <Text style={styles.boldText}>{leavesCount}</Text> (Govt holidays exempt)
              </Text>
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
              <Text style={styles.applicantUsnValue}>{usn}</Text>
              <Text style={styles.applicantUsnPolicy}>(Only USN is displayed or revealed on application)</Text>
            </View>

            {/* ESCALATION BANNER */}
            {escalation.isExpiredLimit ? (
              <View style={styles.expiredBanner}>
                <View style={styles.bannerHeader}>
                  <ShieldAlert size={22} color={colors.danger} />
                  <Text style={styles.expiredTitle}>LIMITATION OF LEAVE IS EXPIRED!</Text>
                </View>
                <Text style={styles.expiredDescription}>
                  You have taken {leavesCount} leaves, reaching the absolute quota. Any further
                  leave or extension is subject to direct sanction by the{' '}
                  <Text style={{ fontWeight: '700' }}>College Principal</Text>.
                </Text>
                <View style={styles.requirementPill}>
                  <AlertTriangle size={15} color="#991B1B" />
                  <Text style={styles.requirementText}>
                    Mandatory: Attach medical certificate / emergency proof
                  </Text>
                </View>
              </View>
            ) : (
              <View style={[styles.tierCard, { borderLeftColor: escalation.color }]}>
                <View style={styles.tierHeader}>
                  <UserCheck size={18} color={escalation.color} />
                  <Text style={[styles.tierTitle, { color: escalation.color }]}>
                    {escalation.tierLabel}
                  </Text>
                </View>
                <Text style={styles.tierDesc}>{escalation.description}</Text>
              </View>
            )}

            {/* Leave Type Selector */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.pillContainer}>
              {(['Home Visit', 'Medical', 'Academic / Hackathon', 'Personal / Emergency'] as const).map(
                (type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typePill,
                      leaveType === type && styles.typePillActive,
                    ]}
                    onPress={() => setLeaveType(type)}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        leaveType === type && styles.typePillTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* INSTANT OUTPASS FOR GOING HOME */}
            {leaveType === 'Home Visit' && (
              <View style={styles.autoOutpassNotice}>
                <Sparkles size={16} color="#0D9488" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoOutpassTitle}>⚡ Auto-Approved Instant Outpass</Text>
                  <Text style={styles.autoOutpassText}>
                    Requests for Going Home are auto-sanctioned with verified parent intimation.
                    Your official Gate Pass Token will generate immediately upon submitting.
                  </Text>
                </View>
              </View>
            )}

            {/* ADVANCE NOTICE POLICY BANNER */}
            <View style={styles.advanceRuleNotice}>
              <Clock size={16} color="#4338CA" />
              <View style={{ flex: 1 }}>
                <Text style={styles.advanceRuleTitle}>2-Day Prior 5:00 PM Advance Notice Rule</Text>
                <Text style={styles.advanceRuleText}>
                  Today is <Text style={{ fontWeight: '700' }}>{minLeaveEligible.todayFormatted}</Text>. Earliest departure date you can apply for is{' '}
                  <Text style={{ fontWeight: '800', color: '#312E81' }}>{minLeaveEligible.minFormatted}</Text>. Earlier dates require an AO Admin Compensation Pass.
                </Text>
              </View>
            </View>

            {/* QUICK-SELECT ELIGIBLE DEPARTURE DATES (FROM MIN DATE) */}
            <Text style={styles.fieldLabel}>
              Eligible Departure Dates (From {minLeaveEligible.minFormatted}) *
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickDatesScroll}
            >
              {eligibleDatesList.map((item) => {
                const isSelected = startDate === item.dateStr;
                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    style={[styles.quickDateChip, isSelected && styles.quickDateChipActive]}
                    onPress={() => {
                      setStartDate(item.dateStr);
                      const p = item.dateStr.split('-');
                      const d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
                      d.setDate(d.getDate() + 2);
                      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                      setEndDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.quickDateDay, isSelected && styles.quickDateTextActive]}>
                      {item.dayName}
                    </Text>
                    <Text style={[styles.quickDateFormatted, isSelected && styles.quickDateTextActive]}>
                      {item.formattedDate}
                    </Text>
                    {item.isWeekend && (
                      <View
                        style={[
                          styles.quickDateBadge,
                          isSelected && { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickDateBadgeText,
                            isSelected && { color: '#FFFFFF' },
                          ]}
                        >
                          Weekend
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Dates & Days */}
            <View style={styles.rowFields}>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <View style={[styles.inputWithIcon, isDateBeforeMinimum && styles.inputWithIconError]}>
                  <Calendar size={16} color={isDateBeforeMinimum ? '#DC2626' : colors.textMuted} />
                  <TextInput
                    style={[styles.textInputInline, isDateBeforeMinimum && { color: '#DC2626', fontWeight: '700' }]}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <View style={styles.inputWithIcon}>
                  <Calendar size={16} color={colors.textMuted} />
                  <TextInput
                    style={styles.textInputInline}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={{ width: 75, minWidth: 70 }}>
                <Text style={styles.fieldLabel}>Days</Text>
                <TextInput
                  style={styles.textInputDays}
                  value={totalDays}
                  onChangeText={setTotalDays}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* 2-DAY PRIOR 5:00 PM CUTOFF BANNER */}
            {isCutoffMissed ? (
              <View style={styles.cutoffMissedBanner}>
                <View style={styles.cutoffBannerHeader}>
                  <ShieldAlert size={18} color="#DC2626" />
                  <Text style={styles.cutoffMissedTitle}>⛔ 2-Day Prior 5:00 PM Cutoff (Direct Submission Blocked)</Text>
                </View>
                <Text style={styles.cutoffMissedText}>
                  Applications for departure on <Text style={{ fontWeight: '800' }}>{startDate}</Text> cannot be submitted directly. As of today ({minLeaveEligible.todayFormatted}), leave can only be applied starting from <Text style={{ fontWeight: '800', color: '#1E3A8A' }}>{minLeaveEligible.minFormatted}</Text>.
                  {'\n\n'}
                  <Text style={{ fontWeight: '800', color: '#991B1B' }}>Institutional Policy: </Text>
                  If you require departure before {minLeaveEligible.minFormatted} (such as {startDate}), you must contact the <Text style={{ fontWeight: '800' }}>Administrative Officer (AO Admin)</Text> to generate an official <Text style={{ fontWeight: '800', color: '#7C2D12' }}>Duplicate Pass / Compensation Pass</Text>.
                </Text>
              </View>
            ) : (
              <View style={styles.cutoffValidBanner}>
                <CheckCircle2 size={15} color="#16A34A" />
                <Text style={styles.cutoffValidText}>
                  On-Time: 2-day cutoff met. Departure starts on or after {minLeaveEligible.minFormatted}.
                </Text>
              </View>
            )}


            {/* DEPARTURE & RETURN SESSION SELECTOR */}
            <View style={styles.sessionSection}>
              <View style={styles.sessionCol}>
                <Text style={styles.sessionColLabel}>Departure Session</Text>
                <View style={styles.sessionPillRow}>
                  <TouchableOpacity
                    style={[styles.sessionPill, startSession === 'Morning' && styles.sessionPillActive]}
                    onPress={() => setStartSession('Morning')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sessionPillText, startSession === 'Morning' && styles.sessionPillTextActive]}>
                      🌅 Morning
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sessionPill, startSession === 'Evening' && styles.sessionPillActive]}
                    onPress={() => setStartSession('Evening')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sessionPillText, startSession === 'Evening' && styles.sessionPillTextActive]}>
                      🌇 Evening
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sessionCol}>
                <Text style={styles.sessionColLabel}>Return Session</Text>
                <View style={styles.sessionPillRow}>
                  <TouchableOpacity
                    style={[styles.sessionPill, returnSession === 'Morning' && styles.sessionPillActive]}
                    onPress={() => setReturnSession('Morning')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sessionPillText, returnSession === 'Morning' && styles.sessionPillTextActive]}>
                      🌅 Morning
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sessionPill, returnSession === 'Evening' && styles.sessionPillActive]}
                    onPress={() => setReturnSession('Evening')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sessionPillText, returnSession === 'Evening' && styles.sessionPillTextActive]}>
                      🌇 Evening
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* SESSION QUOTA BREAKDOWN CARD */}
            <View style={styles.sessionQuotaCard}>
              <View style={styles.sessionQuotaRow}>
                <Text style={styles.sessionQuotaLabel}>Total Calendar Duration:</Text>
                <Text style={styles.sessionQuotaVal}>{sessionCalc.totalCalendarDays} Days</Text>
              </View>
              <View style={styles.sessionQuotaRow}>
                <Text style={styles.sessionQuotaLabel}>Charged against 10-Leave Quota:</Text>
                <Text style={[styles.sessionQuotaValBold, { color: sessionCalc.chargedDays === 0 ? '#16A34A' : colors.primary }]}>
                  {sessionCalc.chargedDays} Days
                </Text>
              </View>

              {sessionCalc.isEveningDeparture && (
                <View style={styles.sessionNoteBadge}>
                  <Text style={styles.sessionNoteText}>
                    🌇 Evening Departure: Departure day ({startDate}) is NOT counted. Leave quota counting begins next day.
                  </Text>
                </View>
              )}

              {sessionCalc.isWeekendExempt && (
                <View style={[styles.sessionNoteBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                  <Text style={[styles.sessionNoteText, { color: '#92400E' }]}>
                    🏖️ Weekend Exemption: Saturday PM to Monday AM is 0 days counted against quota (requires AO Sanction).
                  </Text>
                </View>
              )}
            </View>

            {/* GOVERNMENT HOLIDAY EXEMPTION NOTICE */}
            {isGovtHoliday ? (
              <View style={styles.govtHolidayNotice}>
                <Landmark size={18} color="#15803D" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.govtHolidayTitle}>🏛️ Govt Holiday Detected: {holidayName}</Text>
                  <Text style={styles.govtHolidayText}>
                    Exempt from personal quota: 0 Days charged to your 10-leave limitation counter.
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.govtHolidayToggle}
                onPress={() => setIsManualGovtHoliday(!isManualGovtHoliday)}
                activeOpacity={0.8}
              >
                <Landmark size={14} color={isManualGovtHoliday ? '#15803D' : colors.textSecondary} />
                <Text style={[styles.govtHolidayToggleText, isManualGovtHoliday && { color: '#15803D', fontWeight: '700' }]}>
                  {isManualGovtHoliday ? '✓ Declared Govt / College Holiday Active' : 'Mark as Declared Govt / Festival Holiday (Exempt from Quota)'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason for Leave</Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="State the detailed reason for your leave request..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            {/* MEDICAL CERTIFICATE UPLOAD SECTION */}
            <View style={styles.uploadSection}>
              <View style={styles.uploadHeader}>
                <Text style={styles.fieldLabel}>
                  {escalation.requiresMedicalCert
                    ? 'Medical Document (Mandatory) *'
                    : 'Supporting Document (Optional)'}
                </Text>
                {escalation.requiresMedicalCert && (
                  <Text style={styles.requiredBadge}>Required</Text>
                )}
              </View>

              {medicalDocName ? (
                <View style={styles.uploadedFileCard}>
                  <FileText size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uploadedFileName} numberOfLines={1}>
                      {medicalDocName}
                    </Text>
                    <Text style={styles.uploadedFileSub}>Document attached</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setMedicalDocName(null);
                      setMedicalDocUri(null);
                    }}
                  >
                    <X size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    escalation.requiresMedicalCert && styles.uploadButtonUrgent,
                  ]}
                  onPress={handlePickDocument}
                  activeOpacity={0.8}
                >
                  <Upload
                    size={20}
                    color={escalation.requiresMedicalCert ? colors.dangerDark : colors.primary}
                  />
                  <Text
                    style={[
                      styles.uploadBtnText,
                      escalation.requiresMedicalCert && { color: colors.dangerDark },
                    ]}
                  >
                    {escalation.requiresMedicalCert
                      ? 'Upload Medical Certificate / Proof (PDF / Image)'
                      : 'Attach Proof (Optional)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Privacy Guarantee Note */}
            <View style={styles.privacyNoteBox}>
              <CheckCircle2 size={16} color={colors.secondary} />
              <Text style={styles.privacyNoteText}>
                <Text style={{ fontWeight: '700' }}>Privacy Notice: </Text>
                On the public hostel out-pass board, only your USN is displayed. Your name, phone,
                and personal details are kept private.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                ((escalation.requiresMedicalCert && !medicalDocUri) || isCutoffMissed) &&
                  styles.submitBtnDisabled,
                isCutoffMissed && styles.submitBtnCutoffBlocked,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || isCutoffMissed}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isCutoffMissed
                    ? `⛔ Blocked: Apply From ${minLeaveEligible.minFormatted} (Contact AO)`
                    : escalation.requiresMedicalCert
                    ? 'Submit to Principal'
                    : `Submit to ${escalation.requiredApprover}`}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  boldText: {
    fontWeight: '700',
    color: colors.primary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  expiredBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expiredTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  expiredDescription: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 6,
    lineHeight: 17,
  },
  requirementPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  requirementText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  tierCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tierTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tierDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typePillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  typePillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  typePillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  textInputInline: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  textInputDays: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  textArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requiredBadge: {
    fontSize: 10,
    color: colors.danger,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight,
    paddingVertical: 14,
    borderRadius: 10,
  },
  uploadButtonUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.danger,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  uploadedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    padding: 12,
  },
  uploadedFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  uploadedFileSub: {
    fontSize: 11,
    color: colors.successDark,
    fontWeight: '500',
  },
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.secondarySubtle,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 20,
  },
  privacyNoteText: {
    fontSize: 11,
    color: '#0F766E',
    flex: 1,
    lineHeight: 15,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: colors.textMuted,
  },
  submitBtnCutoffBlocked: {
    backgroundColor: '#DC2626',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  autoOutpassNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 14,
  },
  autoOutpassTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 2,
  },
  autoOutpassText: {
    fontSize: 11,
    color: '#134E4A',
    lineHeight: 15,
  },
  govtHolidayNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 14,
  },
  govtHolidayTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  govtHolidayText: {
    fontSize: 11,
    color: '#14532D',
    lineHeight: 15,
  },
  govtHolidayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceCard,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  govtHolidayToggleText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cutoffMissedBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  cutoffBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cutoffMissedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },
  cutoffMissedText: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
  },
  cutoffValidBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    marginBottom: 12,
  },
  cutoffValidText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  sessionSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sessionCol: {
    flex: 1,
    minWidth: 135,
  },
  sessionColLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionPillRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  sessionPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  sessionPillActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  sessionPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sessionPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sessionQuotaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 6,
  },
  sessionQuotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionQuotaLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sessionQuotaVal: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
  sessionQuotaValBold: {
    fontSize: 12,
    fontWeight: '800',
  },
  sessionNoteBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    padding: 6,
    marginTop: 2,
  },
  sessionNoteText: {
    fontSize: 10.5,
    color: '#1E40AF',
    lineHeight: 14,
    fontWeight: '500',
  },
  advanceRuleNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  advanceRuleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3730A3',
  },
  advanceRuleText: {
    fontSize: 11,
    color: '#312E81',
    lineHeight: 16,
    marginTop: 2,
  },
  quickDatesScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 12,
  },
  quickDateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 78,
  },
  quickDateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  quickDateDay: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  quickDateFormatted: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  quickDateTextActive: {
    color: '#FFFFFF',
  },
  quickDateBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginTop: 3,
  },
  quickDateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  inputWithIconError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
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


