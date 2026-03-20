import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ImageBackground,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = StackNavigationProp<AuthStackParamList, 'Welcome'>;

const HERO_IMAGE = 'https://alka-jewellery-files.s3.amazonaws.com/4b31ec10-b379-434c-a935-941fa56b7abf.webp';
const LOGO = require('../../../assets/happygo.jpeg');

const FEATURES = [
  { icon: 'bicycle-outline' as const, text: 'Zero-deposit bike rentals' },
  { icon: 'bed-outline' as const, text: 'Comfortable hostel stays' },
  { icon: 'star-outline' as const, text: '5-star rating on Google Maps' },
  { icon: 'people-outline' as const, text: 'Trusted by 3.5 lakh+ travellers' },
];

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.bg} imageStyle={styles.bgImage}>
        {/* dark gradient overlay */}
        <View style={styles.overlay} />

        {/* Content */}
        <View style={[styles.inner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>

          {/* Logo + Brand */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Image source={LOGO} style={styles.logoImage} resizeMode="cover" />
            </View>
            <Text style={styles.brandName}>Happy Go</Text>
            <Text style={styles.tagline}>Happy Ride Happy Stay</Text>
          </View>

          {/* Headline */}
          <View style={styles.headline}>
            <Text style={styles.headlineText}>
              Bikes & Hostels for Your{'\n'}
              <Text style={styles.headlineAccent}>Perfect Adventure</Text>
            </Text>
            <Text style={styles.headlineSub}>
              Best bike rental service in Chikkamagaluru since 2010
            </Text>
          </View>

          {/* Feature pills */}
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.text} style={styles.featurePill}>
                <Ionicons name={f.icon} size={15} color="#f47b20" />
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* CTA buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.88}
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupBtn}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.88}
            >
              <Text style={styles.signupBtnText}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Help */}
          <TouchableOpacity
            style={styles.helpRow}
            onPress={() => Linking.openURL('tel:+919008022800')}
          >
            <Ionicons name="call-outline" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.helpText}>Need help? Call +91 90080-22800</Text>
          </TouchableOpacity>

        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bg: { flex: 1 },
  bgImage: { resizeMode: 'cover' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 25, 0.68)',
  },

  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  // Brand
  brand: { alignItems: 'center', gap: 8 },
  logoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#f47b20', overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#f47b20', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  logoImage: { width: 80, height: 80 },
  brandName: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textTransform: 'uppercase' },

  // Headline
  headline: { alignItems: 'center', gap: 10 },
  headlineText: { fontSize: 26, fontWeight: '700', color: '#ffffff', textAlign: 'center', lineHeight: 36 },
  headlineAccent: { color: '#f47b20' },
  headlineSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 },

  // Features
  features: { gap: 10 },
  featurePill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  featureText: { color: '#ffffff', fontSize: 13, fontWeight: '500', flex: 1 },

  // Buttons
  actions: { gap: 12 },
  loginBtn: {
    backgroundColor: '#f47b20', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#f47b20', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  signupBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  signupBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Help
  helpRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  helpText: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
});
