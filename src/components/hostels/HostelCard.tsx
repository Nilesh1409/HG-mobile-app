import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Hostel } from '../../types/hostel.types';

interface HostelCardProps {
  hostel: Hostel;
  onPress: () => void;
  horizontal?: boolean;
}

export default function HostelCard({ hostel, onPress, horizontal = false }: HostelCardProps) {
  const minPrice = hostel.pricing?.reduce((min, p) => Math.min(min, p.pricePerNight), Infinity) ?? 0;

  if (horizontal) {
    return (
      <TouchableOpacity style={styles.hCard} onPress={onPress} accessibilityLabel={`View ${hostel.name}`}>
        <Image
          source={{ uri: hostel.images?.[0] ?? 'https://via.placeholder.com/300x200' }}
          style={styles.hImage}
          resizeMode="cover"
        />
        <View style={styles.hInfo}>
          <Text style={styles.name} numberOfLines={1}>{hostel.name}</Text>
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color="#999" />
            <Text style={styles.location} numberOfLines={1}>{hostel.location}</Text>
          </View>
          {hostel.rating && (
            <View style={styles.row}>
              <Ionicons name="star" size={13} color="#f59e0b" />
              <Text style={styles.rating}>{hostel.rating.toFixed(1)} ({hostel.reviewCount ?? 0})</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{minPrice}</Text>
            <Text style={styles.priceUnit}>/night</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityLabel={`View ${hostel.name}`}>
      <Image
        source={{ uri: hostel.images?.[0] ?? 'https://via.placeholder.com/300x180' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{hostel.name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color="#999" />
          <Text style={styles.location} numberOfLines={1}>{hostel.location}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{minPrice}</Text>
          <Text style={styles.priceUnit}>/night</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 160, backgroundColor: '#f0f0f0' },
  info: { padding: 12 },
  hCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  hImage: { width: 110, height: 110, backgroundColor: '#f0f0f0' },
  hInfo: { flex: 1, padding: 10, gap: 4 },
  name: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  location: { fontSize: 12, color: '#999999', flex: 1 },
  rating: { fontSize: 12, color: '#666', marginLeft: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  price: { fontSize: 18, fontWeight: '700', color: '#f47b20' },
  priceUnit: { fontSize: 12, color: '#999999', marginLeft: 2 },
});
