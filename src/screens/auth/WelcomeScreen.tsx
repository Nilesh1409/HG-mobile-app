import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../navigation/types';
import Button from '../../components/common/Button';

type Nav = StackNavigationProp<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>HappyGo</Text>
            <Text style={styles.logoSub}>Rentals</Text>
          </View>
          <Text style={styles.tagline}>Bikes & Hostels for Your{'\n'}Perfect Adventure</Text>
          <Text style={styles.subtitle}>
            Rent bikes, book hostels, and explore Goa without limits.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Login"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginBtn}
          />
          <Button
            title="Create Account"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
            style={styles.registerBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingBottom: 40 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 8 },
  logoText: { fontSize: 48, fontWeight: '800', color: '#f47b20', letterSpacing: -1 },
  logoSub: { fontSize: 18, fontWeight: '500', color: '#1a1a1a', marginTop: -8 },
  tagline: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: { gap: 12 },
  loginBtn: {},
  registerBtn: {},
});
