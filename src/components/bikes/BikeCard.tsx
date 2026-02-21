import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Bike } from '../../types/bike.types';

interface BikeCardProps {
  bike: Bike;
  onPress: () => void;
}

export default function BikeCard({ bike, onPress }: BikeCardProps) {
  const price = bike.pricing?.limited?.pricePerDay ?? bike.pricing?.unlimited?.pricePerDay ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityLabel={`View ${bike.name}`}>
      <Image
        source={{ uri: bike.images?.[0] ?? 'https://via.placeholder.com/300x180' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{bike.brand} {bike.name}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={13} color="#999" />
          <Text style={styles.location} numberOfLines={1}>{bike.location}</Text>
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
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 120, backgroundColor: '#f0f0f0' },
  info: { padding: 10 },
  name: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  location: { fontSize: 12, color: '#999999', flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  price: { fontSize: 18, fontWeight: '700', color: '#f47b20' },
  priceUnit: { fontSize: 12, color: '#999999', marginLeft: 2 },
});
