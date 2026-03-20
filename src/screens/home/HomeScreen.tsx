import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Animated,
  ImageBackground,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import BikeCard from '../../components/bikes/BikeCard';
import PopupBanner from '../../components/common/PopupBanner';
import api from '../../lib/api';
import type { Bike } from '../../types/bike.types';
import { DEFAULT_LOCATION } from '../../types/bike.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  StackNavigationProp<MainStackParamList>
>;

// ─── Date/time helpers ────────────────────────────────────────────────────────

/** Round up to next 30-min block; enforce minimum 8:00 AM */
function getSmartPickup(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  // Round to next 30-min block
  if (minutes === 0) {
    now.setMinutes(30, 0, 0);
  } else if (minutes <= 30) {
    now.setMinutes(30, 0, 0);
  } else {
    now.setHours(now.getHours() + 1, 0, 0, 0);
  }
  // Enforce minimum 8:00 AM
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  if (now < today) {
    return new Date(today);
  }
  return now;
}

/** Ensure dropoff is at least 30 min after pickup */
function adjustDropoff(pickup: Date, dropoff: Date): Date {
  const minDrop = new Date(pickup.getTime() + 30 * 60 * 1000);
  return dropoff <= pickup ? minDrop : dropoff;
}

/** Build a default dropoff: same day at 20:00, or pickup+30min if pickup is after 20:00 */
function getDefaultDropoff(pickup: Date): Date {
  const drop = new Date(pickup);
  drop.setHours(20, 0, 0, 0);
  return adjustDropoff(pickup, drop);
}

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const formatDateParam = (d: Date) => d.toISOString().split('T')[0];
const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const formatTimeParam = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const HERO_IMAGE = 'https://alka-jewellery-files.s3.amazonaws.com/4b31ec10-b379-434c-a935-941fa56b7abf.webp';


const DUMMY_BIKES: Partial<Bike>[] = [
  { _id: 'd1', title: 'Royal Enfield Classic 350', brand: 'Royal Enfield', model: 'Classic 350', year: 2023, availableQuantity: 3 },
  { _id: 'd2', title: 'Honda Activa 6G', brand: 'Honda', model: 'Activa 6G', year: 2023, availableQuantity: 5 },
  { _id: 'd3', title: 'Yamaha FZ-S V3', brand: 'Yamaha', model: 'FZ-S V3', year: 2022, availableQuantity: 2 },
  { _id: 'd4', title: 'Bajaj Pulsar 150', brand: 'Bajaj', model: 'Pulsar 150', year: 2023, availableQuantity: 4 },
  { _id: 'd5', title: 'TVS Apache RTR 160', brand: 'TVS', model: 'Apache RTR 160', year: 2023, availableQuantity: 2 },
];

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function TrendingBikeSkeleton() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View style={[skeletonStyles.card, { opacity }]}>
      <View style={skeletonStyles.image} />
      <View style={skeletonStyles.body}>
        <View style={skeletonStyles.titleLine} />
        <View style={skeletonStyles.subLine} />
        <View style={skeletonStyles.priceLine} />
      </View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    width: 190, backgroundColor: '#f0f0f0', borderRadius: 12,
    marginRight: 12, overflow: 'hidden',
  },
  image: { width: '100%', height: 120, backgroundColor: '#e0e0e0' },
  body: { padding: 10, gap: 8 },
  titleLine: { height: 14, backgroundColor: '#e0e0e0', borderRadius: 6, width: '80%' },
  subLine: { height: 11, backgroundColor: '#e0e0e0', borderRadius: 6, width: '55%' },
  priceLine: { height: 18, backgroundColor: '#e0e0e0', borderRadius: 6, width: '45%' },
});

