import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

interface BikeSpecChipProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
}

export default function BikeSpecChip({ icon, label }: BikeSpecChipProps) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={14} color="#f47b20" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff5ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffd4a8',
  },
  label: { fontSize: 13, color: '#f47b20', fontWeight: '500' },
});
