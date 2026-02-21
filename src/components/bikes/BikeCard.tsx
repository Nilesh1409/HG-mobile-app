import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import type { Bike } from '../../types/bike.types';

interface BikeCardProps {
  bike: Bike;
  onPress: () => void;
}

export default function BikeCard({ bike, onPress }: BikeCardProps) {
  const price = bike.priceUnlimited?.breakdown?.pricePerUnit
    ?? bike.pricePerDay?.weekday?.unlimited?.price
    ?? 0;

  const isAvailable = bike.availableQuantity > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityLabel={`View ${bike.title}`}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: bike.images?.[0] ?? 'https://via.placeholder.com/300x180' }}
          style={styles.image}
          resizeMode="contain"
        />
        <View style={styles.zeroBadge}>
          <Text style={styles.zeroBadgeText}>Zero Deposit</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{bike.title}</Text>
        <Text style={styles.brand}>{bike.brand} • {bike.model}</Text>
        <View style={styles.availRow}>
          <View style={[styles.dot, { backgroundColor: isAvailable ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.availText}>
            {isAvailable ? `${bike.availableQuantity} available` : 'Not available'}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{price}</Text>
          <Text style={styles.priceUnit}>/day</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 190,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  imageContainer: { position: 'relative', backgroundColor: '#f9f9f9' },
  image: { width: '100%', height: 120 },
  zeroBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#f47b20', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  zeroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  info: { padding: 10 },
  name: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  brand: { fontSize: 11, color: '#666', marginBottom: 6 },
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  availText: { fontSize: 11, color: '#666' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 17, fontWeight: '700', color: '#f47b20' },
  priceUnit: { fontSize: 11, color: '#999', marginLeft: 2 },
});
