import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Utensils,
  Clock,
  Star,
  Sparkles,
  CheckCircle2,
  Calendar,
  DollarSign,
  Coffee,
  Sun,
  Sunset,
  Moon,
  Camera,
  Trash2,
  ShieldCheck,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { colors } from '../theme/colors';
import { UserProfile, MessDaySchedule, MessMeal } from '../types';
import { WEEKLY_MESS_SCHEDULE, StorageService } from '../services/storage';

export const MessScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDay, setSelectedDay] = useState<MessDaySchedule['day']>('Monday');
  const [ratingMeal, setRatingMeal] = useState<'Breakfast' | 'Lunch' | 'Dinner'>('Lunch');
  const [stars, setStars] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);

  React.useEffect(() => {
    StorageService.getProfile().then(setProfile);
  }, []);

  const currentSchedule =
    WEEKLY_MESS_SCHEDULE.find((d) => d.day === selectedDay) || WEEKLY_MESS_SCHEDULE[0];

  const getMealIcon = (type: MessMeal['type']) => {
    switch (type) {
      case 'Breakfast':
        return <Coffee size={18} color="#D97706" />;
      case 'Lunch':
        return <Sun size={18} color="#EA580C" />;
      case 'Evening Snacks':
        return <Sunset size={18} color="#B45309" />;
      case 'Dinner':
        return <Moon size={18} color="#4338CA" />;
    }
  };

  const handleCaptureMealPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert(
          'Camera Access Required',
          'Please allow camera access to take a live photo of your meal for committee quality review.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMealPhoto(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Camera capture error', err);
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    }
  };

  const handleRatingSubmit = async () => {
    if (!feedbackText.trim() && stars <= 3 && !mealPhoto) {
      Alert.alert(
        'Details Suggested',
        'Please let the mess committee know what could be improved, or snap a live meal photo.'
      );
      return;
    }

    try {
      await StorageService.submitMessRating({
        mealType: ratingMeal,
        rating: stars,
        feedback: feedbackText.trim() || undefined,
        photoUri: mealPhoto || undefined,
      });

      setFeedbackSubmitted(true);
      const photoNote = mealPhoto ? ' with live meal photo inspection' : '';
      Alert.alert(
        'Feedback Stored & Dispatched',
        `Thank you! Your rating for ${ratingMeal} (${stars} Stars)${photoNote} has been safely saved and sent directly to the Admin Dashboard for warden & mess committee review. Uploaded meal photos are never stored in your personal phone gallery.`
      );
      // Discard uploaded photo so it is not stored permanently on device
      setMealPhoto(null);
      setFeedbackText('');
      setTimeout(() => setFeedbackSubmitted(false), 3000);
    } catch (err) {
      console.warn('Mess rating error', err);
      Alert.alert('Submission Error', 'Failed to store mess review. Please try again.');
    }
  };

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
        {/* Top Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerIconWrap}>
              <Utensils size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.bannerTitle}>Annapurna Hostel Mess</Text>
              <Text style={styles.bannerSub}>Pure Veg & Non-Veg Multi-Cuisine Dining</Text>
            </View>
          </View>
        </View>

        {/* Day of Week Selector */}
        <View style={styles.daySelectorWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayScrollContent}
          >
            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const).map(
              (day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        </View>

        {/* Selected Day Heading */}
        <View style={styles.dayHeadingRow}>
          <Calendar size={18} color={colors.primary} />
          <Text style={styles.dayHeadingText}>{selectedDay} Menu Schedule</Text>
        </View>

        {/* Meal Cards */}
        <View style={styles.mealsContainer}>
          {currentSchedule.meals.map((meal, index) => (
            <View
              key={index}
              style={[styles.mealCard, meal.isSpecial && styles.mealCardSpecial]}
            >
              <View style={styles.mealCardHeader}>
                <View style={styles.mealTypeRow}>
                  {getMealIcon(meal.type)}
                  <Text style={styles.mealTypeTitle}>{meal.type}</Text>
                  {meal.isSpecial && (
                    <View style={styles.specialBadge}>
                      <Sparkles size={11} color="#B45309" />
                      <Text style={styles.specialBadgeText}>Special Menu</Text>
                    </View>
                  )}
                </View>
                <View style={styles.timeTag}>
                  <Clock size={12} color={colors.textSecondary} />
                  <Text style={styles.timeTagText}>{meal.timing}</Text>
                </View>
              </View>

              {/* Items */}
              <View style={styles.itemsWrap}>
                {meal.items.map((item, i) => (
                  <View key={i} style={styles.itemBulletRow}>
                    <View style={styles.itemDot} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* =======================================================
            FEEDBACK & RATING WIDGET
           ======================================================= */}
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>Daily Meal Feedback & Rating</Text>
          <Text style={styles.feedbackSubtitle}>
            Help the mess committee maintain high hygiene and food quality standards.
          </Text>

          {/* Select Meal to Rate */}
          <View style={styles.mealToggleRow}>
            {(['Breakfast', 'Lunch', 'Dinner'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.mealToggleBtn, ratingMeal === m && styles.mealToggleBtnActive]}
                onPress={() => setRatingMeal(m)}
              >
                <Text
                  style={[
                    styles.mealToggleText,
                    ratingMeal === m && styles.mealToggleTextActive,
                  ]}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Star Selector */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setStars(star)} style={{ padding: 4 }}>
                <Star
                  size={28}
                  color={star <= stars ? '#F59E0B' : '#CBD5E1'}
                  fill={star <= stars ? '#F59E0B' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
            <Text style={styles.starScoreText}>{stars} / 5 Stars</Text>
          </View>

          {/* Comments */}
          <TextInput
            style={styles.feedbackInput}
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder={`Any notes on taste, cleanliness, or portion size for today's ${ratingMeal}?`}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
          />

          {/* Live In-App Camera Meal Capture */}
          <View style={styles.messCameraSection}>
            <View style={styles.messCameraHeader}>
              <View style={styles.messCameraIconWrap}>
                <Camera size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.messCameraTitle}>Live Meal Photo Verification</Text>
                <Text style={styles.messCameraSub}>
                  In-app camera only • Gallery disabled • Not saved to device
                </Text>
              </View>
            </View>

            {mealPhoto ? (
              <View style={styles.messPhotoPreviewCard}>
                <Image source={{ uri: mealPhoto }} style={styles.messPhotoPreview} />
                <TouchableOpacity
                  style={styles.discardMealPhotoBtn}
                  onPress={() => setMealPhoto(null)}
                  activeOpacity={0.8}
                >
                  <Trash2 size={14} color="#FFFFFF" />
                  <Text style={styles.discardMealPhotoText}>Discard Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.takeMealPhotoBtn}
                onPress={handleCaptureMealPhoto}
                activeOpacity={0.85}
              >
                <Camera size={18} color="#FFFFFF" />
                <Text style={styles.takeMealPhotoBtnText}>Open Camera to Snap Meal Plate</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitRatingBtn}
            onPress={handleRatingSubmit}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text style={styles.submitRatingBtnText}>Submit Meal Review</Text>
          </TouchableOpacity>
        </View>

        {/* Mess Rebate Notice */}
        <View style={styles.rebateCard}>
          <View style={styles.rebateHeader}>
            <DollarSign size={18} color="#0D9488" />
            <Text style={styles.rebateTitle}>Mess Rebate During Approved Leave</Text>
          </View>
          <Text style={styles.rebateText}>
            Hostel rules: When you apply for official leave exceeding 3 consecutive days, your
            mess account is credited with a daily rebate of ₹120/day automatically deducted from
            next month's mess bill.
          </Text>
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
  bannerCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  bannerHeader: {
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
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerSub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  daySelectorWrapper: {
    marginBottom: 14,
  },
  dayScrollContent: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  dayHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dayHeadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  mealsContainer: {
    gap: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    minWidth: 280,
  },
  mealCardSpecial: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFDF5',
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeTagText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  itemsWrap: {
    marginTop: 10,
    gap: 6,
  },
  itemBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  itemText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  feedbackCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 18,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  feedbackSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  mealToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  mealToggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  mealToggleBtnActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  mealToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  mealToggleTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  starScoreText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  feedbackInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: colors.text,
    minHeight: 50,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  messCameraSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  messCameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  messCameraIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messCameraTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  messCameraSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  takeMealPhotoBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  takeMealPhotoBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  messPhotoPreviewCard: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    padding: 8,
  },
  messPhotoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  discardMealPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  discardMealPhotoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submitRatingBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitRatingBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  rebateCard: {
    backgroundColor: colors.secondarySubtle,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  rebateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rebateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  rebateText: {
    fontSize: 11,
    color: '#134E4A',
    lineHeight: 16,
  },
});