// ─── Main component ────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { itemCount } = useCartStore();
  const insets = useSafeAreaInsets();

  const smartPickup = getSmartPickup();
  const [pickup, setPickup] = useState(smartPickup);
  const [dropoff, setDropoff] = useState(getDefaultDropoff(smartPickup));

  // Auto-open picker chain: pickupDate → pickupTime → dropoffDate → dropoffTime
  const [showPickupDate, setShowPickupDate] = useState(false);
  const [showPickupTime, setShowPickupTime] = useState(false);
  const [showDropoffDate, setShowDropoffDate] = useState(false);
  const [showDropoffTime, setShowDropoffTime] = useState(false);

  const { data: bikes, isLoading: bikesLoading, isError: bikesError } = useQuery({
    queryKey: ['bikes', 'trending'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/trending');
      return res.data.data;
    },
  });

  const displayBikes = bikesError ? (DUMMY_BIKES as Bike[]) : (bikes ?? []);

  const handleSearch = () => {
    navigation.navigate('BikeSearch', {
      startDate: formatDateParam(pickup),
      endDate: formatDateParam(dropoff),
      startTime: formatTimeParam(pickup),
      endTime: formatTimeParam(dropoff),
      location: DEFAULT_LOCATION,
    });
  };

  // ─── Pickup date changed ────────────────────────────────────────────────────
  const handlePickupDateChange = (_: any, d?: Date) => {
    setShowPickupDate(Platform.OS === 'ios');
    if (!d) return;
    const newPickup = new Date(pickup);
    newPickup.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setPickup(newPickup);
    setDropoff(prev => adjustDropoff(newPickup, prev));
    // Auto-open pickup time picker
    if (Platform.OS === 'android') {
      setTimeout(() => setShowPickupTime(true), 300);
    }
  };

  // ─── Pickup time changed ────────────────────────────────────────────────────
  const handlePickupTimeChange = (_: any, d?: Date) => {
    setShowPickupTime(Platform.OS === 'ios');
    if (!d) return;
    const newPickup = new Date(pickup);
    newPickup.setHours(d.getHours(), d.getMinutes(), 0, 0);
    // Enforce min 8:00 AM on same-day
    const todayAt8 = new Date();
    todayAt8.setHours(8, 0, 0, 0);
    const isSameDay = newPickup.toDateString() === new Date().toDateString();
    if (isSameDay && newPickup < todayAt8) {
      newPickup.setHours(8, 0, 0, 0);
    }
    setPickup(newPickup);
    setDropoff(prev => adjustDropoff(newPickup, prev));
    // Auto-open dropoff date picker
    if (Platform.OS === 'android') {
      setTimeout(() => setShowDropoffDate(true), 300);
    }
  };

  // ─── Dropoff date changed ────────────────────────────────────────────────────
  const handleDropoffDateChange = (_: any, d?: Date) => {
    setShowDropoffDate(Platform.OS === 'ios');
    if (!d) return;
    const newDropoff = new Date(dropoff);
    newDropoff.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setDropoff(adjustDropoff(pickup, newDropoff));
    // Auto-open dropoff time picker
    if (Platform.OS === 'android') {
      setTimeout(() => setShowDropoffTime(true), 300);
    }
  };

  // ─── Dropoff time changed ────────────────────────────────────────────────────
  const handleDropoffTimeChange = (_: any, d?: Date) => {
    setShowDropoffTime(Platform.OS === 'ios');
    if (!d) return;
    const newDropoff = new Date(dropoff);
    newDropoff.setHours(d.getHours(), d.getMinutes(), 0, 0);
    setDropoff(adjustDropoff(pickup, newDropoff));
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Hero Section ── */}
        <ImageBackground
          source={{ uri: HERO_IMAGE }}
          style={[styles.hero, { paddingTop: insets.top + 12 }]}
          imageStyle={styles.heroBg}
        >
          {/* dark overlay */}
          <View style={styles.heroOverlay} />
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Image source={require('../../../assets/happygo.jpeg')} style={styles.logoImage} resizeMode="cover" />
              </View>
              <Text style={styles.logoText}>Happy Go</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              style={styles.cartBtn}
              accessibilityLabel="Cart"
            >
              <Ionicons name="cart-outline" size={22} color="#fff" />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Hero Text */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Happy Ride <Text style={styles.heroTitleAccent}>Happy Stay</Text>
            </Text>
            <Text style={styles.heroSub}>
              Best Bike Rental Service in Chikkamagaluru Since 2010
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name="star" size={16} color="#f59e0b" />
              ))}
              <Text style={styles.starsText}> 5 Star Rating on Google Maps</Text>
            </View>
            <Text style={styles.heroServed}>Served more than 3.5 lakh people</Text>
          </View>
        

        {/* Search Card — floats up over the hero */}
        <View style={styles.searchCard}>
            <Text style={styles.searchCardTitle}>Search Your Next Ride</Text>

            <View style={styles.searchRow}>
              {/* Pickup */}
              <View style={styles.searchHalf}>
                <Text style={styles.searchLabel}>Pickup</Text>
                <TouchableOpacity style={styles.searchField} onPress={() => setShowPickupDate(true)}>
                  <Ionicons name="calendar-outline" size={14} color="#f47b20" />
                  <Text style={styles.searchFieldText}>{formatDate(pickup)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchField} onPress={() => setShowPickupTime(true)}>
                  <Ionicons name="time-outline" size={14} color="#f47b20" />
                  <Text style={styles.searchFieldText}>{formatTime(pickup)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.searchDivider} />

              {/* Dropoff */}
              <View style={styles.searchHalf}>
                <Text style={styles.searchLabel}>Drop-off</Text>
                <TouchableOpacity style={styles.searchField} onPress={() => setShowDropoffDate(true)}>
                  <Ionicons name="calendar-outline" size={14} color="#f47b20" />
                  <Text style={styles.searchFieldText}>{formatDate(dropoff)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.searchField} onPress={() => setShowDropoffTime(true)}>
                  <Ionicons name="time-outline" size={14} color="#f47b20" />
                  <Text style={styles.searchFieldText}>{formatTime(dropoff)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Search Bikes</Text>
            </TouchableOpacity>
          </View>
          </ImageBackground>
        {/* ── Date/Time Pickers ── */}
        {showPickupDate && (
          <DateTimePicker
            value={pickup}
            mode="date"
            minimumDate={new Date()}
            onChange={handlePickupDateChange}
          />
        )}
        {showPickupTime && (
          <DateTimePicker
            value={pickup}
            mode="time"
            is24Hour
            minuteInterval={30}
            onChange={handlePickupTimeChange}
          />
        )}
        {showDropoffDate && (
          <DateTimePicker
            value={dropoff}
            mode="date"
            minimumDate={pickup}
            onChange={handleDropoffDateChange}
          />
        )}
        {showDropoffTime && (
          <DateTimePicker
            value={dropoff}
            mode="time"
            is24Hour
            minuteInterval={30}
            onChange={handleDropoffTimeChange}
          />
        )}

        {/* ── Popular Bikes ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Popular Bikes in Chikkamagaluru</Text>
              <Text style={styles.sectionSub}>Most loved bikes by our customers</Text>
            </View>
          </View>

          {bikesLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              scrollEnabled={false}
            >
              {[1, 2, 3, 4, 5].map(i => <TrendingBikeSkeleton key={i} />)}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {displayBikes.length > 0
                ? displayBikes.map(item => (
                    <BikeCard
                      key={item._id}
                      bike={item}
                      onPress={() => navigation.navigate('BikeDetail', {
                        bikeId: item._id,
                        startDate: formatDateParam(pickup),
                        endDate: formatDateParam(dropoff),
                        startTime: formatTimeParam(pickup),
                        endTime: formatTimeParam(dropoff),
                      })}
                    />
                  ))
                : <Text style={styles.emptyText}>No bikes available</Text>
              }
            </ScrollView>
          )}

          <TouchableOpacity style={styles.swipeHint}>
            <Text style={styles.swipeText}>← Swipe to see more bikes →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Services Section ── */}
        <View style={styles.servicesSection}>
          <Text style={styles.servicesTitle}>Our Services</Text>
          <View style={styles.servicesRow}>
            <TouchableOpacity style={styles.serviceCard} onPress={handleSearch}>
              <View style={[styles.serviceIcon, { backgroundColor: '#fff5ed' }]}>
                <Ionicons name="bicycle" size={32} color="#f47b20" />
              </View>
              <Text style={styles.serviceCardTitle}>Bike Rental</Text>
              <Text style={styles.serviceCardSub}>Explore Chikkamagaluru on two wheels</Text>
              <View style={styles.serviceBtn}>
                <Text style={styles.serviceBtnText}>Rent Now →</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => (navigation as any).navigate('HostelTab')}
            >
              <View style={[styles.serviceIcon, { backgroundColor: '#f0fdf4' }]}>
                <Ionicons name="bed-outline" size={32} color="#22c55e" />
              </View>
              <Text style={styles.serviceCardTitle}>Hostels</Text>
              <Text style={styles.serviceCardSub}>Comfortable stays for every budget</Text>
              <View style={[styles.serviceBtn, { backgroundColor: '#22c55e' }]}>
                <Text style={styles.serviceBtnText}>Book Hostels →</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Why Choose ── */}
        <View style={styles.whySection}>
          <Text style={styles.whyTitle}>Why Choose Happy Go?</Text>
          <Text style={styles.whySub}>
            Experience the best bike rental service in Chikkamagaluru with our premium bikes and exceptional service
          </Text>
          {[
            { icon: 'star-outline', title: '5 Star Rating on Google Map', sub: 'All bikes are regularly serviced and safety checked' },
            { icon: 'call-outline', title: '24/7 Support', sub: 'Round the clock customer support for any assistance' },
            { icon: 'ribbon-outline', title: 'Best Prices', sub: 'Competitive pricing with no hidden charges' },
            { icon: 'people-outline', title: 'Trusted Since 2010', sub: 'Over a decade of reliable service in Chikkamagaluru' },
          ].map((item) => (
            <View key={item.title} style={styles.whyCard}>
              <Ionicons name={item.icon as any} size={32} color="#f47b20" />
              <Text style={styles.whyCardTitle}>{item.title}</Text>
              <Text style={styles.whyCardSub}>{item.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── CTA Banner ── */}
        <View style={styles.ctaBanner}>
          <Text style={styles.ctaTitle}>Ready for Your Next Adventure?</Text>
          <Text style={styles.ctaSub}>
            Book your perfect bike today and explore the beautiful landscapes of Chikkamagaluru
          </Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleSearch}>
            <Text style={styles.ctaBtnText}>Book a Bike Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ctaCallBtn}
            onPress={() => {
              const { Linking } = require('react-native');
              Linking.openURL('tel:+919008022800');
            }}
          >
            <Ionicons name="call-outline" size={16} color="#f47b20" />
            <Text style={styles.ctaCallText}>Call +91 90080-22800</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
      <PopupBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // ── Hero ──
  hero: { backgroundColor: '#1a1a2e', paddingBottom: 32, minHeight: 480 },
  heroBg: { resizeMode: 'cover' },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,15,30,0.62)',
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#f47b20', overflow: 'hidden',
  },
  logoImage: { width: 36, height: 36 },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  cartBtn: { padding: 6, position: 'relative' },
  cartBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#ef4444', borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  heroContent: { paddingHorizontal: 16, paddingBottom: 20, alignItems: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#ffffff', textAlign: 'center', lineHeight: 36 },
  heroTitleAccent: { color: '#f47b20' },
  heroSub: { fontSize: 13, color: '#cccccc', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  starsText: { color: '#ffffff', fontSize: 12, fontWeight: '500' },
  heroServed: { color: '#aaaaaa', fontSize: 12, marginTop: 4 },

  // ── Search Card ──
  searchCard: {
    backgroundColor: '#ffffff', marginHorizontal: 16,
    borderRadius: 16, padding: 16,
    marginTop: 20, marginBottom: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    zIndex: 10,
  },
  searchCardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12, textAlign: 'center' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchHalf: { flex: 1, gap: 6 },
  searchDivider: { width: 1, backgroundColor: '#e5e5e5', marginVertical: 4 },
  searchLabel: { fontSize: 12, fontWeight: '600', color: '#666666', marginBottom: 2 },
  searchField: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f9f9f9', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e5e5e5',
  },
  searchFieldText: { fontSize: 12, color: '#1a1a1a', flex: 1 },
  searchBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // ── Popular Bikes Section ──
  section: { paddingTop: 32, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  sectionSub: { fontSize: 12, color: '#999999', marginTop: 2 },
  hList: { paddingLeft: 16, paddingRight: 8 },
  emptyText: { color: '#999', fontSize: 14, paddingHorizontal: 16 },
  swipeHint: { alignItems: 'center', marginTop: 8 },
  swipeText: { fontSize: 12, color: '#999' },

  // ── Services Section ──
  servicesSection: {
    paddingHorizontal: 16, paddingVertical: 24,
    borderTopWidth: 8, borderTopColor: '#f9f9f9',
  },
  servicesTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 14, textAlign: 'center' },
  servicesRow: { flexDirection: 'row', gap: 12 },
  serviceCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  serviceIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  serviceCardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  serviceCardSub: { fontSize: 11, color: '#666', textAlign: 'center', lineHeight: 16 },
  serviceBtn: {
    backgroundColor: '#f47b20', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7, marginTop: 4,
  },
  serviceBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // ── Why Choose ──
  whySection: {
    backgroundColor: '#ffffff', padding: 20,
    borderTopWidth: 8, borderTopColor: '#f9f9f9',
  },
  whyTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 6 },
  whySub: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  whyCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 20,
    alignItems: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  whyCardTitle: { fontSize: 15, fontWeight: '700', color: '#f47b20', marginTop: 10, marginBottom: 4 },
  whyCardSub: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },

  // ── CTA Banner ──
  ctaBanner: {
    backgroundColor: '#1a1a2e', padding: 28,
    alignItems: 'center', gap: 12, marginTop: 8,
  },
  ctaTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', textAlign: 'center' },
  ctaSub: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  ctaBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 40, width: '100%', alignItems: 'center',
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ctaCallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: '#f47b20', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 40, width: '100%', justifyContent: 'center',
  },
  ctaCallText: { color: '#f47b20', fontWeight: '600', fontSize: 14 },
});
