import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import api from '../../lib/api';
import type { Hostel } from '../../types/hostel.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HostelTab'>,
  StackNavigationProp<MainStackParamList>
>;

const LOCATION = 'Chikkamagaluru';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800';

interface HostelOverview {
  title: string;
  description: string;
  images: string[];
}

const formatDateParam = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateDisplay = (d: Date): string =>
  d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export default function HostelLandingScreen() {
  const navigation = useNavigation<Nav>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [stayType, setStayType] = useState<'hostel' | 'workstation'>('hostel');
  const [checkIn, setCheckIn] = useState<Date>(today);
  const [checkOut, setCheckOut] = useState<Date>(tomorrow);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const { data: hostels, isLoading } = useQuery({
    queryKey: ['hostels'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 10,
  });

  const trendingHostels = hostels?.slice(0, 3) ?? [];

  const handleStayTypeChange = (type: 'hostel' | 'workstation') => {
    setStayType(type);
    const newCheckOut = new Date(checkIn);
    if (type === 'workstation') {
      newCheckOut.setDate(newCheckOut.getDate() + 7);
    } else {
      newCheckOut.setDate(newCheckOut.getDate() + 1);
    }
    setCheckOut(newCheckOut);
  };

  const handleCheckInChange = (_: any, selected?: Date) => {
    setShowCheckIn(false);
    if (!selected) return;
    selected.setHours(0, 0, 0, 0);
    setCheckIn(selected);
    if (checkOut <= selected) {
      const newCheckOut = new Date(selected);
      if (stayType === 'workstation') {
        newCheckOut.setDate(newCheckOut.getDate() + 7);
      } else {
        newCheckOut.setDate(newCheckOut.getDate() + 1);
      }
      setCheckOut(newCheckOut);
    }
  };

  const handleCheckOutChange = (_: any, selected?: Date) => {
    setShowCheckOut(false);
    if (!selected) return;
    selected.setHours(0, 0, 0, 0);
    setCheckOut(selected);
  };

  const minCheckOut = (() => {
    const min = new Date(checkIn);
    if (stayType === 'workstation') {
      min.setDate(min.getDate() + 7);
    } else {
      min.setDate(min.getDate() + 1);
    }
    return min;
  })();

  const handleSearch = () => {
    if (checkOut <= checkIn) {
      Toast.show({ type: 'error', text1: 'Invalid dates', text2: 'Check-out must be after check-in' });
      return;
    }
    if (stayType === 'workstation') {
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 7) {
        Toast.show({ type: 'error', text1: 'Minimum 7 nights', text2: 'Workstation bookings require at least 7 days stay' });
        return;
      }
    }
    navigation.navigate('HostelSearch', {
      checkIn: formatDateParam(checkIn),
      checkOut: formatDateParam(checkOut),
      location: LOCATION,
      stayType,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#f47b20" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Hero Banner ── */}
        <View style={styles.hero}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800' }}
            style={styles.heroBg}
            resizeMode="cover"
          />
          <View style={styles.heroOverlay} />

          <SafeAreaView edges={['top']} style={styles.heroContent}>
            <Text style={styles.heroTitle}>Find Your Perfect Stay</Text>
            <Text style={styles.heroSubtitle}>Hostels, Hotels & Workspaces in Chikkamagaluru</Text>

            {/* ── Search Card ── */}
            <View style={styles.searchCard}>
              {/* Stay Type Tabs */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, stayType === 'hostel' && styles.tabActive]}
                  onPress={() => handleStayTypeChange('hostel')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="bed-outline"
                    size={16}
                    color={stayType === 'hostel' ? '#fff' : '#888'}
                  />
                  <Text style={[styles.tabText, stayType === 'hostel' && styles.tabTextActive]}>
                    Hostels
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, stayType === 'workstation' && styles.tabActive]}
                  onPress={() => handleStayTypeChange('workstation')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="laptop-outline"
                    size={16}
                    color={stayType === 'workstation' ? '#fff' : '#888'}
                  />
                  <Text style={[styles.tabText, stayType === 'workstation' && styles.tabTextActive]}>
                    Workstation
                  </Text>
                </TouchableOpacity>
              </View>

              {stayType === 'workstation' && (
                <Text style={styles.workstationNote}>
                  📌 Minimum 7 days stay required for workstation bookings
                </Text>
              )}

              {/* Location */}
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#f47b20" />
                <Text style={styles.locationLabel}>Where</Text>
              </View>
              <View style={styles.locationBox}>
                <Text style={styles.locationValue}>{LOCATION}</Text>
                <Ionicons name="location" size={16} color="#ccc" />
              </View>

              {/* Date Pickers */}
              <View style={styles.datesRow}>
                {/* Check-in */}
                <TouchableOpacity
                  style={styles.datePicker}
                  onPress={() => setShowCheckIn(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.datePickerLabel}>Check-in</Text>
                  <View style={styles.datePickerValueRow}>
                    <Ionicons name="calendar-outline" size={14} color="#f47b20" />
                    <Text style={styles.datePickerValue}>{formatDateDisplay(checkIn)}</Text>
                  </View>
                </TouchableOpacity>

                {/* Check-out */}
                <TouchableOpacity
                  style={styles.datePicker}
                  onPress={() => setShowCheckOut(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.datePickerLabel}>Check-out</Text>
                  <View style={styles.datePickerValueRow}>
                    <Ionicons name="calendar-outline" size={14} color="#f47b20" />
                    <Text style={styles.datePickerValue}>{formatDateDisplay(checkOut)}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Search Button */}
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={styles.searchBtnText}>BOOK NOW</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* ── Why Choose Us ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Choose Us?</Text>
          <View style={styles.featuresRow}>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="bed-outline" size={28} color="#f47b20" />
              </View>
              <Text style={styles.featureTitle}>Comfortable Stays</Text>
              <Text style={styles.featureDesc}>Clean, comfortable rooms with modern amenities</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="wifi-outline" size={28} color="#f47b20" />
              </View>
              <Text style={styles.featureTitle}>High-Speed WiFi</Text>
              <Text style={styles.featureDesc}>Fast, reliable internet for work and streaming</Text>
            </View>
            <View style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name="cafe-outline" size={28} color="#f47b20" />
              </View>
              <Text style={styles.featureTitle}>Common Areas</Text>
              <Text style={styles.featureDesc}>Spacious areas to relax and meet fellow travelers</Text>
            </View>
          </View>
        </View>

        {/* ── Trending Hostels ── */}
        {isLoading ? (
          <ActivityIndicator color="#f47b20" style={{ marginVertical: 20 }} />
        ) : trendingHostels.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.trendingHeader}>
              <Ionicons name="trending-up" size={22} color="#f47b20" />
              <Text style={styles.sectionTitle}>Trending Hostels</Text>
            </View>
            {trendingHostels.map((hostel) => (
              <TouchableOpacity
                key={hostel._id}
                style={styles.hostelCard}
                onPress={() => {/* tapping trending stays on landing page, same as web — stays on landing */}}
                activeOpacity={0.85}
              >
                <Image
                  source={{
                    uri: hostel.images?.[0] ?? 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400',
                  }}
                  style={styles.hostelCardImage}
                  resizeMode="cover"
                />
                {hostel.supportsWorkstation && (
                  <View style={styles.workstationBadge}>
                    <Ionicons name="sparkles" size={10} color="#f47b20" />
                    <Text style={styles.workstationBadgeText}>Workstation</Text>
                  </View>
                )}
                <View style={styles.hostelCardBody}>
                  <Text style={styles.hostelCardName}>{hostel.name}</Text>
                  <View style={styles.hostelCardLocation}>
                    <Ionicons name="location-outline" size={13} color="#888" />
                    <Text style={styles.hostelCardLocationText}>{hostel.location}</Text>
                  </View>
                  {(hostel.rating || hostel.ratings) ? (
                    <View style={styles.hostelCardRating}>
                      <Text style={styles.ratingStarEmoji}>⭐</Text>
                      <Text style={styles.ratingValue}>{hostel.rating ?? hostel.ratings}/5</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* ── CTA ── */}
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Ready to Book Your Stay?</Text>
          <Text style={styles.ctaSubtitle}>
            Search from our wide range of hostels and find the perfect match for your trip
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleSearch} activeOpacity={0.85}>
            <Ionicons name="search" size={18} color="#f47b20" />
            <Text style={styles.ctaBtnText}>Start Searching</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Native date pickers */}
      {showCheckIn && (
        <DateTimePicker
          mode="date"
          value={checkIn}
          minimumDate={today}
          onChange={handleCheckInChange}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
        />
      )}
      {showCheckOut && (
        <DateTimePicker
          mode="date"
          value={checkOut}
          minimumDate={minCheckOut}
          onChange={handleCheckOutChange}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },

  // Hero
  hero: { position: 'relative', minHeight: 480 },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244,123,32,0.52)',
  },
  heroContent: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  heroTitle: {
    fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6,
    marginTop: 8,
  },
  heroSubtitle: {
    fontSize: 14, color: 'rgba(255,255,255,0.92)', textAlign: 'center', marginBottom: 20,
  },

  // Search Card
  searchCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 8,
  },
  tabRow: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, backgroundColor: '#f9f9f9',
  },
  tabActive: { backgroundColor: '#f47b20' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  workstationNote: { fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 10 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  locationLabel: { fontSize: 13, fontWeight: '600', color: '#555' },
  locationBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 11, backgroundColor: '#f9f9f9', marginBottom: 12,
  },
  locationValue: { fontSize: 14, color: '#555', fontWeight: '500' },

  datesRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  datePicker: {
    flex: 1, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10,
    padding: 10, backgroundColor: '#f9f9f9',
  },
  datePickerLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  datePickerValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  datePickerValue: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', flex: 1 },

  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#f47b20', borderRadius: 12, paddingVertical: 14,
  },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // Section
  section: { padding: 16, backgroundColor: '#fff', marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },

  // Why Choose Us
  featuresRow: { flexDirection: 'row', gap: 10 },
  featureCard: {
    flex: 1, borderRadius: 12, padding: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f0f0f0',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  featureIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff5ed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  featureTitle: { fontSize: 12, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  featureDesc: { fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 14 },

  // Trending
  trendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  hostelCard: {
    borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  hostelCardImage: { width: '100%', height: 180 },
  workstationBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  workstationBadgeText: { fontSize: 10, fontWeight: '700', color: '#f47b20' },
  hostelCardBody: { padding: 12 },
  hostelCardName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  hostelCardLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  hostelCardLocationText: { fontSize: 13, color: '#888' },
  hostelCardRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStarEmoji: { fontSize: 13 },
  ratingValue: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },

  // CTA
  cta: {
    margin: 16, borderRadius: 16, padding: 24,
    backgroundColor: '#f47b20', alignItems: 'center',
  },
  ctaTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  ctaSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  ctaBtnText: { fontSize: 15, fontWeight: '700', color: '#f47b20' },
});
