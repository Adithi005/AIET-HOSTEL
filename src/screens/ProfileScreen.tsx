import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Mail,
  Phone,
  Shield,
  Home,
  BookOpen,
  Camera,
  Save,
  CheckCircle2,
  Lock,
  RefreshCcw,
  Sparkles,
  Smartphone,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  FileText,
  ChevronRight,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors } from '../theme/colors';
import { UserProfile } from '../types';
import { StorageService } from '../services/storage';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [usn, setUsn] = useState('');
  const [branch, setBranch] = useState('');
  const [mail, setMail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [hostelBlock, setHostelBlock] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    StorageService.getProfile().then((p) => {
      setProfile(p);
      setName(p.name);
      setUsn(p.usn);
      setBranch(p.branch);
      setMail(p.mail);
      setContactNumber(p.contactNumber);
      setGuardianContact(p.guardianContact);
      setHostelBlock(p.hostelBlock);
      setRoomNumber(p.roomNumber);
      setAvatarUri(p.avatarUri);
    });
  }, []);

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert(
          'Gallery Access Required',
          'Please allow photo library permission to choose your profile photo from your album.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        setAvatarUri(newUri);
        if (profile) {
          const updated = { ...profile, avatarUri: newUri };
          setProfile(updated);
          await StorageService.updateProfile(updated);
          Alert.alert('Profile Photo Updated', 'Your profile photo has been updated from your album.');
        }
      }
    } catch (err) {
      console.warn('Gallery pick error', err);
      Alert.alert('Gallery Error', 'Could not access photo gallery.');
    }
  };

  const takeWithCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert(
          'Camera Access Required',
          'Please allow camera permission to capture your student profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUri = result.assets[0].uri;
        setAvatarUri(newUri);
        if (profile) {
          const updated = { ...profile, avatarUri: newUri };
          setProfile(updated);
          await StorageService.updateProfile(updated);
          Alert.alert('Profile Photo Updated', 'Your profile photo has been updated from camera capture.');
        }
      }
    } catch (err) {
      console.warn('Camera error', err);
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    }
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Profile Photo Options',
      'Select how you want to update your institutional profile photo:',
      [
        {
          text: '🖼️ Choose from Gallery / Album',
          onPress: pickFromGallery,
        },
        {
          text: '📷 Take Photo with Camera',
          onPress: takeWithCamera,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!name.trim() || !usn.trim()) {
      Alert.alert('Required Fields', 'Name and USN cannot be empty.');
      return;
    }

    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      name: name.trim(),
      usn: usn.trim().toUpperCase(),
      branch: branch.trim(),
      mail: mail.trim(),
      contactNumber: contactNumber.trim(),
      guardianContact: guardianContact.trim(),
      hostelBlock: hostelBlock.trim(),
      roomNumber: roomNumber.trim(),
      avatarUri,
    };

    await StorageService.updateProfile(updatedProfile);
    setProfile(updatedProfile);
    Alert.alert('Profile Saved', 'Your 4-year student record has been updated.');
  };

  // Single Device Policy Handlers
  const handleVerifyDevice = () => {
    Alert.alert(
      '✅ Authorized Primary Device',
      `Device Model: ${profile?.deviceModel || 'Samsung Galaxy S23 (Primary)'}\nHardware ID: ${profile?.activeDeviceId || 'DEV-SM-S23-9941'}\nBinding Status: Active & Bound\n\nSingle Device Policy is ACTIVE. This device is the only hardware authorized to access your student account.`
    );
  };

  const handleSimulate2ndDevice = () => {
    const result = StorageService.simulateSecondaryDeviceLogin('Apple iPhone 15 Pro');
    Alert.alert('⛔ Single Device Policy Enforced', result.message);
  };

  const handleRequestDeviceReset = async () => {
    const res = await StorageService.requestAdminDeviceReset(
      profile?.usn || '1RV22CS089',
      'Student requested new hardware re-binding'
    );
    Alert.alert('Request Submitted to Admin', res.message);
  };

  return (
    <View style={styles.container}>
      {/* Top Back Navigation Bar */}
      <View style={styles.profileTopBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('HomeTab'))}
          activeOpacity={0.75}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.profileTitleHeader}>Student Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{name.charAt(0) || 'S'}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraIconBtn}
              onPress={handleChangePhoto}
              activeOpacity={0.8}
            >
              <Camera size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.changePhotoBtn}
            onPress={handleChangePhoto}
            activeOpacity={0.8}
          >
            <Camera size={13} color={colors.primary} />
            <Text style={styles.changePhotoBtnText}>Update Photo (Gallery / Camera)</Text>
          </TouchableOpacity>

          <Text style={styles.profileName}>{name || 'Student Name'}</Text>
          <Text style={styles.profileBranch}>{branch || 'Department'}</Text>

          {/* Privacy Badge */}
          <View style={styles.privacyShield}>
            <Lock size={12} color="#0D9488" />
            <Text style={styles.privacyShieldText}>
              Public Identity: <Text style={{ fontWeight: '800' }}>USN Only ({usn})</Text>
            </Text>
          </View>
          <Text style={styles.privacyExplainer}>
            In all public outpass rosters and leave records, only your USN is displayed. Your name,
            email, and phone are protected.
          </Text>
        </View>

        {/* =======================================================
            PROFILE FIELDS
           ======================================================= */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>ACADEMIC & HOSTEL CREDENTIALS</Text>

          {/* USN */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>University Seat Number (USN) *</Text>
            <View style={styles.inputContainer}>
              <Shield size={16} color={colors.primary} />
              <TextInput
                style={styles.inputField}
                value={usn}
                onChangeText={setUsn}
                placeholder="e.g., 1RV22CS089"
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Student Full Name *</Text>
            <View style={styles.inputContainer}>
              <User size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputField}
                value={name}
                onChangeText={setName}
                placeholder="Full Name"
              />
            </View>
          </View>

          {/* Branch */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Branch / Department *</Text>
            <View style={styles.inputContainer}>
              <BookOpen size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputField}
                value={branch}
                onChangeText={setBranch}
                placeholder="e.g. Computer Science & Engineering"
              />
            </View>
          </View>

          {/* College Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>College Email ID *</Text>
            <View style={styles.inputContainer}>
              <Mail size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputField}
                value={mail}
                onChangeText={setMail}
                placeholder="student@college.edu.in"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Contact Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Student Contact Number *</Text>
            <View style={styles.inputContainer}>
              <Phone size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.inputField}
                value={contactNumber}
                onChangeText={setContactNumber}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Guardian Contact */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Parent / Guardian Emergency Contact *</Text>
            <View style={styles.inputContainer}>
              <Phone size={16} color={colors.danger} />
              <TextInput
                style={styles.inputField}
                value={guardianContact}
                onChangeText={setGuardianContact}
                placeholder="+91 98765 01234"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Hostel Block & Room */}
          <View style={styles.rowTwo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Hostel Block</Text>
              <View style={styles.inputContainer}>
                <Home size={16} color={colors.textSecondary} />
                <TextInput
                  style={styles.inputField}
                  value={hostelBlock}
                  onChangeText={setHostelBlock}
                  placeholder="e.g., Cauvery Block B-3"
                />
              </View>
            </View>

            <View style={{ width: 110 }}>
              <Text style={styles.fieldLabel}>Room No.</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.inputField, { textAlign: 'center', fontWeight: '700' }]}
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                  placeholder="B-304"
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveProfile}
            activeOpacity={0.85}
          >
            <Save size={18} color="#FFFFFF" />
            <Text style={styles.saveBtnText}>Save Profile Changes</Text>
          </TouchableOpacity>
        </View>

        {/* Single Device Policy Card */}
        <View style={styles.deviceSecurityCard}>
          <View style={styles.deviceSecurityHeader}>
            <View style={styles.deviceSecurityIconBadge}>
              <Smartphone size={18} color="#0D9488" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceSecurityTitle}>Single-Device Login Policy Active</Text>
              <Text style={styles.deviceSecuritySubHead}>
                Handled & Enforced by Hostel Admin Desk
              </Text>
            </View>
            <View style={styles.boundBadge}>
              <Text style={styles.boundBadgeText}>1 Device Locked</Text>
            </View>
          </View>

          {/* Bound Specs Box */}
          <View style={styles.deviceSpecsBox}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Authorized Hardware:</Text>
              <Text style={styles.specVal}>{profile?.deviceModel || 'Samsung Galaxy S23'}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Hardware ID:</Text>
              <Text style={styles.specValMono}>{profile?.activeDeviceId || 'DEV-SM-S23-9941'}</Text>
            </View>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Allowed Logins:</Text>
              <Text style={[styles.specVal, { color: '#0F766E', fontWeight: '800' }]}>
                Strictly 1 Device (Multi-login blocked)
              </Text>
            </View>
          </View>

          <Text style={styles.deviceSecurityText}>
            Under AIETNEST hostel regulations, students cannot log in on multiple devices.
            Simultaneous logins from laptops, tablets, or secondary phones are blocked at the server level.
            All hardware authorizations and resets are handled by the Hostel Admin.
          </Text>

          {/* Action Buttons */}
          <View style={styles.deviceActionsCol}>
            <TouchableOpacity
              style={styles.verifyDeviceBtn}
              onPress={handleVerifyDevice}
              activeOpacity={0.8}
            >
              <Shield size={14} color="#0D9488" />
              <Text style={styles.verifyDeviceBtnText}>Verify Authorized Primary Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simulateBlockBtn}
              onPress={handleSimulate2ndDevice}
              activeOpacity={0.8}
            >
              <AlertTriangle size={14} color="#B45309" />
              <Text style={styles.simulateBlockBtnText}>
                Simulate 2nd Device Login Attempt (iPhone 15 Pro)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.requestResetBtn}
              onPress={handleRequestDeviceReset}
              activeOpacity={0.8}
            >
              <RefreshCw size={13} color={colors.primary} />
              <Text style={styles.requestResetBtnText}>
                Request Device Re-Binding (Admin Handled)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4-Year Persistence Guarantee Card */}
        <View style={styles.guaranteeCard}>
          <CheckCircle2 size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>4-Year Data Persistence</Text>
            <Text style={styles.guaranteeDesc}>
              Once registered, your profile, IA marks, attendance history, and semester grade sheets
              are maintained securely in local storage for your entire 4-year engineering tenure.
            </Text>
          </View>
        </View>

        {/* Shortcuts for Admin Gate Portal & Documents */}
        <View style={styles.shortcutsContainer}>
          <TouchableOpacity
            style={styles.portalShortcutBtn}
            onPress={() => navigation.navigate('AdminPortal')}
            activeOpacity={0.85}
          >
            <View style={styles.portalShortcutLeft}>
              <View style={[styles.portalShortcutIcon, { backgroundColor: '#FEF3C7' }]}>
                <ShieldAlert size={18} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.portalShortcutTitle}>Hostel Admin & Security Gate Portal</Text>
                <Text style={styles.portalShortcutSub}>Terminal barcode scanning, approvals & device resets</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.portalShortcutBtn}
            onPress={() => navigation.navigate('Documents')}
            activeOpacity={0.85}
          >
            <View style={styles.portalShortcutLeft}>
              <View style={[styles.portalShortcutIcon, { backgroundColor: colors.primarySubtle }]}>
                <FileText size={18} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.portalShortcutTitle}>Student Document Vault</Text>
                <Text style={styles.portalShortcutSub}>Official marks cards, RVCE student ID, and hostel room allotment</Text>
              </View>
            </View>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Footer Brand */}
        <View style={styles.footerBrand}>
          <Text style={styles.footerName}>AIETNEST</Text>
          <Text style={styles.footerTagline}>A connected home for every AIET hosteller</Text>
          <Text style={styles.footerVersion}>Version 1.0.0 • Hostel Resident Portal</Text>
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
    paddingBottom: 40,
    ...Platform.select({
      web: {
        maxWidth: 960,
        width: '100%',
        alignSelf: 'center',
        paddingHorizontal: 28,
        paddingTop: 20,
      },
    }),
  },
  avatarCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight + '15',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  changePhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  profileBranch: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  privacyShield: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginTop: 4,
  },
  privacyShieldText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  privacyExplainer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    lineHeight: 15,
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  guaranteeCard: {
    backgroundColor: colors.primarySubtle,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 20,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  guaranteeDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  footerBrand: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  footerTagline: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  footerVersion: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  shortcutsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  portalShortcutBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portalShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  portalShortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalShortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  portalShortcutSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileTopBar: {
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  profileTitleHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    flex: 1,
  },
  deviceSecurityCard: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  deviceSecurityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  deviceSecurityIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceSecurityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
  },
  deviceSecuritySubHead: {
    fontSize: 10,
    color: '#115E59',
    marginTop: 1,
  },
  boundBadge: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boundBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  deviceSpecsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 10,
    gap: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  specVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  specValMono: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.primary,
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deviceSecurityText: {
    fontSize: 11,
    color: '#115E59',
    lineHeight: 16,
    marginBottom: 12,
  },
  deviceActionsCol: {
    gap: 8,
  },
  verifyDeviceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 9,
    borderRadius: 8,
  },
  verifyDeviceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  simulateBlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 9,
    borderRadius: 8,
  },
  simulateBlockBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  requestResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    borderRadius: 8,
  },
  requestResetBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
