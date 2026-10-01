import React, { useState, useCallback, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Wrench,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Sparkles,
  Plus,
  ShieldCheck,
  Bus,
  Car,
  MapPin,
  Calendar,
  Users,
  Phone,
  QrCode,
  ArrowRight,
  ShieldAlert,
  HeartPulse,
  Check,
  X,
  ChevronRight,
  GraduationCap,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors } from '../theme/colors';
import {
  UserProfile,
  GrievanceTicket,
  VehicleType,
  VehicleDestination,
  VehicleSlot,
  VehicleBooking,
} from '../types';
import { StorageService } from '../services/storage';

export const GrievanceScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [grievances, setGrievances] = useState<GrievanceTicket[]>([]);
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Active Sub-Tab: 'maintenance' vs 'vehicles'
  const [activeCareTab, setActiveCareTab] = useState<'maintenance' | 'vehicles'>(
    route?.params?.initialTab || 'maintenance'
  );

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveCareTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Maintenance Form states
  const [category, setCategory] = useState<GrievanceTicket['category']>('Cleanliness & Room');
  const [urgency, setUrgency] = useState<GrievanceTicket['urgency']>('Medium');
  const [description, setDescription] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Vehicle Booking states
  const [vehicleSlots, setVehicleSlots] = useState<VehicleSlot[]>([]);
  const [allVehicleBookings, setAllVehicleBookings] = useState<VehicleBooking[]>([]);
  const [myVehicleBookings, setMyVehicleBookings] = useState<VehicleBooking[]>([]);
  const [vehicleStats, setVehicleStats] = useState({ vidyagiriTotal: 0, healthCenterTotal: 0, totalBooked: 0 });
  const [isVehicleFormVisible, setIsVehicleFormVisible] = useState(false);
  const [rosterFilter, setRosterFilter] = useState<'all' | 'Vidyagiri' | 'Health Center'>('all');

  // Vehicle Booking Form Inputs
  const [selectedDestination, setSelectedDestination] = useState<VehicleDestination>('Vidyagiri');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('TT');
  const [selectedDepartureTime, setSelectedDepartureTime] = useState('08:30 AM');
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [travelReason, setTravelReason] = useState('Academic Lab & Library Reference at Vidyagiri');
  const [isHealthEmergency, setIsHealthEmergency] = useState(false);
  const [isBookingVehicle, setIsBookingVehicle] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await StorageService.getProfile();
      const g = await StorageService.getGrievances();
      const slots = await StorageService.getVehicleSlots();
      const allBookings = await StorageService.getVehicleBookings();
      const myBookings = await StorageService.getMyVehicleBookings(p.usn);
      const stats = await StorageService.getVehicleStats();

      setProfile(p);
      setGrievances(g);
      setVehicleSlots(slots);
      setAllVehicleBookings(allBookings);
      setMyVehicleBookings(myBookings);
      setVehicleStats(stats);
    } catch (err) {
      console.warn('Error loading Hostel Care data', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Destination Change Handler
  const handleSelectDestination = (dest: VehicleDestination) => {
    setSelectedDestination(dest);
    setCustomTimeInput('');
    if (dest === 'Health Center') {
      setSelectedVehicleType('Eeco');
      setSelectedDepartureTime('09:15 AM');
      setTravelReason('Hostel Sick Bay Physician Follow-up / Routine Health Check');
    } else {
      setSelectedVehicleType('TT');
      setSelectedDepartureTime('08:30 AM');
      setTravelReason('Academic Lab & Library Reference at Vidyagiri');
    }
  };

  // Real-time 15-minute advance timing check
  const effectiveDepartureTime = customTimeInput.trim() ? customTimeInput.trim() : selectedDepartureTime;
  const cutoffEval = StorageService.checkVehicleSlotCutoff(effectiveDepartureTime);

  // Photo capture: Live In-App Camera Only (No Gallery Access, Not Saved to Device)
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert(
          'Camera Access Required',
          'Please allow camera permission to capture live photo evidence for your hostel issue.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera capture error', err);
      Alert.alert('Camera Error', 'Could not open camera on this device.');
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
      Alert.alert(
        'Ticket Lodged',
        'Your complaint and live inspection photo have been dispatched to the hostel warden. Uploaded photos are never saved to your personal phone storage.'
      );
      setIsFormVisible(false);
      setDescription('');
      setSelectedPhoto(null);
      await loadData();
    } catch {
      setIsSubmitting(false);
      Alert.alert('Error', 'Could not lodge ticket. Try again.');
    }
  };

  const handleBookVehicle = async () => {
    if (!profile) return;
    if (!effectiveDepartureTime.trim()) {
      Alert.alert('Departure Timing Required', 'Please choose a departure timing slot or enter custom time.');
      return;
    }
    if (!travelReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a brief reason for traveling.');
      return;
    }

    // Check 15-minute cutoff rule
    if (!cutoffEval.canApply) {
      Alert.alert('15-Minute Advance Rule Violated', cutoffEval.message);
      return;
    }

    try {
      setIsBookingVehicle(true);
      const res = await StorageService.bookVehicle({
        usn: profile.usn,
        studentName: profile.name,
        roomNumber: profile.roomNumber,
        contactNumber: profile.contactNumber,
        destination: selectedDestination,
        vehicleType: selectedVehicleType,
        departureTime: effectiveDepartureTime,
        reason: travelReason.trim(),
        isHealthCareEmergency: isHealthEmergency,
      });
      setIsBookingVehicle(false);

      if (res.success) {
        Alert.alert('🎉 Vehicle Seat Confirmed', res.message);
        setIsVehicleFormVisible(false);
        setCustomTimeInput('');
        await loadData();
      } else {
        Alert.alert('Booking Error', res.message);
      }
    } catch (err: any) {
      setIsBookingVehicle(false);
      Alert.alert('Booking Failed', err.message || 'Could not complete vehicle booking.');
    }
  };

  const handleCancelVehicleBooking = async (bookingId: string) => {
    Alert.alert(
      'Cancel Transit Booking',
      'Are you sure you want to release your seat on this vehicle?',
      [
        { text: 'Keep Seat', style: 'cancel' },
        {
          text: 'Release Seat',
          style: 'destructive',
          onPress: async () => {
            await StorageService.cancelVehicleBooking(bookingId);
            await loadData();
            Alert.alert('Seat Released', 'Your transit booking has been cancelled.');
          },
        },
      ]
    );
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

  const vehicleOptions: Array<{ type: VehicleType; label: string; seats: number; icon: string }> = [
    { type: 'Eeco', label: 'Eeco (Express Shuttle)', seats: 7, icon: '🚗' },
    { type: 'TT', label: 'TT (Tempo Traveller)', seats: 14, icon: '🚐' },
    { type: 'Mini Bus', label: 'Mini Bus (Transit)', seats: 26, icon: '🚌' },
    { type: 'Bus', label: 'Campus Bus (Standard)', seats: 45, icon: '🚍' },
  ];

  const presetTimesForDest: string[] =
    selectedDestination === 'Vidyagiri'
      ? ['08:30 AM', '10:00 AM', '01:30 PM', '05:00 PM']
      : ['09:15 AM', '11:45 AM', '03:15 PM', '06:30 PM'];

  const filteredBookings = allVehicleBookings.filter((b) => {
    if (rosterFilter === 'all') return true;
    return b.destination === rosterFilter;
  });

  return (
    <View style={styles.container}>
      <Header
        profile={profile}
        onProfilePress={() => navigation.navigate('Profile')}
        onAdminPress={() => navigation.navigate('AdminPortal')}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =======================================================
            HOSTEL CARE SUB-NAV TABS
           ======================================================= */}
        <View style={styles.careSubTabRow}>
          <TouchableOpacity
            style={[styles.careSubTabBtn, activeCareTab === 'maintenance' && styles.careSubTabBtnActive]}
            onPress={() => setActiveCareTab('maintenance')}
            activeOpacity={0.8}
          >
            <Wrench
              size={16}
              color={activeCareTab === 'maintenance' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.careSubTabText,
                activeCareTab === 'maintenance' && styles.careSubTabTextActive,
              ]}
            >
              Room & Maintenance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.careSubTabBtn, activeCareTab === 'vehicles' && styles.careSubTabBtnActive]}
            onPress={() => setActiveCareTab('vehicles')}
            activeOpacity={0.8}
          >
            <Bus
              size={16}
              color={activeCareTab === 'vehicles' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.careSubTabText,
                activeCareTab === 'vehicles' && styles.careSubTabTextActive,
              ]}
            >
              Vehicle Transit ({vehicleStats.totalBooked})
            </Text>
          </TouchableOpacity>
        </View>

        {/* =======================================================
            TAB 1: ROOM & MAINTENANCE CARE (with Live Camera Only)
           ======================================================= */}
        {activeCareTab === 'maintenance' && (
          <View>
            {/* Top Info Banner */}
            <View style={styles.careBanner}>
              <View style={styles.bannerRow}>
                <View style={styles.iconCircle}>
                  <Wrench size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>Hostel Care & Maintenance</Text>
                  <Text style={styles.bannerDesc}>
                    Report cleanliness, room hygiene, plumbing, or facility issues with live photo verification.
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

            {/* Issue Lodging Form */}
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
                  <Text style={styles.roomTagText}>Room: {profile?.roomNumber || 'B-304'}</Text>
                  <Text style={styles.blockTagText}>{profile?.hostelBlock || 'Cauvery Block B-3'}</Text>
                </View>

                {/* Category Selector */}
                <Text style={styles.label}>Select Category</Text>
                <View style={styles.categoryRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
                      onPress={() => setCategory(cat)}
                      activeOpacity={0.8}
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
                        urgency === urg && urg === 'Emergency' && styles.urgencyBtnEmergency,
                      ]}
                      onPress={() => setUrgency(urg)}
                      activeOpacity={0.8}
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

                {/* Photo Upload Section: Live Camera Only */}
                <Text style={styles.label}>Live Room Photo Evidence (Camera Only)</Text>
                <Text style={styles.photoPolicyNotice}>
                  🔒 In-app camera only • Gallery upload disabled • Photos are not saved to your device
                </Text>
                {selectedPhoto ? (
                  <View style={styles.photoPreviewCard}>
                    <Image source={{ uri: selectedPhoto }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => setSelectedPhoto(null)}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={16} color="#FFFFFF" />
                      <Text style={styles.removePhotoText}>Discard Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.cameraCaptureBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.85}
                  >
                    <Camera size={19} color="#FFFFFF" />
                    <Text style={styles.cameraCaptureBtnText}>Open Camera to Verify Issue</Text>
                  </TouchableOpacity>
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

            {/* Complaints List */}
            <View style={styles.listSection}>
              <Text style={styles.sectionHeading}>
                My Reported Issues ({grievances.length})
              </Text>

              {grievances.length === 0 && (
                <View style={styles.emptyState}>
                  <CheckCircle2 size={36} color={colors.success} />
                  <Text style={styles.emptyTitle}>All Clear!</Text>
                  <Text style={styles.emptyDesc}>
                    You have not reported any unresolved hostel maintenance or cleanliness issues.
                  </Text>
                </View>
              )}

              {grievances.map((ticket) => (
                <View key={ticket.id} style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <View style={{ flex: 1 }}>
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

                  <Text style={styles.ticketDesc}>{ticket.description}</Text>

                  {ticket.photoUri && (
                    <View style={styles.ticketPhotoWrap}>
                      <Image
                        source={{ uri: ticket.photoUri }}
                        style={styles.ticketPhoto}
                        resizeMode="cover"
                      />
                      <View style={styles.photoTag}>
                        <Camera size={12} color="#FFFFFF" />
                        <Text style={styles.photoTagText}>Live Camera Verified</Text>
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
          </View>
        )}

        {/* =======================================================
            TAB 2: VEHICLE BOOKING & HOSTEL CARE TRANSIT
           ======================================================= */}
        {activeCareTab === 'vehicles' && (
          <View>
            {/* Top Transit Banner */}
            <View style={styles.transitBannerCard}>
              <View style={styles.transitBannerHeader}>
                <View style={styles.transitIconCircle}>
                  <Bus size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.transitBannerTitle}>Hostel Care Transit Service</Text>
                  <Text style={styles.transitBannerSub}>
                    Official shuttles connecting Hostel to Vidyagiri Campus & Health Center
                  </Text>
                </View>
              </View>

              {/* TOTAL STUDENTS UNDER HOSTEL CARE (STAT CARDS) */}
              <View style={styles.transitStatsRow}>
                <View style={styles.transitStatCard}>
                  <Text style={styles.transitStatNum}>{vehicleStats.vidyagiriTotal}</Text>
                  <Text style={styles.transitStatLabel}>Vidyagiri</Text>
                  <Text style={styles.transitStatSub}>Students Booked</Text>
                </View>

                <View style={styles.transitStatCardHealth}>
                  <Text style={[styles.transitStatNum, { color: '#0F766E' }]}>
                    {vehicleStats.healthCenterTotal}
                  </Text>
                  <Text style={[styles.transitStatLabel, { color: '#115E59' }]}>Health Center</Text>
                  <Text style={styles.transitStatSub}>Under Medical Care</Text>
                </View>

                <View style={styles.transitStatCardTotal}>
                  <Text style={[styles.transitStatNum, { color: colors.primaryDark }]}>
                    {vehicleStats.totalBooked}
                  </Text>
                  <Text style={styles.transitStatLabel}>Total In Transit</Text>
                  <Text style={styles.transitStatSub}>Today's Active</Text>
                </View>
              </View>
            </View>

            {/* 15-MINUTE CUTOFF RULE BANNER */}
            <View style={styles.cutoffPolicyStrip}>
              <Clock size={18} color="#B45309" style={{ flexShrink: 0 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cutoffPolicyTitle}>⏱️ Strict 15-Minute Advance Booking Rule</Text>
                <Text style={styles.cutoffPolicyDesc}>
                  Under AIET policy, students must apply at least 15 minutes before the assigned vehicle departure time. Late bookings are locked automatically.
                </Text>
              </View>
            </View>

            {/* Book Vehicle Toggle Button */}
            {!isVehicleFormVisible && (
              <TouchableOpacity
                style={styles.bookTransitBtn}
                onPress={() => setIsVehicleFormVisible(true)}
                activeOpacity={0.85}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.bookTransitBtnText}>Book Vehicle (Vidyagiri / Health Center)</Text>
              </TouchableOpacity>
            )}

            {/* =======================================================
                INTERACTIVE VEHICLE BOOKING FORM
               ======================================================= */}
            {isVehicleFormVisible && (
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Book Campus Transit</Text>
                  <TouchableOpacity onPress={() => setIsVehicleFormVisible(false)}>
                    <Text style={styles.cancelLink}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {/* 1. Destination Selection */}
                <Text style={styles.formSectionLabel}>1. Select Destination</Text>
                <View style={styles.destToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.destBtn,
                      selectedDestination === 'Vidyagiri' && styles.destBtnActive,
                    ]}
                    onPress={() => handleSelectDestination('Vidyagiri')}
                    activeOpacity={0.8}
                  >
                    <GraduationCap
                      size={18}
                      color={selectedDestination === 'Vidyagiri' ? colors.primary : colors.textSecondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.destBtnTitle,
                          selectedDestination === 'Vidyagiri' && styles.destBtnTitleActive,
                        ]}
                      >
                        Vidyagiri Campus
                      </Text>
                      <Text style={styles.destBtnSub}>Academic & Library Shuttle</Text>
                    </View>
                    {selectedDestination === 'Vidyagiri' && (
                      <CheckCircle2 size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.destBtn,
                      selectedDestination === 'Health Center' && styles.destBtnActiveHealth,
                    ]}
                    onPress={() => handleSelectDestination('Health Center')}
                    activeOpacity={0.8}
                  >
                    <HeartPulse
                      size={18}
                      color={selectedDestination === 'Health Center' ? '#0D9488' : colors.textSecondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.destBtnTitle,
                          selectedDestination === 'Health Center' && { color: '#0F766E' },
                        ]}
                      >
                        Health Center / Clinic
                      </Text>
                      <Text style={styles.destBtnSub}>Hostel Care Medical Transit</Text>
                    </View>
                    {selectedDestination === 'Health Center' && (
                      <CheckCircle2 size={16} color="#0D9488" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* 2. Vehicle Type Selection */}
                <Text style={styles.formSectionLabel}>2. Select Vehicle Type</Text>
                <View style={styles.vehicleTypeGrid}>
                  {vehicleOptions.map((v) => (
                    <TouchableOpacity
                      key={v.type}
                      style={[
                        styles.vehicleCard,
                        selectedVehicleType === v.type && styles.vehicleCardActive,
                      ]}
                      onPress={() => setSelectedVehicleType(v.type)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.vehicleCardIcon}>{v.icon}</Text>
                      <Text
                        style={[
                          styles.vehicleCardName,
                          selectedVehicleType === v.type && styles.vehicleCardNameActive,
                        ]}
                      >
                        {v.type}
                      </Text>
                      <View style={styles.capacityBadge}>
                        <Text style={styles.capacityBadgeText}>{v.seats} Seats</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 3. Assigned Vehicle Timing */}
                <Text style={styles.formSectionLabel}>3. Vehicle Departure Timing</Text>
                <Text style={styles.timingGuideText}>
                  Scheduled slots for {selectedDestination}:
                </Text>

                <View style={styles.timingPillRow}>
                  {presetTimesForDest.map((slotTime) => {
                    const slotCheck = StorageService.checkVehicleSlotCutoff(slotTime);
                    const isSelected = selectedDepartureTime === slotTime && !customTimeInput.trim();
                    return (
                      <TouchableOpacity
                        key={slotTime}
                        style={[
                          styles.timingPill,
                          isSelected && styles.timingPillActive,
                          !slotCheck.canApply && styles.timingPillLocked,
                        ]}
                        onPress={() => {
                          setSelectedDepartureTime(slotTime);
                          setCustomTimeInput('');
                        }}
                        activeOpacity={0.8}
                      >
                        <Clock
                          size={12}
                          color={
                            isSelected
                              ? '#FFFFFF'
                              : !slotCheck.canApply
                              ? '#94A3B8'
                              : colors.primary
                          }
                        />
                        <Text
                          style={[
                            styles.timingPillText,
                            isSelected && styles.timingPillTextActive,
                            !slotCheck.canApply && styles.timingPillTextLocked,
                          ]}
                        >
                          {slotTime}
                        </Text>
                        {!slotCheck.canApply && (
                          <Text style={styles.lockedTagText}>Locked</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Timing Input */}
                <View style={styles.customTimingWrap}>
                  <Text style={styles.subFieldLabel}>Or Enter Specific Departure Timing:</Text>
                  <TextInput
                    style={styles.customTimeInput}
                    placeholder="e.g. 02:45 PM or 04:15 PM"
                    placeholderTextColor={colors.textMuted}
                    value={customTimeInput}
                    onChangeText={setCustomTimeInput}
                  />
                </View>

                {/* REAL-TIME 15-MINUTE CUTOFF VALIDATION BADGE */}
                <View
                  style={[
                    styles.cutoffResultCard,
                    cutoffEval.canApply ? styles.cutoffSuccessCard : styles.cutoffDangerCard,
                  ]}
                >
                  {cutoffEval.canApply ? (
                    <CheckCircle2 size={16} color="#15803D" style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={16} color="#B91C1C" style={{ flexShrink: 0 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.cutoffResultTitle,
                        cutoffEval.canApply ? { color: '#15803D' } : { color: '#B91C1C' },
                      ]}
                    >
                      {cutoffEval.canApply ? 'Eligible to Book' : 'Booking Restricted (< 15 min)'}
                    </Text>
                    <Text
                      style={[
                        styles.cutoffResultMsg,
                        cutoffEval.canApply ? { color: '#166534' } : { color: '#991B1B' },
                      ]}
                    >
                      {cutoffEval.message}
                    </Text>
                  </View>
                </View>

                {/* 4. Purpose / Reason */}
                <Text style={styles.formSectionLabel}>4. Travel Purpose & Details</Text>
                <TextInput
                  style={styles.textInputArea}
                  value={travelReason}
                  onChangeText={setTravelReason}
                  placeholder="Specify academic test, library reference, or medical checkup..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                />

                {/* Health Center Emergency Flag */}
                {selectedDestination === 'Health Center' && (
                  <TouchableOpacity
                    style={[
                      styles.emergencyCheckbox,
                      isHealthEmergency && styles.emergencyCheckboxActive,
                    ]}
                    onPress={() => setIsHealthEmergency(!isHealthEmergency)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.checkSquare,
                        isHealthEmergency && styles.checkSquareActive,
                      ]}
                    >
                      {isHealthEmergency && <Check size={12} color="#FFFFFF" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.emergencyCheckTitle}>Hostel Care Priority Patient</Text>
                      <Text style={styles.emergencyCheckSub}>
                        Priority seating for fever, injury, or physician referrals.
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Submit Booking Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmBookingBtn,
                    !cutoffEval.canApply && styles.confirmBookingBtnDisabled,
                  ]}
                  onPress={handleBookVehicle}
                  disabled={!cutoffEval.canApply || isBookingVehicle}
                  activeOpacity={0.85}
                >
                  {isBookingVehicle ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#FFFFFF" />
                      <Text style={styles.confirmBookingBtnText}>
                        {cutoffEval.canApply
                          ? `Reserve Seat on ${selectedVehicleType} (${effectiveDepartureTime})`
                          : 'Booking Locked (< 15 Min Rule)'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* MY ACTIVE BOARDING PASSES */}
            {myVehicleBookings.filter((b) => b.status === 'Confirmed').length > 0 && (
              <View style={styles.myPassesSection}>
                <Text style={styles.sectionHeading}>My Active Boarding Passes</Text>

                {myVehicleBookings
                  .filter((b) => b.status === 'Confirmed')
                  .map((pass) => (
                    <View key={pass.id} style={styles.boardingPassCard}>
                      <View style={styles.passTopRow}>
                        <View style={styles.passTokenBadge}>
                          <Text style={styles.passTokenLabel}>BOARDING PASS</Text>
                          <Text style={styles.passTokenText}>{pass.bookingToken}</Text>
                        </View>
                        <View style={styles.passConfirmedPill}>
                          <Text style={styles.passConfirmedText}>Seat #{pass.seatNumber} Confirmed</Text>
                        </View>
                      </View>

                      <View style={styles.passDetailsGrid}>
                        <View style={styles.passCol}>
                          <Text style={styles.passSubLabel}>DESTINATION</Text>
                          <Text style={styles.passValText}>{pass.destination}</Text>
                        </View>
                        <View style={styles.passCol}>
                          <Text style={styles.passSubLabel}>VEHICLE</Text>
                          <Text style={styles.passValText}>
                            {pass.vehicleType} • {pass.vehiclePlate}
                          </Text>
                        </View>
                        <View style={styles.passCol}>
                          <Text style={styles.passSubLabel}>DEPARTURE TIME</Text>
                          <Text style={[styles.passValText, { color: colors.primaryDark }]}>
                            {pass.departureTime}
                          </Text>
                        </View>
                        <View style={styles.passCol}>
                          <Text style={styles.passSubLabel}>PICKUP POINT</Text>
                          <Text style={styles.passValText} numberOfLines={1}>
                            {pass.pickupPoint}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.driverInfoRow}>
                        <Phone size={13} color="#0D9488" />
                        <Text style={styles.driverInfoText}>
                          Pilot: {pass.driverName} ({pass.driverContact})
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.cancelPassBtn}
                        onPress={() => handleCancelVehicleBooking(pass.id)}
                        activeOpacity={0.8}
                      >
                        <Trash2 size={13} color="#DC2626" />
                        <Text style={styles.cancelPassBtnText}>Cancel Booking & Release Seat</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}

            {/* DAILY VEHICLE TRANSIT SCHEDULE */}
            <View style={styles.scheduleSection}>
              <Text style={styles.sectionHeading}>Today's Vehicle Schedule (Eeco, TT, Mini Bus, Bus)</Text>

              <View style={styles.scheduleList}>
                {vehicleSlots.map((slot) => {
                  const check = StorageService.checkVehicleSlotCutoff(slot.departureTime);
                  const bookedInSlot = allVehicleBookings.filter(
                    (b) =>
                      b.destination === slot.destination &&
                      b.departureTime === slot.departureTime &&
                      b.status === 'Confirmed'
                  ).length;
                  const seatsAvailable = Math.max(0, slot.capacity - bookedInSlot);

                  return (
                    <View key={slot.id} style={styles.slotCard}>
                      <View style={styles.slotLeft}>
                        <View
                          style={[
                            styles.slotIconBadge,
                            slot.destination === 'Health Center' && { backgroundColor: '#F0FDFA' },
                          ]}
                        >
                          {slot.vehicleType === 'Eeco' ? (
                            <Car
                              size={18}
                              color={slot.destination === 'Health Center' ? '#0D9488' : colors.primary}
                            />
                          ) : (
                            <Bus
                              size={18}
                              color={slot.destination === 'Health Center' ? '#0D9488' : colors.primary}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.slotTitleRow}>
                            <Text style={styles.slotTimeText}>{slot.departureTime}</Text>
                            <View
                              style={[
                                styles.slotDestBadge,
                                slot.destination === 'Health Center' && styles.slotDestBadgeHealth,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.slotDestText,
                                  slot.destination === 'Health Center' && { color: '#0F766E' },
                                ]}
                              >
                                {slot.destination}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.slotVehicleSub}>
                            {slot.vehicleType} • {slot.vehiclePlate} • {seatsAvailable}/{slot.capacity} Seats Free
                          </Text>
                          <Text style={styles.slotPickupText}>📍 {slot.pickupPoint}</Text>
                        </View>
                      </View>

                      <View style={styles.slotRightAction}>
                        {check.canApply ? (
                          <TouchableOpacity
                            style={styles.quickBookSlotBtn}
                            onPress={() => {
                              setSelectedDestination(slot.destination);
                              setSelectedVehicleType(slot.vehicleType);
                              setSelectedDepartureTime(slot.departureTime);
                              setCustomTimeInput('');
                              setIsVehicleFormVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.quickBookSlotBtnText}>Book</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.lockedSlotBadge}>
                            <Text style={styles.lockedSlotText}>
                              {check.minutesRemaining < 0 ? 'Departed' : 'Locked (<15m)'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* LIVE ROSTER OF STUDENTS UNDER HOSTEL CARE */}
            <View style={styles.rosterSection}>
              <View style={styles.rosterHeaderRow}>
                <View>
                  <Text style={styles.sectionHeading}>
                    Students Under Hostel Care in Transit ({filteredBookings.length})
                  </Text>
                  <Text style={styles.rosterSub}>
                    Live roster of booked students traveling to Vidyagiri & Health Center
                  </Text>
                </View>
              </View>

              {/* Destination Filter */}
              <View style={styles.rosterFilterRow}>
                {(['all', 'Vidyagiri', 'Health Center'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.rosterFilterBtn, rosterFilter === f && styles.rosterFilterBtnActive]}
                    onPress={() => setRosterFilter(f)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.rosterFilterBtnText,
                        rosterFilter === f && styles.rosterFilterBtnTextActive,
                      ]}
                    >
                      {f === 'all' ? 'All Transit' : f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Roster Cards */}
              <View style={styles.rosterCardsList}>
                {filteredBookings.map((student) => (
                  <View key={student.id} style={styles.rosterCard}>
                    <View style={styles.rosterCardTop}>
                      <View>
                        <Text style={styles.rosterStudentName}>{student.studentName}</Text>
                        <Text style={styles.rosterStudentSub}>
                          {student.usn} • Room {student.roomNumber}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.rosterDestTag,
                          student.destination === 'Health Center' && styles.rosterDestTagHealth,
                        ]}
                      >
                        <Text
                          style={[
                            styles.rosterDestTagText,
                            student.destination === 'Health Center' && { color: '#0F766E' },
                          ]}
                        >
                          {student.destination}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rosterBottomRow}>
                      <Text style={styles.rosterVehicleText}>
                        🚌 {student.vehicleType} • Seat #{student.seatNumber}
                      </Text>
                      <View style={styles.rosterTimeWrap}>
                        <Clock size={11} color={colors.primary} />
                        <Text style={styles.rosterTimeText}>{student.departureTime}</Text>
                      </View>
                    </View>

                    {student.isHealthCareEmergency && (
                      <View style={styles.priorityMedicalTag}>
                        <HeartPulse size={12} color="#DC2626" />
                        <Text style={styles.priorityMedicalText}>Priority Sick Bay Patient</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
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

  // Hostel Care Sub-Tab Row
  careSubTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 6,
  },
  careSubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  careSubTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  careSubTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  careSubTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  // Maintenance Banner
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
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
    lineHeight: 15,
  },
  lodgeButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  lodgeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },

  // Form Card
  formCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
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
    fontWeight: '800',
    color: colors.text,
  },
  cancelLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roomTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  roomTagText: {
    backgroundColor: colors.primarySubtle,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  blockTagText: {
    backgroundColor: '#F1F5F9',
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  categoryRow: {
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
  photoPolicyNotice: {
    fontSize: 10,
    color: '#0F766E',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    fontWeight: '600',
  },
  cameraCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  cameraCaptureBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Tickets List
  listSection: {
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  emptyState: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  ticketCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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

  // =========================================================
  // VEHICLE TRANSIT SECTION STYLES
  // =========================================================
  transitBannerCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  transitBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  transitIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  transitBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  transitBannerSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
    lineHeight: 15,
  },
  transitStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  transitStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  transitStatCardHealth: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  transitStatCardTotal: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  transitStatNum: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  transitStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
    textAlign: 'center',
  },
  transitStatSub: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
    textAlign: 'center',
  },

  // 15-Min Cutoff Policy Strip
  cutoffPolicyStrip: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cutoffPolicyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  cutoffPolicyDesc: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 14,
  },

  // Book Transit Button
  bookTransitBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bookTransitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Form Section Labels
  formSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  destToggleRow: {
    gap: 8,
    marginBottom: 14,
  },
  destBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
  },
  destBtnActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  destBtnActiveHealth: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
  },
  destBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  destBtnTitleActive: {
    color: colors.primary,
  },
  destBtnSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Vehicle Type Grid (Eeco, TT, Mini Bus, Bus)
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  vehicleCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  vehicleCardActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  vehicleCardIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  vehicleCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  vehicleCardNameActive: {
    color: colors.primary,
  },
  capacityBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  capacityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  // Timing Pills & Validation
  timingGuideText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  timingPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  timingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  timingPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timingPillLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  timingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  timingPillTextActive: {
    color: '#FFFFFF',
  },
  timingPillTextLocked: {
    color: '#94A3B8',
  },
  lockedTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#EF4444',
    textTransform: 'uppercase',
  },
  customTimingWrap: {
    marginBottom: 12,
  },
  subFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  customTimeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  cutoffResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  cutoffSuccessCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cutoffDangerCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  cutoffResultTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  cutoffResultMsg: {
    fontSize: 10,
    marginTop: 1,
  },

  // Emergency Checkbox
  emergencyCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  emergencyCheckboxActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  checkSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkSquareActive: {
    backgroundColor: '#DC2626',
  },
  emergencyCheckTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  emergencyCheckSub: {
    fontSize: 9,
    color: '#B91C1C',
    marginTop: 1,
  },

  // Confirm Button
  confirmBookingBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBookingBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmBookingBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Active Boarding Passes
  myPassesSection: {
    marginBottom: 16,
  },
  boardingPassCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 14,
    marginBottom: 10,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  passTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10,
  },
  passTokenBadge: {},
  passTokenLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  passTokenText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  passConfirmedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  passConfirmedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  passDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  passCol: {
    flex: 1,
    minWidth: '45%',
  },
  passSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  passValText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    marginBottom: 10,
  },
  driverInfoText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F766E',
  },
  cancelPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelPassBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  // Daily Schedule Section
  scheduleSection: {
    marginBottom: 16,
  },
  scheduleList: {
    gap: 8,
  },
  slotCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  slotIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotTimeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  slotDestBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  slotDestBadgeHealth: {
    backgroundColor: '#F0FDFA',
  },
  slotDestText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
  },
  slotVehicleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  slotPickupText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  slotRightAction: {
    marginLeft: 8,
    flexShrink: 0,
  },
  quickBookSlotBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  quickBookSlotBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockedSlotBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  lockedSlotText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // Live Roster Section
  rosterSection: {
    marginTop: 8,
  },
  rosterHeaderRow: {
    marginBottom: 8,
  },
  rosterSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rosterFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  rosterFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rosterFilterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rosterFilterBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rosterFilterBtnTextActive: {
    color: '#FFFFFF',
  },
  rosterCardsList: {
    gap: 8,
  },
  rosterCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rosterCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rosterStudentName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  rosterStudentSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rosterDestTag: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rosterDestTagHealth: {
    backgroundColor: '#F0FDFA',
  },
  rosterDestTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
  },
  rosterBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rosterVehicleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  rosterTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rosterTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  priorityMedicalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  priorityMedicalText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
});
