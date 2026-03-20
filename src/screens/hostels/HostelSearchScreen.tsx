import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import type { MainStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useHostelCartMutations } from '../../hooks/useHostelCartMutations';
import api from '../../lib/api';
import type { Hostel, HostelRoom, MealOption } from '../../types/hostel.types';
import type { Cart, CartHostelItem } from '../../types/cart.types';

type Nav = StackNavigationProp<MainStackParamList, 'HostelSearch'>;
type Route = RouteProp<MainStackParamList, 'HostelSearch'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Fallback gallery used when API hasn't loaded yet
const STATIC_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800' },
  { url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800' },
  { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800' },
];

interface HostelOverview {
  title: string;
  description: string;
  images: string[];
}

const MEAL_OPTIONS: { value: MealOption; label: string; icon: string }[] = [
  { value: 'bedOnly', label: 'Bed Only', icon: 'bed-outline' },
  { value: 'bedAndBreakfast', label: 'Bed & Breakfast', icon: 'cafe-outline' },
  { value: 'bedBreakfastAndDinner', label: 'Bed + Breakfast + Dinner', icon: 'restaurant-outline' },
];

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function HostelSearchScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { checkIn, checkOut, location, stayType } = route.params;
  const { token } = useAuthStore();
  const { addToCartMutation, updateQuantityMutation, removeMutation } = useHostelCartMutations();

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [roomImageIndices, setRoomImageIndices] = useState<Record<string, number>>({});

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Fetch available hostels
  const { data: hostels = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['hostels', 'available', checkIn, checkOut, stayType],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels/available', {
        params: { checkIn, checkOut, people: 1, location, stayType },
      });
      return res.data.data ?? [];
    },
    enabled: !!(checkIn && checkOut),
  });

  // Fetch cart
  const { data: cart, refetch: refetchCart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      if (!token) return null;
      const res = await api.get<{ success: boolean; data: Cart }>('/cart/details');
      return res.data.data;
    },
    enabled: !!token,
  });

  // Fetch hostel overview (gallery images + location description)
  const { data: overview } = useQuery<HostelOverview>({
    queryKey: ['hostel-overview'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: HostelOverview }>('/hostel-overview');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 30,
  });

  const galleryImages: string[] = overview?.images?.length
    ? overview.images
    : STATIC_IMAGES.map((i) => i.url);
    console.log( "galleryImages", overview);

  const hostelItems: CartHostelItem[] = cart?.hostelItems ?? [];

  // Get quantity for a specific hostel+roomType+mealOption combo in cart
  const getQty = useCallback((hostelId: string, roomType: string, mealOption: MealOption): number => {
    const item = hostelItems.find(
      (i) => {
        const hId = typeof i.hostel === 'object' ? (i.hostel as any)._id : i.hostel;
        return hId === hostelId && i.roomType === roomType && i.mealOption === mealOption;
      }
    );
    return item?.quantity ?? 0;
  }, [hostelItems]);

  // Get cart item id for a specific combo
  const getCartItemId = useCallback((hostelId: string, roomType: string, mealOption: MealOption): string | null => {
    const item = hostelItems.find(
      (i) => {
        const hId = typeof i.hostel === 'object' ? (i.hostel as any)._id : i.hostel;
        return hId === hostelId && i.roomType === roomType && i.mealOption === mealOption;
      }
    );
    return item?._id ?? null;
  }, [hostelItems]);

  // Total qty for a room across all meal options (to check against availableBeds)
  const getTotalRoomQty = useCallback((hostelId: string, roomType: string): number => {
    return hostelItems
      .filter((i) => {
        const hId = typeof i.hostel === 'object' ? (i.hostel as any)._id : i.hostel;
        return hId === hostelId && i.roomType === roomType;
      })
      .reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  }, [hostelItems]);

  // Remaining beds available for a specific meal option
  const getRemainingBeds = (hostelId: string, roomType: string, mealOption: MealOption, totalAvailable: number): number => {
    const totalInCart = getTotalRoomQty(hostelId, roomType);
    const currentQty = getQty(hostelId, roomType, mealOption);
    return totalAvailable - (totalInCart - currentQty);
  };

  const handleAdd = async (hostel: Hostel, room: HostelRoom, mealOption: MealOption) => {
    if (!token) {
      Toast.show({ type: 'info', text1: 'Login required', text2: 'Please login to add to cart' });
      navigation.navigate('AuthStack' as never);
      return;
    }
    const totalInCart = getTotalRoomQty(hostel._id, room.type);
    if (totalInCart >= room.availableBeds) {
      Toast.show({
        type: 'warning',
        text1: 'Limit reached',
        text2: `Only ${room.availableBeds} bed(s) available`,
      });
      return;
    }
    await addToCartMutation.mutateAsync({
      hostelId: hostel._id,
      roomType: room.type,
      mealOption,
      quantity: 1,
      checkIn,
      checkOut,
      isWorkstation: stayType === 'workstation',
    });
  };

  const handleDecrement = async (hostelId: string, roomType: string, mealOption: MealOption) => {
    const itemId = getCartItemId(hostelId, roomType, mealOption);
    if (!itemId) return;
    const currentQty = getQty(hostelId, roomType, mealOption);
    if (currentQty <= 1) {
      await removeMutation.mutateAsync({ itemId });
    } else {
      await updateQuantityMutation.mutateAsync({ itemId, quantity: currentQty - 1 });
    }
  };

  // Cart summary
  const cartSubtotal = hostelItems.reduce((sum, i) => sum + (i.totalPrice ?? 0), 0);
  const cartGst = cartSubtotal * 0.05;
  const cartTotal = cartSubtotal + cartGst;

  const handleProceedToBook = () => {
    if (hostelItems.length === 0) {
      Toast.show({ type: 'warning', text1: 'Empty cart', text2: 'Please add rooms to proceed' });
      return;
    }
    const firstItem = hostelItems[0];
    const hostelId = typeof firstItem.hostel === 'object'
      ? (firstItem.hostel as any)._id
      : firstItem.hostel;
    navigation.navigate('HostelBooking', { hostelId, checkIn, checkOut, stayType });
  };

  const getRoomImageKey = (hostelId: string, roomIdx: number) => `${hostelId}-${roomIdx}`;

  const nextRoomImage = (hostelId: string, roomIdx: number, totalImages: number) => {
    const key = getRoomImageKey(hostelId, roomIdx);
    const cur = roomImageIndices[key] ?? 0;
    setRoomImageIndices((prev) => ({ ...prev, [key]: cur === totalImages - 1 ? 0 : cur + 1 }));
  };

  const prevRoomImage = (hostelId: string, roomIdx: number, totalImages: number) => {
    const key = getRoomImageKey(hostelId, roomIdx);
    const cur = roomImageIndices[key] ?? 0;
    setRoomImageIndices((prev) => ({ ...prev, [key]: cur === 0 ? totalImages - 1 : cur - 1 }));
  };

  const isMutating = addToCartMutation.isPending || updateQuantityMutation.isPending || removeMutation.isPending;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#f47b20" />
        <Text style={styles.loadingText}>Searching for available hostels...</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={56} color="#ef4444" />
        <Text style={styles.errorTitle}>Error Loading Hostels</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{location}</Text>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Search criteria bar */}
        <View style={styles.criteriaBar}>
          <View style={styles.criteriaItem}>
            <Ionicons name="location-outline" size={13} color="#f47b20" />
            <Text style={styles.criteriaText}>{location}</Text>
          </View>
          <View style={styles.criteriaDivider} />
          <View style={styles.criteriaItem}>
            <Ionicons name="calendar-outline" size={13} color="#f47b20" />
            <Text style={styles.criteriaText}>{formatDate(checkIn)} – {formatDate(checkOut)}</Text>
          </View>
          <View style={styles.criteriaDivider} />
          <View style={styles.criteriaBadge}>
            <Text style={styles.criteriaBadgeText}>{nights} Night{nights !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.modifySearch}>Modify</Text>
          </TouchableOpacity>
        </View>

        {/* Static highlight gallery */}
        <View style={styles.galleryContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setGalleryIndex(idx);
            }}
            scrollEventThrottle={16}
          >
            {galleryImages.map((uri, i) => (
              <View key={i} style={styles.gallerySlide}>
                <Image source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
                <View style={styles.galleryOverlay} />
              </View>
            ))}
          </ScrollView>
          {/* Dots */}
          <View style={styles.galleryDots}>
            {galleryImages.map((_, i) => (
              <View key={i} style={[styles.dot, i === galleryIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Location title & description */}
        <View style={styles.locationSection}>
          <Text style={styles.locationTitle}>{overview?.title ?? location}</Text>
          <Text style={styles.locationDesc}>
            {overview?.description ?? 'The perfect place to unwind and explore the scenic beauty and serene atmosphere of Chikkamagaluru.'}
          </Text>
        </View>

        {/* Results title */}
        <View style={styles.resultsTitleSection}>
          <Text style={styles.resultsTitle}>Room types & Pricing</Text>
          <Text style={styles.resultsSubtitle}>Choose from our available room options below</Text>
        </View>

        {/* Rooms list */}
        {hostels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bed-outline" size={56} color="#ccc" />
            <Text style={styles.emptyTitle}>No Hostels Available</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search dates or location</Text>
            <TouchableOpacity style={styles.newSearchBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.newSearchBtnText}>New Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.roomsList}>
            {hostels.flatMap((hostel, _hIdx) =>
              (hostel.rooms ?? []).map((room, roomIdx) => {
                const roomKey = getRoomImageKey(hostel._id, roomIdx);
                const roomImages = (room.images?.length ?? 0) > 0 ? room.images! : hostel.images ?? [];
                const currentImgIdx = roomImageIndices[roomKey] ?? 0;
                const hasMultipleImages = roomImages.length > 1;
                const totalInCart = getTotalRoomQty(hostel._id, room.type);
                const remainingBeds = room.availableBeds - totalInCart;

                return (
                  <View key={`${hostel._id}-${roomIdx}`} style={styles.roomCard}>
                    {/* Room image carousel */}
                    <View style={styles.roomImageContainer}>
                      <Image
                        source={{ uri: roomImages[currentImgIdx] ?? 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400' }}
                        style={styles.roomImage}
                        resizeMode="cover"
                      />
                      {hasMultipleImages && (
                        <>
                          <TouchableOpacity
                            style={[styles.imageNavBtn, { left: 8 }]}
                            onPress={() => prevRoomImage(hostel._id, roomIdx, roomImages.length)}
                          >
                            <Ionicons name="chevron-back" size={18} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.imageNavBtn, { right: 8 }]}
                            onPress={() => nextRoomImage(hostel._id, roomIdx, roomImages.length)}
                          >
                            <Ionicons name="chevron-forward" size={18} color="#fff" />
                          </TouchableOpacity>
                          <View style={styles.imageCounter}>
                            <Text style={styles.imageCounterText}>{currentImgIdx + 1}/{roomImages.length}</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Room details */}
                    <View style={styles.roomDetails}>
                      {/* Room header: name + beds badge */}
                      <View style={styles.roomHeaderRow}>
                        <Text style={styles.roomTypeName}>{room.type}</Text>
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

                      {/* Amenities chips */}
                      {(room.amenities?.length ?? 0) > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.amenitiesScroll}>
                          <View style={styles.amenitiesRow}>
                            {room.amenities!.slice(0, 6).map((a, i) => (
                              <View key={i} style={styles.amenityChip}>
                                <Text style={styles.amenityChipText}>{a}</Text>
                              </View>
                            ))}
                            {room.amenities!.length > 6 && (
                              <View style={styles.amenityChipMore}>
                                <Text style={styles.amenityChipMoreText}>+{room.amenities!.length - 6} more</Text>
                              </View>
                            )}
                          </View>
                        </ScrollView>
                      )}

                      <View style={styles.divider} />

                      {/* Meal options */}
                      <View style={styles.mealOptions}>
                        {/* Bed Only */}
                        {room.calculatedPricing?.bedOnly && (() => {
                          const p = room.calculatedPricing.bedOnly;
                          const qty = getQty(hostel._id, room.type, 'bedOnly');
                          const maxAvail = getRemainingBeds(hostel._id, room.type, 'bedOnly', room.availableBeds);
                          return (
                            <View style={styles.mealRow}>
                              <View style={styles.mealInfo}>
                                <View style={styles.mealLabelRow}>
                                  <Ionicons name="bed-outline" size={14} color="#666" />
                                  <Text style={styles.mealLabel}>Bed Only</Text>
                                </View>
                                <View style={styles.priceRow}>
                                  {p.discountApplied && p.originalPrice && (
                                    <Text style={styles.originalPrice}>₹{p.originalPrice.toFixed(0)}</Text>
                                  )}
                                  <Text style={styles.price}>₹{p.totalPrice.toFixed(0)}</Text>
                                  <Text style={styles.priceUnit}>/night</Text>
                                </View>
                              </View>
                              <QuantityControl
                                qty={qty} maxAvail={maxAvail} disabled={isMutating}
                                onAdd={() => handleAdd(hostel, room, 'bedOnly')}
                                onRemove={() => handleDecrement(hostel._id, room.type, 'bedOnly')}
                              />
                            </View>
                          );
                        })()}

                        {/* Bed & Breakfast — recommended */}
                        {room.calculatedPricing?.bedAndBreakfast && (() => {
                          const p = room.calculatedPricing.bedAndBreakfast;
                          const qty = getQty(hostel._id, room.type, 'bedAndBreakfast');
                          const maxAvail = getRemainingBeds(hostel._id, room.type, 'bedAndBreakfast', room.availableBeds);
                          return (
                            <View style={[styles.mealRow, styles.mealRowRecommended]}>
                              <View style={styles.recommendedBadge}>
                                <Text style={styles.recommendedBadgeText}>Recommended</Text>
                              </View>
                              <View style={styles.mealInfo}>
                                <View style={styles.mealLabelRow}>
                                  <Ionicons name="cafe-outline" size={14} color="#f47b20" />
                                  <Text style={[styles.mealLabel, { color: '#f47b20' }]}>Bed & Breakfast</Text>
                                </View>
                                <View style={styles.priceRow}>
                                  {p.discountApplied && p.originalPrice && (
                                    <Text style={styles.originalPrice}>₹{p.originalPrice.toFixed(0)}</Text>
                                  )}
                                  <Text style={styles.price}>₹{p.totalPrice.toFixed(0)}</Text>
                                  <Text style={styles.priceUnit}>/night</Text>
                                </View>
                              </View>
                              <QuantityControl
                                qty={qty} maxAvail={maxAvail} disabled={isMutating}
                                onAdd={() => handleAdd(hostel, room, 'bedAndBreakfast')}
                                onRemove={() => handleDecrement(hostel._id, room.type, 'bedAndBreakfast')}
                              />
                            </View>
                          );
                        })()}

                        {/* Bed + Breakfast + Dinner */}
                        {room.calculatedPricing?.bedBreakfastAndDinner && (() => {
                          const p = room.calculatedPricing.bedBreakfastAndDinner;
                          const qty = getQty(hostel._id, room.type, 'bedBreakfastAndDinner');
                          const maxAvail = getRemainingBeds(hostel._id, room.type, 'bedBreakfastAndDinner', room.availableBeds);
                          return (
                            <View style={styles.mealRow}>
                              <View style={styles.mealInfo}>
                                <View style={styles.mealLabelRow}>
                                  <Ionicons name="restaurant-outline" size={14} color="#666" />
                                  <Text style={styles.mealLabel}>Bed + Breakfast + Dinner</Text>
                                </View>
                                <View style={styles.priceRow}>
                                  {p.discountApplied && p.originalPrice && (
                                    <Text style={styles.originalPrice}>₹{p.originalPrice.toFixed(0)}</Text>
                                  )}
                                  <Text style={styles.price}>₹{p.totalPrice.toFixed(0)}</Text>
                                  <Text style={styles.priceUnit}>/night</Text>
                                </View>
                              </View>
                              <QuantityControl
                                qty={qty} maxAvail={maxAvail} disabled={isMutating}
                                onAdd={() => handleAdd(hostel, room, 'bedBreakfastAndDinner')}
                                onRemove={() => handleDecrement(hostel._id, room.type, 'bedBreakfastAndDinner')}
                              />
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* Amenities section — from first hostel */}
            {hostels[0]?.amenities && hostels[0].amenities.length > 0 && (
              <View style={styles.infoCard}>
                <Text style={styles.infoCardTitle}>Amenities you'll get</Text>
                <View style={styles.amenitiesGrid}>
                  {hostels[0].amenities.map((a, i) => (
                    <View key={i} style={styles.amenityGridItem}>
                      <Ionicons name="checkmark-circle" size={14} color="#f47b20" />
                      <Text style={styles.amenityGridText}>{a.name ?? String(a)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Guidelines */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>Guidelines</Text>
              {/* Check-in / Check-out times */}
              <View style={styles.timesRow}>
                <View style={styles.timeBox}>
                  <Ionicons name="enter-outline" size={22} color="#555" />
                  <View>
                    <Text style={styles.timeLabel}>Check in:</Text>
                    <Text style={styles.timeValue}>1:00 PM</Text>
                  </View>
                </View>
                <View style={styles.timeBox}>
                  <Ionicons name="exit-outline" size={22} color="#555" />
                  <View>
                    <Text style={styles.timeLabel}>Check out:</Text>
                    <Text style={styles.timeValue}>10:00 AM</Text>
                  </View>
                </View>
              </View>
              {/* Policy list */}
              {[
                'All guests must carry a Govt. photo ID (PAN card not accepted).',
                'Local IDs are not accepted.',
                'Non-resident visitors are not allowed beyond the reception/common areas.',
                'Cancellations/Modifications: Free up to 5 days (120 hours) before check-in.',
                'All bookings between 20 Dec and 3 Jan are Non-Refundable.',
                'No-shows are charged 100% of the reservation.',
                'No refunds for early departures.',
              ].map((rule, i) => (
                <View key={i} style={styles.policyRow}>
                  <View style={styles.policyDot} />
                  <Text style={styles.policyText}>{rule}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding for sticky bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {hostelItems.length === 0 ? (
          <View style={styles.emptyCartBar}>
            <Ionicons name="cart-outline" size={18} color="#888" />
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
          </View>
        ) : (
          <View style={styles.bottomBarContent}>
            <View>
              <Text style={styles.totalLabel}>Total price</Text>
              <Text style={styles.totalAmount}>₹{cartTotal.toFixed(2)}</Text>
              <Text style={styles.totalInclTax}>incl. taxes</Text>
            </View>
            <TouchableOpacity
              style={styles.proceedBtn}
              onPress={handleProceedToBook}
              activeOpacity={0.85}
            >
              <Text style={styles.proceedBtnText}>Proceed to Book</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// ── Quantity Control ─────────────────────────────────────────────────────────
function QuantityControl({
  qty, onAdd, onRemove, maxAvail, disabled,
}: {
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
  maxAvail: number;
  disabled: boolean;
}) {
  if (qty === 0) {
    return (
      <TouchableOpacity
        style={[styles.addBtn, (disabled || maxAvail === 0) && styles.addBtnDisabled]}
        onPress={onAdd}
        disabled={disabled || maxAvail === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.addBtnText}>Add</Text>
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.qtyControl}>
      <TouchableOpacity style={styles.qtyBtn} onPress={onRemove} disabled={disabled} activeOpacity={0.8}>
        <Ionicons name="remove" size={16} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.qtyValue}>{qty}</Text>
      <TouchableOpacity
        style={styles.qtyBtn}
        onPress={onAdd}
        disabled={disabled || qty >= maxAvail}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },

  // Loading/Error
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 24, backgroundColor: '#f5f5f5',
  },
  loadingText: { fontSize: 14, color: '#666', marginTop: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  retryBtn: {
    backgroundColor: '#f47b20', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },

  // Criteria bar
  criteriaBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  criteriaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  criteriaText: { fontSize: 12, color: '#555', fontWeight: '500' },
  criteriaDivider: { width: 1, height: 14, backgroundColor: '#e0e0e0' },
  criteriaBadge: { backgroundColor: '#e8f4fd', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  criteriaBadgeText: { fontSize: 11, color: '#1d6fa4', fontWeight: '600' },
  modifySearch: { fontSize: 12, color: '#f47b20', fontWeight: '600', marginLeft: 4 },

  // Gallery
  galleryContainer: { position: 'relative' },
  gallerySlide: { width: SCREEN_WIDTH, height: 240, position: 'relative' },
  galleryImage: { width: '100%', height: '100%' },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  galleryCaption: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16,
  },
  galleryCaptionSub: { fontSize: 11, color: '#f47b20', fontWeight: '600', marginBottom: 2 },
  galleryCaptionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  galleryDots: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 14 },

  // Location section
  locationSection: { padding: 16, backgroundColor: '#fff', marginTop: 10 },
  locationTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  locationDesc: { fontSize: 14, color: '#555', lineHeight: 22 },

  // Results title
  resultsTitleSection: { padding: 16, paddingBottom: 8, backgroundColor: '#f5f5f5', marginTop: 10 },
  resultsTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  resultsSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },

  // Rooms
  roomsList: { paddingHorizontal: 12, paddingTop: 8 },
  roomCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#f0f0f0',
  },

  // Room image carousel
  roomImageContainer: { position: 'relative', height: 200 },
  roomImage: { width: '100%', height: '100%' },
  imageNavBtn: {
    position: 'absolute', top: '50%', marginTop: -17,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 18,
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
  },
  imageCounter: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  imageCounterText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Room details
  roomDetails: { padding: 14 },
  roomHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  roomTypeName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 },

  // Beds badge
  bedsBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  bedsBadgeGreen: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
  bedsBadgeOrange: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  bedsBadgeRed: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  bedsBadgeText: { fontSize: 11, fontWeight: '600' },
  bedsBadgeTextGreen: { color: '#166534' },
  bedsBadgeTextOrange: { color: '#9a3412' },
  bedsBadgeTextRed: { color: '#991b1b' },

  // Amenity chips
  amenitiesScroll: { marginBottom: 8 },
  amenitiesRow: { flexDirection: 'row', gap: 6, paddingRight: 4 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f5f5f5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  amenityChipText: { fontSize: 11, color: '#555', fontWeight: '500' },
  amenityChipMore: { paddingHorizontal: 10, paddingVertical: 5, justifyContent: 'center' },
  amenityChipMoreText: { fontSize: 11, color: '#f47b20', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 },

  // Meal options
  mealOptions: { gap: 8 },
  mealRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 10, padding: 10,
    backgroundColor: '#fff',
  },
  mealRowRecommended: {
    borderColor: '#f47b20', borderWidth: 2, backgroundColor: '#fff8f3',
    position: 'relative', paddingTop: 16,
  },
  recommendedBadge: {
    position: 'absolute', top: -9, left: 10,
    backgroundColor: '#f47b20', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  recommendedBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  mealInfo: { flex: 1, marginRight: 10 },
  mealLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  mealLabel: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  originalPrice: { fontSize: 11, color: '#999', textDecorationLine: 'line-through' },
  price: { fontSize: 18, fontWeight: '800', color: '#f47b20' },
  priceUnit: { fontSize: 11, color: '#888' },

  // Qty control
  addBtn: {
    backgroundColor: '#f47b20', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8,
  },
  addBtnDisabled: { backgroundColor: '#f9c9a0' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f47b20', borderRadius: 8,
  },
  qtyBtn: {
    padding: 8, alignItems: 'center', justifyContent: 'center',
  },
  qtyValue: { color: '#fff', fontWeight: '800', fontSize: 14, minWidth: 22, textAlign: 'center' },

  // Empty
  emptyContainer: { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center' },
  newSearchBtn: {
    backgroundColor: '#f47b20', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10,
  },
  newSearchBtnText: { color: '#fff', fontWeight: '700' },

  // Info cards
  infoCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  infoCardTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },

  // Amenities grid
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityGridItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f5f5f5', paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, width: '47%',
  },
  amenityGridText: { fontSize: 12, color: '#555', fontWeight: '500', flex: 1 },

  // Times
  timesRow: {
    flexDirection: 'row', gap: 12, backgroundColor: '#f5f5f5',
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  timeBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeLabel: { fontSize: 11, color: '#888' },
  timeValue: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },

  // Policies
  policyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  policyDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444',
    marginTop: 6, flexShrink: 0,
  },
  policyText: { fontSize: 13, color: '#555', lineHeight: 20, flex: 1 },

  // Bottom bar
  bottomBar: {
    borderTopWidth: 1, borderTopColor: '#e5e5e5', backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: 10,
  },
  emptyCartBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 8,
  },
  emptyCartText: { fontSize: 14, color: '#888' },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  totalAmount: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  totalInclTax: { fontSize: 10, color: '#aaa' },
  proceedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f47b20', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  proceedBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
