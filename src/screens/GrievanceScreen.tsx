import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Wrench,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Sparkles,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors } from '../theme/colors';
import { UserProfile, GrievanceTicket } from '../types';
import { StorageService } from '../services/storage';

export const GrievanceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [grievances, setGrievances] = useState<GrievanceTicket[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Form states
  const [category, setCategory] = useState<GrievanceTicket['category']>('Cleanliness & Room');
  const [urgency, setUrgency] = useState<GrievanceTicket['urgency']>('Medium');
  const [description, setDescription] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    const p = await StorageService.getProfile();
    const g = await StorageService.getGrievances();
    setProfile(p);
    setGrievances(g);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Photo pickers
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert('Permission Denied', 'Please grant gallery permissions to attach room photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error', err);
      // Fallback sample image for easy testing in browser/mock
      setSelectedPhoto('https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert('Permission Denied', 'Please grant camera access to take a photo of the issue.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera error', err);
      setSelectedPhoto('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80');
    }
  };

  const handleSubmitGrievance = async () => {
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please explain the issue you are facing in the hostel.');
      return;
    }

    try {
      setIsSubmitting(true);
      await StorageService.submitGrievance({
        roomNumber: profile?.roomNumber || 'B-304',
        category,
        urgency,
        description: description.trim(),
        photoUri: selectedPhoto || undefined,
      });
      setIsSubmitting(false);
      Alert.alert('Ticket Lodged', 'Your complaint has been dispatched to the hostel warden.');
      setIsFormVisible(false);
      setDescription('');
      setSelectedPhoto(null);
      await loadData();
    } catch {
      setIsSubmitting(false);
      Alert.alert('Error', 'Could not lodge ticket. Try again.');
    }
  };

  const categories: GrievanceTicket['category'][] = [
    'Cleanliness & Room',
    'Electrical & Fan',
    'Plumbing & Water',
    'Wi-Fi / LAN',
    'Furniture',
    'Pest Control',
    'General',
  ];

  return (
    <View style={styles.container}>
      <Header
        profile={profile}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Info Banner */}
        <View style={styles.careBanner}>
          <View style={styles.bannerRow}>
            <View style={styles.iconCircle}>
              <Wrench size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Hostel Care & Maintenance</Text>
              <Text style={styles.bannerDesc}>
                Report cleanliness, room hygiene, plumbing, or facility issues with photo evidence.
              </Text>
            </View>
          </View>

          {!isFormVisible && (
            <TouchableOpacity
              style={styles.lodgeButton}
              onPress={() => setIsFormVisible(true)}
              activeOpacity={0.85}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.lodgeButtonText}>Report New Room Issue</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* =======================================================
            ISSUE LODGING FORM
           ======================================================= */}
        {isFormVisible && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Lodge Maintenance Ticket</Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Room display */}
            <View style={styles.roomTagRow}>
              <Text style={styles.roomTagLabel}>Room Allocated:</Text>
              <Text style={styles.roomTagVal}>
                {profile?.roomNumber} ({profile?.hostelBlock})
              </Text>
            </View>

            {/* Category Selector */}
            <Text style={styles.label}>Select Category</Text>
            <View style={styles.categoryPillsWrap}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    category === cat && styles.categoryPillActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      category === cat && styles.categoryPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Urgency */}
            <Text style={styles.label}>Urgency Level</Text>
            <View style={styles.urgencyRow}>
              {(['Low', 'Medium', 'High', 'Emergency'] as const).map((urg) => (
                <TouchableOpacity
                  key={urg}
                  style={[
                    styles.urgencyBtn,
                    urgency === urg && styles.urgencyBtnActive,
                    urg === 'Emergency' && urgency === urg && styles.urgencyBtnEmergency,
                  ]}
                  onPress={() => setUrgency(urg)}
                >
                  <Text
                    style={[
                      styles.urgencyText,
                      urgency === urg && styles.urgencyTextActive,
                    ]}
                  >
                    {urg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={styles.label}>Describe Issue in Detail</Text>
            <TextInput
              style={styles.textInputArea}
              placeholder="e.g., Washroom exhaust fan stopped working, or corridor cleanliness required..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Photo Upload Section */}
            <Text style={styles.label}>Attach Room / Cleanliness Photo Evidence</Text>
            {selectedPhoto ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <Trash2 size={16} color="#FFFFFF" />
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoPickersRow}>
                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <ImageIcon size={18} color={colors.primary} />
                  <Text style={styles.pickButtonText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pickButton}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <Camera size={18} color={colors.primary} />
                  <Text style={styles.pickButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitTicketBtn}
              onPress={handleSubmitGrievance}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="#FFFFFF" />
                  <Text style={styles.submitTicketBtnText}>Submit Complaint</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* =======================================================
        {/* =======================================================
            EXISTING TICKETS LIST (Only Student's Room Reports)
           ======================================================= */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Reported Issues for Room {profile?.roomNumber || 'B-304'} (
            {
              grievances.filter(
                (t) =>
                  t.roomNumber === (profile?.roomNumber || 'B-304') ||
                  t.usn === profile?.usn
              ).length
            }
            )
          </Text>
        </View>

        <View style={styles.ticketsList}>
          {grievances
            .filter(
              (ticket) =>
                ticket.roomNumber === (profile?.roomNumber || 'B-304') ||
                ticket.usn === profile?.usn
            )
            .map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketCardHeader}>
                  <View>
                    <Text style={styles.roomHeading}>Room {ticket.roomNumber}</Text>
                    <Text style={styles.ticketCategory}>{ticket.category}</Text>
                  </View>

                  <View
                    style={[
                      styles.ticketStatusBadge,
                      ticket.status === 'Resolved' && styles.statusBadgeResolved,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ticketStatusText,
                        ticket.status === 'Resolved' && styles.statusTextResolved,
                      ]}
                    >
                      {ticket.status}
                    </Text>
                  </View>
                </View>

                {/* What student reported */}
                <Text style={styles.ticketDesc}>{ticket.description}</Text>

                {/* Photo Evidence if uploaded */}
                {ticket.photoUri && (
                  <View style={styles.ticketPhotoWrap}>
                    <Image
                      source={{ uri: ticket.photoUri }}
                      style={styles.ticketPhoto}
                      resizeMode="cover"
                    />
                    <View style={styles.photoTag}>
                      <Camera size={12} color="#FFFFFF" />
                      <Text style={styles.photoTagText}>Photo Attached</Text>
                    </View>
                  </View>
                )}

                <View style={styles.ticketFooter}>
                  <View style={styles.timeWrap}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={styles.timeText}>Reported: {ticket.createdAt}</Text>
                  </View>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>
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
  careBanner: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 15,
    marginTop: 2,
  },
  lodgeButton: {
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  lodgeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  cancelLink: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  roomTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  roomTagLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  roomTagVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  categoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  urgencyBtnActive: {
    backgroundColor: colors.accentSubtle,
    borderColor: colors.accent,
  },
  urgencyBtnEmergency: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.danger,
  },
  urgencyText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  urgencyTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  textInputArea: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  photoPickersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  pickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingVertical: 12,
    borderRadius: 10,
  },
  pickButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  photoPreviewCard: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  submitTicketBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitTicketBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listHeader: {
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ticketsList: {
    gap: 12,
  },
  ticketCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  urgencyBadge: {
    backgroundColor: colors.accentSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgencyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  roomHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  ticketCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ticketStatusBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ticketStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadgeResolved: {
    backgroundColor: colors.successSubtle,
  },
  statusTextResolved: {
    color: colors.successDark,
  },
  ticketDesc: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 10,
  },
  ticketPhotoWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    maxWidth: 420,
    backgroundColor: '#0F172A',
  },
  ticketPhoto: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  photoTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  photoTagText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  adminRemarkBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.primarySubtle,
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  adminRemarkText: {
    fontSize: 11,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 14,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  roomText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
