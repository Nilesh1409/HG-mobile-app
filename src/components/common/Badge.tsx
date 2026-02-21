import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { BookingStatus, PaymentStatus } from '../../types/booking.types';

type BadgeVariant = BookingStatus | PaymentStatus | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706' },
  confirmed: { bg: '#dcfce7', text: '#16a34a' },
  active: { bg: '#dbeafe', text: '#2563eb' },
  completed: { bg: '#f3f4f6', text: '#6b7280' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
  unpaid: { bg: '#fee2e2', text: '#dc2626' },
  partial: { bg: '#fef3c7', text: '#d97706' },
  paid: { bg: '#dcfce7', text: '#16a34a' },
  default: { bg: '#f3f4f6', text: '#6b7280' },
};

export default function Badge({ label, variant = 'default' }: BadgeProps) {
  const colors = variantColors[variant] ?? variantColors.default;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
