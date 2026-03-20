import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../stores/authStore';
import { useHostelCartMutations } from '../../hooks/useHostelCartMutations';
import api from '../../lib/api';
import type { Hostel, MealOption } from '../../types/hostel.types';
import queryClient from '../../lib/queryClient';

const { width } = Dimensions.get('window');
type Nav = StackNavigationProp<MainStackParamList, 'HostelDetail'>;
type Route = RouteProp<MainStackParamList, 'HostelDetail'>;

const MEAL_LABELS: Record<string, string> = {
  bedOnly: 'Bed Only',
  bedAndBreakfast: 'Bed & Breakfast',
  bedBreakfastAndDinner: 'Bed + Breakfast + Dinner',
};

const TABS = ['Amenities', 'Guidelines', 'Policies'];

export default function HostelDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { hostelId, checkIn, checkOut, people, stayType } = route.params;
  const { token } = useAuthStore();
  const { addToCartMutation } = useHostelCartMutations();

  const [activeTab, setActiveTab] = useState('Amenities');
  const [selectedRooms, setSelectedRooms] = useState<
    Record<string, { quantity: number; mealOption: MealOption }>
  >({});

  const { data: hostel, isLoading, isError, refetch } = useQuery({
    queryKey: ['hostel', hostelId, checkIn, checkOut, stayType],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel }>(`/hostels/${hostelId}`, {
        params: { checkIn, checkOut, people, stayType },
      });
      return res.data.data;
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (isError || !hostel) return <ErrorState onRetry={refetch} />;

  const nights = checkIn && checkOut
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 1;

  const getTotalSelectedRooms = () =>
    Object.values(selectedRooms).reduce((s, r) => s + r.quantity, 0);

  const calculateSummary = () => {
    let basePrice = 0;
    Object.entries(selectedRooms).forEach(([roomId, sel]) => {
      const room = hostel.rooms?.find((r) => r._id === roomId);
      if (room?.calculatedPricing) {
        const pricing = room.calculatedPricing[sel.mealOption as MealOption];
        if (pricing) basePrice += pricing.totalPrice * sel.quantity;
      }
    });
    const taxes = basePrice * 0.05;
    return { basePrice, taxes, total: basePrice + taxes };
  };

  const handleRoomQtyChange = (roomId: string, mealOption: MealOption, qty: number) => {
    setSelectedRooms((prev) => {
      if (qty === 0) {
        const next = { ...prev };
        delete next[roomId];
        return next;
      }
      return { ...prev, [roomId]: { quantity: qty, mealOption } };
    });
  };

  const handleProceedToBook = async () => {
    if (getTotalSelectedRooms() === 0) return;
    if (!token) {
      navigation.navigate('AuthStack' as never);
      return;
    }
    // Add all selected rooms to cart
    try {
      for (const [roomId, sel] of Object.entries(selectedRooms)) {
        const room = hostel.rooms?.find((r) => r._id === roomId);
        if (!room) continue;
        await addToCartMutation.mutateAsync({
          hostelId,
          roomType: room.type,
          mealOption: sel.mealOption,
          quantity: sel.quantity,
          checkIn: checkIn ?? '',
          checkOut: checkOut ?? '',
          isWorkstation: stayType === 'workstation',
        });
      }
      navigation.navigate('HostelBooking', {
        hostelId,
        checkIn: checkIn ?? '',
        checkOut: checkOut ?? '',
        stayType: stayType ?? 'hostel',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to add rooms to cart' });
    }
  };

  const summary = calculateSummary();
  const totalSelected = getTotalSelectedRooms();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title={hostel.name} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
        >
          {(hostel.images?.length ? hostel.images : ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400']).map((item, i) => (
            <Image key={i} source={{ uri: item }} style={styles.galleryImage} resizeMode="cover" />
          ))}
        </ScrollView>

        <View style={styles.content}>
          <Text style={styles.name}>{hostel.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={styles.location}>{hostel.location}</Text>
          </View>
          {hostel.address && <Text style={styles.address}>{hostel.address}</Text>}

          {/* Booking details summary */}
          {checkIn && checkOut && (
            <View style={styles.bookingBanner}>
              <View style={styles.bookingBannerItem}>
                <Text style={styles.bookingBannerLabel}>Check-in</Text>
                <Text style={styles.bookingBannerValue}>{checkIn} · {hostel.checkInTime ?? '1:00 PM'}</Text>
              </View>
              <View style={styles.bookingBannerItem}>
                <Text style={styles.bookingBannerLabel}>Check-out</Text>
                <Text style={styles.bookingBannerValue}>{checkOut} · {hostel.checkOutTime ?? '10:00 AM'}</Text>
              </View>
              <View style={styles.bookingBannerItem}>
                <Text style={styles.bookingBannerLabel}>Nights</Text>
                <Text style={styles.bookingBannerValue}>{nights}</Text>
              </View>
            </View>
          )}

          {/* Room types & Pricing (uses rooms[] + calculatedPricing) */}
          {hostel.rooms && hostel.rooms.length > 0 ? (
            <View style={styles.roomsSection}>
              <Text style={styles.sectionTitle}>Room types & Pricing</Text>
              {hostel.rooms.map((room) => {
                const sel = room._id ? selectedRooms[room._id] : undefined;
                const remainingBeds = room.availableBeds - (sel?.quantity ?? 0);
                return (
                  <View key={room._id ?? room.type} style={styles.roomCard}>
                    {room.images?.[0] && (
                      <Image source={{ uri: room.images[0] }} style={styles.roomImage} resizeMode="cover" />
                    )}
                    <View style={styles.roomCardBody}>
                      <View style={styles.roomHeaderRow}>
                        <Text style={styles.roomType}>{room.type}</Text>
                        <View style={[
                          styles.bedsBadge,
                          remainingBeds === 0 ? styles.bedsBadgeRed
                            : remainingBeds <= 2 ? styles.bedsBadgeOrange
                            : styles.bedsBadgeGreen,
                        ]}>
                          <Text style={[
                            styles.bedsBadgeText,
                            remainingBeds === 0 ? styles.bedsBadgeTextRed
                              : remainingBeds <= 2 ? styles.bedsBadgeTextOrange
                              : styles.bedsBadgeTextGreen,
                          ]}>
                            {remainingBeds} of {room.availableBeds} beds left
                          </Text>
                        </View>
                      </View>

                      {room.description && (
                        <Text style={styles.roomDesc}>{room.description}</Text>
                      )}

                      {/* Amenity badges */}
                      {room.amenities && room.amenities.length > 0 && (
                        <View style={styles.roomAmenities}>
                          {room.amenities.slice(0, 4).map((a, i) => (
                            <View key={i} style={styles.roomAmenityBadge}>
                              <Text style={styles.roomAmenityText}>{a}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Price options with calculatedPricing */}
                      {room.calculatedPricing && (
                        <View style={styles.priceOptions}>
                          {(Object.entries(room.calculatedPricing) as [MealOption, any][]).map(([option, pricing]) => {
                            if (!pricing) return null;
                            const isSelected = sel?.mealOption === option;
                            const qty = isSelected ? (sel?.quantity ?? 0) : 0;
                            return (
                              <View
                                key={option}
                                style={[styles.priceOption, isSelected && styles.priceOptionSelected]}
                              >
                                <View style={styles.priceOptionLeft}>
                                  <Text style={styles.priceOptionLabel}>{MEAL_LABELS[option]}</Text>
                                  <View style={styles.priceRow}>
                                    <Text style={styles.priceValue}>₹{pricing.pricePerNight?.toFixed(2)}</Text>
                                    <Text style={styles.priceUnit}>/night</Text>
                                  </View>
                                  <Text style={styles.totalForNights}>
                                    Total: ₹{pricing.totalPrice?.toFixed(2)} for {nights} night(s)
                                  </Text>
                                  {pricing.savings > 0 && (
                                    <View style={styles.savingsBadge}>
                                      <Text style={styles.savingsText}>Save ₹{pricing.savings?.toFixed(2)}</Text>
                                    </View>
                                  )}
                                </View>
                                {room._id && (
                                  <View style={styles.qtyRow}>
                                    <TouchableOpacity
                                      style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                                      onPress={() => handleRoomQtyChange(room._id!, option, Math.max(0, qty - 1))}
                                      disabled={qty === 0}
                                    >
                                      <Ionicons name="remove" size={16} color={qty === 0 ? '#ccc' : '#1a1a1a'} />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyValue}>{qty}</Text>
                                    <TouchableOpacity
                                      style={[styles.qtyBtn, styles.qtyBtnAdd]}
                                      onPress={() => handleRoomQtyChange(room._id!, option, qty + 1)}
                                      disabled={qty >= (room.availableRooms ?? room.availableBeds ?? 0)}
                                    >
                                      <Ionicons name="add" size={16} color="#fff" />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            // Fallback: old pricing[] approach for older API responses
            hostel.pricing && hostel.pricing.length > 0 && (
              <View style={styles.roomsSection}>
                <Text style={styles.sectionTitle}>Pricing</Text>
                {hostel.pricing.map((p, i) => (
                  <View key={i} style={styles.legacyPriceRow}>
                    <Text style={styles.legacyPriceLabel}>{p.roomType} · {MEAL_LABELS[p.mealOption] ?? p.mealOption}</Text>
                    <Text style={styles.legacyPriceValue}>₹{p.pricePerNight}/night</Text>
                  </View>
                ))}
              </View>
            )
          )}

          {/* Tabs: Amenities | Guidelines | Policies */}
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Amenities' && (
            <View style={styles.amenitiesGrid}>
              {hostel.amenities?.map((a, i) => (
                <View key={i} style={styles.amenityItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#f47b20" />
                  <View>
                    <Text style={styles.amenityName}>{a.name}</Text>
                    {a.description && <Text style={styles.amenityDesc}>{a.description}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'Guidelines' && (
            <View style={styles.tabContent}>
              <View style={styles.checkInOutRow}>
                <Text style={styles.guidelineItem}>
                  <Text style={{ fontWeight: '700' }}>Check-in:</Text> {hostel.checkInTime ?? '1:00 PM'}
                </Text>
                <Text style={styles.guidelineItem}>
                  <Text style={{ fontWeight: '700' }}>Check-out:</Text> {hostel.checkOutTime ?? '10:00 AM'}
                </Text>
              </View>
              {hostel.policies?.checkIn?.map((p, i) => (
                <View key={i} style={styles.policyRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <Text style={styles.policyText}>{p}</Text>
                </View>
              ))}
              {hostel.policies?.house?.map((p, i) => (
                <View key={i} style={styles.policyRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />
                  <Text style={styles.policyText}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          {activeTab === 'Policies' && (
            <View style={styles.tabContent}>
              {hostel.policies?.cancellation?.map((p, i) => (
                <View key={i} style={styles.policyRow}>
                  <Ionicons name="close-circle" size={14} color="#ef4444" />
                  <Text style={styles.policyText}>{p}</Text>
                </View>
              ))}
              <View style={styles.nonRefundBanner}>
                <Text style={styles.nonRefundText}>⚠️ This will be a fully non-refundable booking</Text>
              </View>
            </View>
          )}

          {hostel.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{hostel.description}</Text>
            </>
          )}

          {/* Contact info */}
          {hostel.contactInfo && (
            <View style={styles.contactSection}>
              <Text style={styles.sectionTitle}>Getting Here</Text>
              {hostel.address && <Text style={styles.address}>{hostel.address}</Text>}
              {hostel.contactInfo.phone && (
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={15} color="#f47b20" />
                  <Text style={styles.contactText}>{hostel.contactInfo.phone}</Text>
                </View>
              )}
              {hostel.contactInfo.email && (
                <View style={styles.contactRow}>
                  <Ionicons name="mail-outline" size={15} color="#f47b20" />
                  <Text style={styles.contactText}>{hostel.contactInfo.email}</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          {totalSelected > 0 ? (
            <>
              <Text style={styles.totalLabel}>{totalSelected} room(s) selected</Text>
              <Text style={styles.totalPrice}>₹{summary.total.toFixed(2)}</Text>
              <Text style={styles.totalNote}>incl. 5% GST</Text>
            </>
          ) : (
            <Text style={styles.noSelectionText}>Select a room type above</Text>
          )}
        </View>
        <Button
          title={token ? 'Proceed to Book' : 'Login to Book'}
          onPress={handleProceedToBook}
          loading={addToCartMutation.isPending}
          disabled={totalSelected === 0 && !!token}
          style={styles.ctaBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  gallery: { height: 250 },
  galleryImage: { width, height: 250, backgroundColor: '#f0f0f0' },
  content: { padding: 20 },
  name: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  location: { fontSize: 14, color: '#666' },
  address: { fontSize: 13, color: '#999', marginBottom: 12 },

  // Booking banner
  bookingBanner: {
    flexDirection: 'row', backgroundColor: '#eff6ff',
    borderRadius: 12, padding: 12, marginTop: 12, marginBottom: 4,
    borderWidth: 1, borderColor: '#bfdbfe', gap: 12,
  },
  bookingBannerItem: { flex: 1 },
  bookingBannerLabel: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  bookingBannerValue: { fontSize: 12, fontWeight: '600', color: '#1e40af' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginTop: 20, marginBottom: 12 },

  // Rooms section
  roomsSection: { marginBottom: 8 },
  roomCard: {
    borderWidth: 2, borderColor: '#e5e5e5', borderRadius: 12, marginBottom: 14, overflow: 'hidden',
  },
  roomImage: { width: '100%', height: 160 },
  roomCardBody: { padding: 14 },
  roomHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  roomType: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 },
  bedsBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  bedsBadgeGreen: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  bedsBadgeOrange: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  bedsBadgeRed: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  bedsBadgeText: { fontSize: 10, fontWeight: '600' },
  bedsBadgeTextGreen: { color: '#166534' },
  bedsBadgeTextOrange: { color: '#9a3412' },
  bedsBadgeTextRed: { color: '#991b1b' },
  roomDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  roomAmenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  roomAmenityBadge: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  roomAmenityText: { fontSize: 11, color: '#555' },

  // Price options
  priceOptions: { gap: 8 },
  priceOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, padding: 12,
  },
  priceOptionSelected: { borderColor: '#f47b20', backgroundColor: '#fff8f3' },
  priceOptionLeft: { flex: 1, marginRight: 10 },
  priceOptionLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  priceValue: { fontSize: 20, fontWeight: '800', color: '#f47b20' },
  priceUnit: { fontSize: 12, color: '#888' },
  totalForNights: { fontSize: 12, color: '#666', marginTop: 2 },
  savingsBadge: { backgroundColor: '#dcfce7', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  savingsText: { fontSize: 11, color: '#166534', fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 32, height: 32, borderRadius: 6,
    borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyBtnAdd: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  qtyValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', minWidth: 20, textAlign: 'center' },

  // Legacy pricing
  legacyPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  legacyPriceLabel: { fontSize: 13, color: '#555' },
  legacyPriceValue: { fontSize: 14, fontWeight: '600', color: '#f47b20' },

  // Tabs
  tabRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#f9f9f9' },
  tabActive: { backgroundColor: '#f47b20' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#fff' },
  tabContent: { gap: 8 },

  // Amenities grid
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  amenityItem: { width: '47%', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  amenityName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  amenityDesc: { fontSize: 11, color: '#888', marginTop: 1 },

  // Guidelines / Policies
  checkInOutRow: { gap: 4, marginBottom: 8 },
  guidelineItem: { fontSize: 13, color: '#555', lineHeight: 20 },
  policyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  policyText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 19 },
  nonRefundBanner: {
    backgroundColor: '#fef2f2', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#fecaca', marginTop: 8,
  },
  nonRefundText: { fontSize: 12, color: '#991b1b', fontWeight: '500' },

  // Description
  description: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 8 },

  // Contact
  contactSection: { marginBottom: 8 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  contactText: { fontSize: 14, color: '#f47b20' },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#e5e5e5',
    backgroundColor: '#ffffff',
  },
  totalLabel: { fontSize: 12, color: '#888' },
  totalPrice: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  totalNote: { fontSize: 10, color: '#aaa' },
  noSelectionText: { fontSize: 13, color: '#999' },
  ctaBtn: { minWidth: 160 },
});
