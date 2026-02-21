import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  title,
  variant = 'primary',
  loading = false,
  size = 'md',
  onPress,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const handlePress = async (e: Parameters<NonNullable<TouchableOpacityProps['onPress']>>[0]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityLabel={title}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#f47b20' : '#ffffff'} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: { backgroundColor: '#f47b20' },
  secondary: { backgroundColor: '#1a1a1a' },
  outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#f47b20' },
  danger: { backgroundColor: '#ef4444' },
  disabled: { opacity: 0.5 },
  sm: { paddingVertical: 8, paddingHorizontal: 16 },
  md: { paddingVertical: 14, paddingHorizontal: 24 },
  lg: { paddingVertical: 18, paddingHorizontal: 32 },
  text: { fontWeight: '600', textAlign: 'center' },
  primaryText: { color: '#ffffff' },
  secondaryText: { color: '#ffffff' },
  outlineText: { color: '#f47b20' },
  dangerText: { color: '#ffffff' },
  smText: { fontSize: 13 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 17 },
});
