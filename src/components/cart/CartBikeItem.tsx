import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { CartBikeItem as CartBikeItemType } from '../../types/cart.types';
import api from '../../lib/api';
import queryClient from '../../lib/queryClient';

interface Props {
  item: CartBikeItemType;
}

export default function CartBikeItem({ item }: Props) {
  const updateMutation = useMutation({
    mutationFn: (quantity: number) =>
      api.put(`/cart/items/${item._id}`, { quantity }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to update' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/cart/items/${item._id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: () => Toast.show({ type: 'error', text1: 'Failed to remove' }),
  });

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: item.bike?.images?.[0] ?? 'https://via.placeholder.com/80' }}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.bike?.brand} {item.bike?.name}</Text>
        <Text style={styles.detail}>{item.kmOption === 'limited' ? 'Limited KM' : 'Unlimited KM'}</Text>
        <Text style={styles.date}>
          {item.startDate} → {item.endDate}
        </Text>
        <View style={styles.row}>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateMutation.mutate(item.quantity - 1)}
              disabled={item.quantity <= 1 || updateMutation.isPending}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#f47b20" />
            ) : (
              <Text style={styles.qty}>{item.quantity}</Text>
            )}
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateMutation.mutate(item.quantity + 1)}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.price}>₹{item.totalPrice}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteMutation.mutate()}
        disabled={deleteMutation.isPending}
        accessibilityLabel="Remove item"
      >
        {deleteMutation.isPending ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'flex-start',
  },
  image: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#f0f0f0' },
  info: { flex: 1, marginLeft: 10 },
  name: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  detail: { fontSize: 12, color: '#f47b20', marginBottom: 2 },
  date: { fontSize: 12, color: '#999', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, color: '#1a1a1a', fontWeight: '600', lineHeight: 18 },
  qty: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', minWidth: 20, textAlign: 'center' },
  price: { fontSize: 16, fontWeight: '700', color: '#f47b20' },
  deleteBtn: { padding: 6, marginLeft: 6 },
});
