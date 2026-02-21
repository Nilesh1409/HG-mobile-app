import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
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
import api from '../../lib/api';
import type { Bike } from '../../types/bike.types';
import { DEFAULT_LOCATION } from '../../types/bike.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  StackNavigationProp<MainStackParamList>
>;

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const formatDateParam = (d: Date) => d.toISOString().split('T')[0];
const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const formatTimeParam = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const { itemCount } = useCartStore();
  const insets = useSafeAreaInsets();

  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(8);
  const later = new Date(now);
  later.setHours(20);

  const [pickup, setPickup] = useState(now);
  const [dropoff, setDropoff] = useState(later);
  const [showPickupDate, setShowPickupDate] = useState(false);
  const [showPickupTime, setShowPickupTime] = useState(false);
  const [showDropoffDate, setShowDropoffDate] = useState(false);
  const [showDropoffTime, setShowDropoffTime] = useState(false);

  const { data: bikes, isLoading: bikesLoading } = useQuery({
    queryKey: ['bikes', 'trending'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Bike[] }>('/bikes/trending');
      return res.data.data;
    },
  });

  const handleSearch = () => {
    navigation.navigate('BikeSearch', {
      startDate: formatDateParam(pickup),
      endDate: formatDateParam(dropoff),
      startTime: formatTimeParam(pickup),
      endTime: formatTimeParam(dropoff),
      location: DEFAULT_LOCATION,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#f47b20" />
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]}>
        {/* Hero Section */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Text style={styles.logoBoxText}>H</Text>
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

          {/* Search Card */}
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
                <Text style={styles.searchLabel}>Drop-off Date & Time</Text>
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
        </View>

        {/* Date/Time Pickers */}
        {showPickupDate && (
          <DateTimePicker value={pickup} mode="date" minimumDate={new Date()}
            onChange={(_, d) => { setShowPickupDate(Platform.OS === 'ios'); if (d) setPickup(prev => { const n = new Date(prev); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); return n; }); }} />
        )}
        {showPickupTime && (
          <DateTimePicker value={pickup} mode="time" is24Hour minuteInterval={30}
            onChange={(_, d) => { setShowPickupTime(Platform.OS === 'ios'); if (d) setPickup(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }} />
        )}
        {showDropoffDate && (
          <DateTimePicker value={dropoff} mode="date" minimumDate={pickup}
            onChange={(_, d) => { setShowDropoffDate(Platform.OS === 'ios'); if (d) setDropoff(prev => { const n = new Date(prev); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); return n; }); }} />
        )}
        {showDropoffTime && (
          <DateTimePicker value={dropoff} mode="time" is24Hour minuteInterval={30}
            onChange={(_, d) => { setShowDropoffTime(Platform.OS === 'ios'); if (d) setDropoff(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }} />
        )}

        {/* Popular Bikes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Popular Bikes in Chikkamagaluru</Text>
              <Text style={styles.sectionSub}>Most loved bikes by our customers</Text>
            </View>
          </View>
          {bikesLoading ? (
            <ActivityIndicator color="#f47b20" style={styles.loader} />
          ) : (
            <FlatList
              data={bikes}
              keyExtractor={(item) => item._id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <BikeCard
                  bike={item}
                  onPress={() => navigation.navigate('BikeDetail', {
                    bikeId: item._id,
                    startDate: formatDateParam(pickup),
                    endDate: formatDateParam(dropoff),
                    startTime: formatTimeParam(pickup),
                    endTime: formatTimeParam(dropoff),
                  })}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No bikes available</Text>}
            />
          )}
          <TouchableOpacity style={styles.swipeHint}>
            <Text style={styles.swipeText}>← Swipe to see more bikes →</Text>
          </TouchableOpacity>
        </View>

        {/* Why Choose */}
        <View style={styles.whySection}>
          <Text style={styles.whyTitle}>Why Choose Happy Go?</Text>
          <Text style={styles.whySub}>Experience the best bike rental service in Chikkamagaluru with our premium bikes and exceptional service</Text>
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

        {/* CTA Banner */}
        <View style={styles.ctaBanner}>
          <Text style={styles.ctaTitle}>Ready for Your Next Adventure?</Text>
          <Text style={styles.ctaSub}>Book your perfect bike today and explore the beautiful landscapes of Chikkamagaluru</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleSearch}>
            <Text style={styles.ctaBtnText}>Book a Bike Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaCallBtn}>
            <Ionicons name="call-outline" size={16} color="#f47b20" />
            <Text style={styles.ctaCallText}>Call +91 90080-22800</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  hero: {
    backgroundColor: '#1a1a2e',
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#f47b20',
    alignItems: 'center', justifyContent: 'center',
  },
  logoBoxText: { color: '#fff', fontWeight: '800', fontSize: 18 },
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
  searchCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: -1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
  searchFieldText: { fontSize: 13, color: '#1a1a1a', flex: 1 },
  searchBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  section: { paddingTop: 24, paddingBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  sectionSub: { fontSize: 12, color: '#999999', marginTop: 2 },
  hList: { paddingLeft: 16, paddingRight: 8 },
  loader: { marginVertical: 20 },
  emptyText: { color: '#999', fontSize: 14, paddingHorizontal: 16 },
  swipeHint: { alignItems: 'center', marginTop: 8 },
  swipeText: { fontSize: 12, color: '#999' },
  whySection: {
    backgroundColor: '#ffffff',
    padding: 20,
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
  ctaBanner: {
    backgroundColor: '#1a1a2e', padding: 28,
    alignItems: 'center', gap: 12,
    marginTop: 8,
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
