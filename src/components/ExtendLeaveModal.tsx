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
  Clock,
  AlertTriangle,
  Upload,
  CheckCircle2,
  FileText,
  Calendar,
  ShieldAlert,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { LeaveApplication } from '../types';
import { getLeaveEscalationInfo } from '../utils/escalation';

interface ExtendLeaveModalProps {
  visible: boolean;
  leave: LeaveApplication | null;
  currentLeavesCount: number;
  onClose: () => void;
  onExtendSuccess: () => void;
  onExtendLeave: (params: {
    leaveId: string;
    additionalDays: number;
    extensionReason: string;
    medicalDocumentUri?: string;
    medicalDocumentName?: string;
  }) => Promise<any>;
}

export const ExtendLeaveModal: React.FC<ExtendLeaveModalProps> = ({
  visible,
  leave,
  currentLeavesCount,
  onClose,
  onExtendSuccess,
  onExtendLeave,
}) => {
  const [extraDays, setExtraDays] = useState('2');
  const [reason, setReason] = useState('');
  const [medicalDocName, setMedicalDocName] = useState<string | null>(null);
  const [medicalDocUri, setMedicalDocUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!leave) return null;

  const addedDays = parseInt(extraDays, 10) || 0;
  const projectedTotalLeaves = currentLeavesCount + addedDays;
  const escalation = getLeaveEscalationInfo(projectedTotalLeaves);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setMedicalDocName(res.assets[0].name);
        setMedicalDocUri(res.assets[0].uri);
      }
    } catch {
      setMedicalDocName(`Medical_Cert_Ext_${Date.now()}.pdf`);
      setMedicalDocUri('https://example.com/docs/ext_cert.pdf');
    }
  };

  const handleConfirmExtension = async () => {
    if (addedDays <= 0) {
      Alert.alert('Invalid Days', 'Please select at least 1 extension day.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please provide a short reason for extension.');
      return;
    }

    // Check > 10 limitation rule
    if (escalation.requiresMedicalCert && !medicalDocUri) {
      Alert.alert(
        'Medical Document Required',
        'Your extension exceeds 10 total leaves. Uploading an official medical document is required for Principal approval.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onExtendLeave({
        leaveId: leave.id,
        additionalDays: addedDays,
        extensionReason: reason.trim(),
        medicalDocumentUri: medicalDocUri || undefined,
        medicalDocumentName: medicalDocName || undefined,
      });
      setIsSubmitting(false);
      Alert.alert(
        'Leave Extended',
        `Your leave has been extended by ${addedDays} day(s). Updated gate pass token generated.`
      );
      onClose();
      onExtendSuccess();
    } catch {
      setIsSubmitting(false);
      Alert.alert('Error', 'Could not process extension.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Extend Approved Leave</Text>
              <Text style={styles.modalSub}>{leave.id} • {leave.leaveType}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Current Leave Summary */}
            <View style={styles.currentInfoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current Approved Duration:</Text>
                <Text style={styles.infoVal}>
                  {leave.startDate} to {leave.endDate} ({leave.totalDays} Days)
                </Text>
              </View>
              {leave.gateToken && (
                <View style={[styles.infoRow, { marginTop: 4 }]}>
                  <Text style={styles.infoLabel}>Active Gate Token:</Text>
                  <Text style={styles.tokenVal}>{leave.gateToken}</Text>
                </View>
              )}
            </View>

            {/* Escalation Warning if Extension crosses 10 */}
            {escalation.isExpiredLimit && (
              <View style={styles.alertCard}>
                <ShieldAlert size={18} color={colors.dangerDark} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Limitation of Leave is Expired!</Text>
                  <Text style={styles.alertDesc}>
                    Extension pushes your leaves to {projectedTotalLeaves} days (&gt;10). Principal
                    approval and medical certificate upload are mandatory.
                  </Text>
                </View>
              </View>
            )}

            {/* Extra Days Selector */}
            <Text style={styles.fieldLabel}>Extend By (Days)</Text>
            <View style={styles.daysRow}>
              {[1, 2, 3, 4, 5].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayPill, extraDays === String(d) && styles.dayPillActive]}
                  onPress={() => setExtraDays(String(d))}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      extraDays === String(d) && styles.dayPillTextActive,
                    ]}
                  >
                    +{d} Day{d > 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason for Extension</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Train ticket rescheduled, health rest advised..."
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={2}
            />

            {/* Medical Doc Upload if required */}
            <View style={styles.uploadSection}>
              <Text style={styles.fieldLabel}>
                {escalation.requiresMedicalCert
                  ? 'Medical Document (Mandatory for >10 Leaves) *'
                  : 'Medical / Proof Attachment (Optional)'}
              </Text>

              {medicalDocName ? (
                <View style={styles.attachedDocRow}>
                  <FileText size={18} color={colors.primary} />
                  <Text style={styles.attachedDocName} numberOfLines={1}>
                    {medicalDocName}
                  </Text>
                  <TouchableOpacity onPress={() => setMedicalDocName(null)}>
                    <X size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.uploadBtn,
                    escalation.requiresMedicalCert && styles.uploadBtnUrgent,
                  ]}
                  onPress={handlePickDocument}
                >
                  <Upload
                    size={16}
                    color={escalation.requiresMedicalCert ? colors.dangerDark : colors.primary}
                  />
                  <Text
                    style={[
                      styles.uploadBtnText,
                      escalation.requiresMedicalCert && { color: colors.dangerDark },
                    ]}
                  >
                    {escalation.requiresMedicalCert
                      ? 'Upload Doctor Certificate / Proof'
                      : 'Attach Document'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                escalation.requiresMedicalCert && !medicalDocName && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirmExtension}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmText}>
                  Confirm +{extraDays} Day Extension
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
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  currentInfoBox: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  tokenVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  alertDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 15,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: colors.text,
    minHeight: 50,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  uploadSection: {
    marginBottom: 14,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 10,
    borderRadius: 8,
  },
  uploadBtnUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.danger,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  attachedDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primarySubtle,
    padding: 10,
    borderRadius: 8,
  },
  attachedDocName: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: colors.textMuted,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
