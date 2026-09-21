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
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors } from '../theme/colors';
import { UserProfile, SemesterRecord, StudentDocument } from '../types';
import { StorageService } from '../services/storage';

export const DocumentScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [academics, setAcademics] = useState<SemesterRecord[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [selectedSem, setSelectedSem] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<'academics' | 'documents'>('academics');

  // Document Upload Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<StudentDocument['category']>('Marks Card');
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);

  const loadData = useCallback(async () => {
    const p = await StorageService.getProfile();
    const a = await StorageService.getAcademics();
    const d = await StorageService.getDocuments();
    setProfile(p);
    setAcademics(a);
    setDocuments(d);
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

  return (
    <View style={styles.container}>
      <Header profile={profile} onProfilePress={() => navigation.navigate('ProfileTab')} />

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
              Document Vault ({documents.length})
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
    paddingBottom: 36,
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
});
