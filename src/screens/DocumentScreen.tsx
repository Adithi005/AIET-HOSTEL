import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  GraduationCap,
  FileText,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Award,
  BookOpen,
  Plus,
  FileCheck,
  Eye,
  Trash2,
  X,
  Clock,
  AlertCircle,
  Building,
  Receipt,
  ShieldAlert,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors } from '../theme/colors';
import { UserProfile, SemesterRecord, StudentDocument, AoPetitionType, AoStudentPetition } from '../types';
import { StorageService } from '../services/storage';

export const DocumentScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [academics, setAcademics] = useState<SemesterRecord[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [selectedSem, setSelectedSem] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<'academics' | 'documents' | 'petitions'>('academics');

  // Document Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<StudentDocument['category']>('Marks Card');
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);

  // AO Office Petitions state (Fees Delay, Mess Bill Reduction, Study Certificate, Marks Card)
  const [petitions, setPetitions] = useState<AoStudentPetition[]>([]);
  const [isPetitionModalOpen, setIsPetitionModalOpen] = useState(false);
  const [petitionType, setPetitionType] = useState<AoPetitionType>('Fees Delay Permission');
  const [petitionReason, setPetitionReason] = useState('');
  const [petitionExpectedPaymentDate, setPetitionExpectedPaymentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [petitionReductionDays, setPetitionReductionDays] = useState('7');
  const [petitionPurpose, setPetitionPurpose] = useState('');
  const [petitionTargetSemester, setPetitionTargetSemester] = useState(5);
  const [isSubmittingPetition, setIsSubmittingPetition] = useState(false);

  const loadData = useCallback(async () => {
    const p = await StorageService.getProfile();
    const a = await StorageService.getAcademics();
    const d = await StorageService.getDocuments();
    const pet = await StorageService.getAoPetitions(p?.usn || '1RV22CS089');
    setProfile(p);
    setAcademics(a);
    setDocuments(d);
    setPetitions(pet);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const currentSemRecord = academics.find((s) => s.semester === selectedSem) || academics[0];

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setSelectedFile({ name: file.name, uri: file.uri });
        if (!docTitle) {
          setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      console.warn('Document picker error', err);
      // Fallback
      setSelectedFile({
        name: `Academic_Doc_Sem${selectedSem}.pdf`,
        uri: 'https://example.com/docs/sample.pdf',
      });
    }
  };

  const handleSaveDocument = async () => {
    if (!docTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for the document.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('File Required', 'Please choose a file to upload.');
      return;
    }

    await StorageService.uploadDocument({
      title: docTitle.trim(),
      category: docCategory,
      semester: selectedSem,
      fileName: selectedFile.name,
      fileUri: selectedFile.uri,
    });

    Alert.alert('Uploaded', 'Document successfully stored in your 4-year vault.');
    setIsUploadModalOpen(false);
    setDocTitle('');
    setSelectedFile(null);
    await loadData();
  };

  const handleSubmitPetition = async () => {
    if (!petitionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a clear justification for your application to the AO.');
      return;
    }
    setIsSubmittingPetition(true);
    try {
      const studentUsn = profile?.usn || '1RV22CS089';
      const studentName = profile?.name || 'Adithya Shenoy';
      const roomNumber = profile?.roomNumber || 'B-304';
      const hostelBlock = profile?.hostelBlock || 'Cauvery Block';

      await StorageService.submitAoPetition({
        usn: studentUsn,
        studentName,
        roomNumber,
        hostelBlock,
        type: petitionType,
        reason: petitionReason.trim(),
        expectedPaymentDate: petitionType === 'Fees Delay Permission' ? petitionExpectedPaymentDate : undefined,
        reductionDays: petitionType === 'Mess Bill Reduction' ? (parseInt(petitionReductionDays, 10) || 7) : undefined,
        purpose: (petitionType === 'Study Certificate' || petitionType === 'Marks Card / Grade Transcript') ? (petitionPurpose.trim() || 'Official Administrative Clearance') : undefined,
        targetSemester: petitionType === 'Marks Card / Grade Transcript' ? petitionTargetSemester : undefined,
      });

      setIsPetitionModalOpen(false);
      setPetitionReason('');
      setPetitionPurpose('');
      await loadData();

      Alert.alert(
        'Petition Submitted to AO Desk',
        `Your application for ${petitionType} has been submitted directly to the Administrative Officer.\n\nInstitutional Jurisdiction: Only the AO can review and sanction fee extensions, mess adjustments, and official certificates. Track status below.`
      );
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not submit petition.');
    } finally {
      setIsSubmittingPetition(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topNavBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
          activeOpacity={0.75}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Academic & Document Vault</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Banner */}
        <View style={styles.vaultBanner}>
          <View style={styles.vaultBannerRow}>
            <View style={styles.bannerIconWrap}>
              <Award size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vaultTitle}>4-Year Academic & Document Vault</Text>
              <Text style={styles.vaultSubtitle}>
                Persistent record of Semesters 1 to 8 • IA Marks, Attendance & Official Proofs
              </Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher: 4-Year Academics vs Uploaded Documents */}
        <View style={styles.mainTabRow}>
          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'academics' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('academics')}
          >
            <GraduationCap
              size={16}
              color={activeTab === 'academics' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.mainTabBtnText,
                activeTab === 'academics' && styles.mainTabBtnTextActive,
              ]}
            >
              4-Year Sem Records
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'documents' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('documents')}
          >
            <FileText
              size={16}
              color={activeTab === 'documents' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.mainTabBtnText,
                activeTab === 'documents' && styles.mainTabBtnTextActive,
              ]}
            >
              Vault ({documents.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeTab === 'petitions' && styles.mainTabBtnActive]}
            onPress={() => setActiveTab('petitions')}
          >
            <Building
              size={16}
              color={activeTab === 'petitions' ? '#0D9488' : colors.textSecondary}
            />
            <Text
              style={[
                styles.mainTabBtnText,
                activeTab === 'petitions' && { color: '#0D9488', fontWeight: '800' },
              ]}
            >
              AO Desk ({petitions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* =======================================================
            TAB 1: 4-YEAR SEMESTER WISE RECORDS (Sem 1 to Sem 8)
           ======================================================= */}
        {activeTab === 'academics' && (
          <View>
            {/* Semester Chips (1 to 8) */}
            <Text style={styles.subHeading}>SELECT SEMESTER (4-YEAR RECORD)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semScroll}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <TouchableOpacity
                  key={sem}
                  style={[styles.semChip, selectedSem === sem && styles.semChipActive]}
                  onPress={() => setSelectedSem(sem)}
                >
                  <Text style={[styles.semChipText, selectedSem === sem && styles.semChipTextActive]}>
                    Sem {sem}
                  </Text>
                  {sem === profile?.currentSemester && (
                    <View style={styles.currentDot} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Semester Overview Stats */}
            <View style={styles.semOverviewCard}>
              <View style={styles.semOverviewTop}>
                <View>
                  <Text style={styles.semTitle}>Semester {currentSemRecord.semester}</Text>
                  <Text style={styles.semYear}>{currentSemRecord.academicYear}</Text>
                </View>

                {currentSemRecord.sgpa > 0 ? (
                  <View style={styles.gpaBadge}>
                    <Text style={styles.gpaLabel}>SGPA</Text>
                    <Text style={styles.gpaVal}>{currentSemRecord.sgpa.toFixed(2)}</Text>
                  </View>
                ) : (
                  <View style={styles.upcomingBadge}>
                    <Text style={styles.upcomingBadgeText}>In Progress</Text>
                  </View>
                )}
              </View>

              <View style={styles.semMetricsRow}>
                <View style={styles.semMetricItem}>
                  <Text style={styles.semMetricLabel}>Overall Attendance</Text>
                  <Text
                    style={[
                      styles.semMetricVal,
                      {
                        color:
                          currentSemRecord.overallAttendance >= 75
                            ? colors.successDark
                            : currentSemRecord.overallAttendance > 0
                            ? colors.danger
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {currentSemRecord.overallAttendance > 0
                      ? `${currentSemRecord.overallAttendance}%`
                      : 'N/A'}
                  </Text>
                </View>

                <View style={styles.semMetricItem}>
                  <Text style={styles.semMetricLabel}>Cumulative CGPA</Text>
                  <Text style={styles.semMetricVal}>
                    {currentSemRecord.cgpa ? currentSemRecord.cgpa.toFixed(2) : '9.04'}
                  </Text>
                </View>

                <View style={styles.semMetricItem}>
                  <Text style={styles.semMetricLabel}>Total Subjects</Text>
                  <Text style={styles.semMetricVal}>
                    {currentSemRecord.subjects.length}
                  </Text>
                </View>
              </View>
            </View>

            {/* Subject Breakdown: IA 1, IA 2, IA 3 & Attendance */}
            <Text style={styles.subHeading}>SUBJECT-WISE IA MARKS & ATTENDANCE</Text>
            <View style={styles.subjectList}>
              {currentSemRecord.subjects.map((subj) => (
                <View key={subj.code} style={styles.subjectCard}>
                  <View style={styles.subjectHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjCode}>{subj.code}</Text>
                      <Text style={styles.subjName}>{subj.name}</Text>
                    </View>
                    <View
                      style={[
                        styles.attTag,
                        subj.attendancePercentage >= 85
                          ? styles.attTagHigh
                          : subj.attendancePercentage >= 75
                          ? styles.attTagMid
                          : styles.attTagLow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.attTagText,
                          subj.attendancePercentage >= 85
                            ? styles.attTextHigh
                            : subj.attendancePercentage >= 75
                            ? styles.attTextMid
                            : styles.attTextLow,
                        ]}
                      >
                        {subj.attendancePercentage > 0 ? `${subj.attendancePercentage}% Att.` : 'N/A'}
                      </Text>
                    </View>
                  </View>

                  {/* IA Scores Row */}
                  <View style={styles.iaRow}>
                    <View style={styles.iaItem}>
                      <Text style={styles.iaTitle}>IA-1</Text>
                      <Text style={styles.iaScore}>
                        {subj.ia1 > 0 ? `${subj.ia1}/${subj.maxIa}` : '—'}
                      </Text>
                    </View>
                    <View style={styles.iaItem}>
                      <Text style={styles.iaTitle}>IA-2</Text>
                      <Text style={styles.iaScore}>
                        {subj.ia2 > 0 ? `${subj.ia2}/${subj.maxIa}` : '—'}
                      </Text>
                    </View>
                    <View style={styles.iaItem}>
                      <Text style={styles.iaTitle}>IA-3</Text>
                      <Text style={styles.iaScore}>
                        {subj.ia3 > 0 ? `${subj.ia3}/${subj.maxIa}` : '—'}
                      </Text>
                    </View>
                    <View style={styles.iaItem}>
                      <Text style={styles.iaTitle}>Classes</Text>
                      <Text style={styles.iaScore}>
                        {subj.classesAttended}/{subj.totalClasses}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =======================================================
            TAB 2: DOCUMENT UPLOADING & VAULT
           ======================================================= */}
        {activeTab === 'documents' && (
          <View>
            <View style={styles.uploadDocBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadBannerTitle}>Official Document Repository</Text>
                <Text style={styles.uploadBannerSub}>
                  Upload Marks Cards, ID Cards, Allotment Letters, and Medical Prescriptions.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.uploadDocBtn}
                onPress={() => setIsUploadModalOpen(true)}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.uploadDocBtnText}>Upload</Text>
              </TouchableOpacity>
            </View>

            {/* Documents List */}
            <View style={styles.docsGrid}>
              {documents.map((doc) => (
                <View key={doc.id} style={styles.docCard}>
                  <View style={styles.docCardTop}>
                    <View style={styles.docIconBox}>
                      <FileCheck size={24} color={colors.primary} />
                    </View>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{doc.category}</Text>
                    </View>
                  </View>

                  <Text style={styles.docTitle} numberOfLines={2}>
                    {doc.title}
                  </Text>
                  <Text style={styles.docFileName} numberOfLines={1}>
                    {doc.fileName}
                  </Text>

                  <View style={styles.docFooter}>
                    <Text style={styles.docDate}>Added {doc.uploadDate}</Text>
                    <TouchableOpacity
                      style={styles.viewDocBtn}
                      onPress={() =>
                        Alert.alert('Document Stored', `Viewing cached file: ${doc.fileName}`)
                      }
                    >
                      <Eye size={14} color={colors.primary} />
                      <Text style={styles.viewDocText}>Preview</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =======================================================
            TAB 3: ADMINISTRATIVE OFFICER (AO) SPECIAL PETITIONS
           ======================================================= */}
        {activeTab === 'petitions' && (
          <View style={{ gap: 14 }}>
            {/* AO Authority Banner */}
            <View style={styles.aoStudentBanner}>
              <View style={styles.aoStudentBannerHeader}>
                <Building size={20} color="#0D9488" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aoStudentBannerTitle}>
                    Administrative Officer (AO) Office Petitions
                  </Text>
                  <Text style={styles.aoStudentBannerSub}>
                    Institutional Executive Jurisdiction: Only the Administrative Officer can sanction fees delay permission, mess bill reduction, study certificates, and official verified marks cards / grade transcripts.
                  </Text>
                </View>
              </View>
            </View>

            {/* Header Action Row */}
            <View style={styles.vaultSectionHeader}>
              <View>
                <Text style={styles.subHeading}>MY AO PETITIONS & CLEARANCES</Text>
                <Text style={styles.subHeadingNote}>Track status of submitted applications</Text>
              </View>
              <TouchableOpacity
                style={styles.applyPetitionBtn}
                onPress={() => setIsPetitionModalOpen(true)}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.applyPetitionBtnText}>Apply to AO</Text>
              </TouchableOpacity>
            </View>

            {petitions.length === 0 ? (
              <View style={styles.emptyPetitionBox}>
                <CheckCircle2 size={36} color="#10B981" />
                <Text style={styles.emptyPetitionTitle}>No Active Petitions</Text>
                <Text style={styles.emptyPetitionSub}>
                  Need a fee payment extension, mess bill rebate, study certificate, or grade transcript? Tap "Apply to AO" above.
                </Text>
              </View>
            ) : (
              petitions.map((item) => {
                const isApproved = item.status === 'Approved by AO';
                const isPending = item.status === 'Pending AO Approval';
                return (
                  <View key={item.id} style={styles.petitionStudentCard}>
                    <View style={styles.petitionStudentCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Award size={16} color="#0D9488" />
                          <Text style={styles.petitionCardTypeTitle}>{item.type}</Text>
                        </View>
                        <Text style={styles.petitionCardDateText}>Applied: {item.requestedDate} • ID: {item.id}</Text>
                      </View>
                      <View
                        style={[
                          styles.petitionStatusBadge,
                          isApproved ? styles.statusApproved : isPending ? styles.statusPending : styles.statusRejected,
                        ]}
                      >
                        <Text style={styles.petitionStatusBadgeText}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Specific details */}
                    <View style={styles.petitionParamBox}>
                      <Text style={styles.petitionReasonText}>
                        <Text style={{ fontWeight: '700' }}>Reason: </Text>
                        "{item.reason}"
                      </Text>

                      {item.expectedPaymentDate && (
                        <View style={styles.petitionParamRow}>
                          <Clock size={13} color="#D97706" />
                          <Text style={styles.petitionParamLabel}>
                            Fee Extension Requested Till: <Text style={{ fontWeight: '800' }}>{item.expectedPaymentDate}</Text>
                          </Text>
                        </View>
                      )}

                      {item.reductionDays !== undefined && (
                        <View style={styles.petitionParamRow}>
                          <Receipt size={13} color="#0D9488" />
                          <Text style={styles.petitionParamLabel}>
                            Mess Bill Rebate Requested: <Text style={{ fontWeight: '800' }}>{item.reductionDays} Days</Text>
                          </Text>
                        </View>
                      )}

                      {item.purpose && (
                        <View style={styles.petitionParamRow}>
                          <FileText size={13} color="#4F46E5" />
                          <Text style={styles.petitionParamLabel}>
                            Institutional Purpose: <Text style={{ fontWeight: '800' }}>{item.purpose}</Text>
                          </Text>
                        </View>
                      )}

                      {item.targetSemester && (
                        <View style={styles.petitionParamRow}>
                          <GraduationCap size={13} color="#7C3AED" />
                          <Text style={styles.petitionParamLabel}>
                            Academic Record: <Text style={{ fontWeight: '800' }}>Semester {item.targetSemester}</Text>
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* AO Approval Section */}
                    {isApproved && (
                      <View style={styles.aoEndorsementCard}>
                        <View style={styles.aoEndorsementHeader}>
                          <CheckCircle2 size={15} color="#059669" />
                          <Text style={styles.aoEndorsementTitle}>Sanctioned by Administrative Officer</Text>
                        </View>
                        {item.certificateRefNumber && (
                          <Text style={styles.aoRefNumberText}>
                            Official Certificate Ref: <Text style={{ fontWeight: '800' }}>{item.certificateRefNumber}</Text>
                          </Text>
                        )}
                        {item.aoRemarks && (
                          <Text style={styles.aoRemarksNote}>
                            Order Note: "{item.aoRemarks}"
                          </Text>
                        )}
                        {item.dispatchedDocumentTitle && (
                          <View style={styles.docDispatchedBox}>
                            <FileCheck size={14} color="#0D9488" />
                            <Text style={styles.docDispatchedText}>{item.dispatchedDocumentTitle}</Text>
                            <TouchableOpacity
                              style={styles.docDownloadMiniBtn}
                              onPress={() => Alert.alert('Verified Document', `Digital seal verified: ${item.dispatchedDocumentTitle}\nReference: ${item.certificateRefNumber}`)}
                            >
                              <Text style={styles.docDownloadMiniText}>View Sealed PDF</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {/* AO Rejection Remarks */}
                    {!isApproved && !isPending && item.aoRemarks && (
                      <View style={styles.aoRejectionCard}>
                        <AlertCircle size={15} color="#DC2626" />
                        <Text style={styles.aoRejectionText}>
                          AO Decline Note: "{item.aoRemarks}"
                        </Text>
                      </View>
                    )}

                    {isPending && (
                      <View style={styles.aoPendingNotice}>
                        <Clock size={13} color="#B45309" />
                        <Text style={styles.aoPendingNoticeText}>
                          Under review at Administrative Officer's Desk. Awaiting official order.
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

      {/* =======================================================
          DOCUMENT UPLOAD MODAL
         ======================================================= */}
      <Modal visible={isUploadModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>Upload Document to Vault</Text>
              <TouchableOpacity onPress={() => setIsUploadModalOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 14 }}>
              <Text style={styles.modalFieldLabel}>Document Title</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Sem 5 Grade Sheet or Medical Certificate"
                placeholderTextColor={colors.textMuted}
                value={docTitle}
                onChangeText={setDocTitle}
              />

              <Text style={styles.modalFieldLabel}>Category</Text>
              <View style={styles.modalCatRow}>
                {(['Marks Card', 'College ID', 'Hostel Pass', 'Medical Certificate', 'Other'] as const).map(
                  (c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.modalCatBtn,
                        docCategory === c && styles.modalCatBtnActive,
                      ]}
                      onPress={() => setDocCategory(c)}
                    >
                      <Text
                        style={[
                          styles.modalCatText,
                          docCategory === c && styles.modalCatTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.modalFieldLabel}>Attach File (PDF or Image)</Text>
              {selectedFile ? (
                <View style={styles.selectedFileBox}>
                  <FileText size={20} color={colors.primary} />
                  <Text style={styles.selectedFileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Trash2 size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.chooseFileBtn}
                  onPress={handlePickDocument}
                  activeOpacity={0.8}
                >
                  <UploadCloud size={22} color={colors.primary} />
                  <Text style={styles.chooseFileText}>Select Document from Device</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.saveDocBtn}
                onPress={handleSaveDocument}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.saveDocBtnText}>Store in 4-Year Vault</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =======================================================
          AO PETITION APPLICATION MODAL
         ======================================================= */}
      <Modal visible={isPetitionModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Building size={18} color="#0D9488" />
                <Text style={styles.modalSheetTitle}>Apply to Administrative Officer</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPetitionModalOpen(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingTop: 14 }}>
              {/* Institutional Notice */}
              <View style={styles.aoModalNoticeCard}>
                <AlertCircle size={15} color="#0D9488" />
                <Text style={styles.aoModalNoticeText}>
                  Only the Administrative Officer (AO Desk) has executive authority to sanction fees extension, mess billing rebates, and official certificates.
                </Text>
              </View>

              {/* APPLICANT IDENTITY: ONLY USN IS DISPLAYED OR REVEALED */}
              <View style={styles.applicantUsnStrip}>
                <View style={styles.applicantUsnBadge}>
                  <Text style={styles.applicantUsnBadgeText}>APPLICANT USN</Text>
                </View>
                <Text style={styles.applicantUsnValue}>{profile?.usn || '1RV22CS089'}</Text>
                <Text style={styles.applicantUsnPolicy}>(Only USN is displayed or revealed)</Text>
              </View>

              <Text style={styles.modalFieldLabel}>SELECT APPLICATION TYPE *</Text>
              {(
                [
                  'Fees Delay Permission',
                  'Mess Bill Reduction',
                  'Study Certificate',
                  'Marks Card / Grade Transcript',
                ] as AoPetitionType[]
              ).map((typeOpt) => {
                const isSelected = petitionType === typeOpt;
                return (
                  <TouchableOpacity
                    key={typeOpt}
                    style={[styles.petitionTypeOptionCard, isSelected && styles.petitionTypeOptionCardActive]}
                    onPress={() => setPetitionType(typeOpt)}
                  >
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.petitionTypeOptionText, isSelected && styles.petitionTypeOptionTextActive]}>
                      {typeOpt}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Dynamic Parameter: Fees Delay */}
              {petitionType === 'Fees Delay Permission' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.modalFieldLabel}>REQUESTED FEE PAYMENT DATE (YYYY-MM-DD) *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={petitionExpectedPaymentDate}
                    onChangeText={setPetitionExpectedPaymentDate}
                    placeholder="e.g. 2026-10-15"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelperText}>
                    Specify the date by which your semester / hostel fees will be deposited.
                  </Text>
                </View>
              )}

              {/* Dynamic Parameter: Mess Bill Reduction */}
              {petitionType === 'Mess Bill Reduction' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.modalFieldLabel}>NUMBER OF REBATE DAYS TO CREDIT *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={petitionReductionDays}
                    onChangeText={setPetitionReductionDays}
                    keyboardType="numeric"
                    placeholder="e.g. 7"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldHelperText}>
                    Subject to continuous absence of 5+ days with approved leave voucher.
                  </Text>
                </View>
              )}

              {/* Dynamic Parameter: Study Certificate */}
              {petitionType === 'Study Certificate' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.modalFieldLabel}>PURPOSE OF STUDY CERTIFICATE *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={petitionPurpose}
                    onChangeText={setPetitionPurpose}
                    placeholder="e.g. Passport Application / Educational Bank Loan"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              {/* Dynamic Parameter: Marks Card / Grade Transcript */}
              {petitionType === 'Marks Card / Grade Transcript' && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.modalFieldLabel}>TARGET SEMESTER (1 to 8) *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 6 }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.semSelectChip,
                          petitionTargetSemester === s && styles.semSelectChipActive,
                        ]}
                        onPress={() => setPetitionTargetSemester(s)}
                      >
                        <Text
                          style={[
                            styles.semSelectChipText,
                            petitionTargetSemester === s && styles.semSelectChipTextActive,
                          ]}
                        >
                          Sem {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>PURPOSE OF TRANSCRIPT *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={petitionPurpose}
                    onChangeText={setPetitionPurpose}
                    placeholder="e.g. Higher Studies / Visa Verification / Internship"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              {/* Detailed Reason */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.modalFieldLabel}>STATEMENT / JUSTIFICATION TO ADMINISTRATIVE OFFICER *</Text>
                <TextInput
                  style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                  value={petitionReason}
                  onChangeText={setPetitionReason}
                  placeholder="Detail why you are requesting this concession or certificate..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.submitAoPetitionBtn, isSubmittingPetition && { opacity: 0.6 }]}
                onPress={handleSubmitPetition}
                disabled={isSubmittingPetition}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={16} color="#FFFFFF" />
                <Text style={styles.submitAoPetitionBtnText}>
                  {isSubmittingPetition ? 'Forwarding to AO...' : 'Submit Petition to AO Desk'}
                </Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  topNavTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
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
  vaultBanner: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  vaultBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  vaultSubtitle: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
    lineHeight: 15,
  },
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  mainTabBtnActive: {
    backgroundColor: colors.primarySubtle,
  },
  mainTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  mainTabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  semScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  semChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    position: 'relative',
  },
  semChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  semChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  semChipTextActive: {
    color: '#FFFFFF',
  },
  currentDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  semOverviewCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  semOverviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  semTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  semYear: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gpaBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    alignItems: 'center',
  },
  gpaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  gpaVal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  upcomingBadge: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upcomingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  semMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  semMetricItem: {
    alignItems: 'center',
  },
  semMetricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  semMetricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  subjectList: {
    gap: 10,
  },
  subjectCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subjCode: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  subjName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  attTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attTagHigh: {
    backgroundColor: colors.successSubtle,
  },
  attTagMid: {
    backgroundColor: colors.accentSubtle,
  },
  attTagLow: {
    backgroundColor: colors.dangerSubtle,
  },
  attTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  attTextHigh: {
    color: colors.successDark,
  },
  attTextMid: {
    color: '#B45309',
  },
  attTextLow: {
    color: colors.dangerDark,
  },
  iaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
  },
  iaItem: {
    alignItems: 'center',
  },
  iaTitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  iaScore: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  uploadDocBanner: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  uploadBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadDocBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadDocBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  docsGrid: {
    gap: 12,
  },
  docCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTag: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  docFileName: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 10,
  },
  docFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  docDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  viewDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDocText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: colors.text,
    marginBottom: 14,
  },
  modalCatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  modalCatBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCatBtnActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  modalCatText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalCatTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  chooseFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryLight,
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 20,
  },
  chooseFileText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  saveDocBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  saveDocBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // AO Petitions Styles
  vaultSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  subHeadingNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  aoStudentBanner: {
    backgroundColor: '#F0FDFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginVertical: 4,
  },
  aoStudentBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aoStudentBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F766E',
  },
  aoStudentBannerSub: {
    fontSize: 11,
    color: '#115E59',
    lineHeight: 16,
    marginTop: 3,
  },
  applyPetitionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyPetitionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyPetitionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginVertical: 10,
  },
  emptyPetitionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyPetitionSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  petitionStudentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  petitionStudentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  petitionCardTypeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  petitionCardDateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  petitionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  petitionStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  petitionParamBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  petitionReasonText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  petitionParamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petitionParamLabel: {
    fontSize: 12,
    color: '#475569',
  },
  aoEndorsementCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  aoEndorsementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aoEndorsementTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  aoRefNumberText: {
    fontSize: 11,
    color: '#047857',
  },
  aoRemarksNote: {
    fontSize: 11,
    color: '#065F46',
    fontStyle: 'italic',
  },
  docDispatchedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  docDispatchedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  docDownloadMiniBtn: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  docDownloadMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aoRejectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  aoRejectionText: {
    fontSize: 11,
    color: '#991B1B',
    flex: 1,
  },
  aoPendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aoPendingNoticeText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
  },
  aoModalNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 12,
  },
  aoModalNoticeText: {
    fontSize: 11,
    color: '#0F766E',
    flex: 1,
    lineHeight: 16,
  },
  petitionTypeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginVertical: 4,
    gap: 10,
  },
  petitionTypeOptionCardActive: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#0D9488',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#0D9488',
  },
  petitionTypeOptionText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  petitionTypeOptionTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  fieldHelperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  semSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    marginRight: 6,
  },
  semSelectChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  semSelectChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  semSelectChipTextActive: {
    color: '#FFFFFF',
  },
  submitAoPetitionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 14,
  },
  submitAoPetitionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  applicantUsnStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#99F6E4',
    gap: 8,
  },
  applicantUsnBadge: {
    backgroundColor: '#0D9488',
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
    color: '#0F766E',
  },
  applicantUsnPolicy: {
    fontSize: 10,
    color: '#14B8A6',
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
});
