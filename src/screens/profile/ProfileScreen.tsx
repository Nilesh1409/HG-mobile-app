import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList, MainTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import api from '../../lib/api';
import type { User } from '../../types/auth.types';
import Button from '../../components/common/Button';
import queryClient from '../../lib/queryClient';
import Constants from 'expo-constants';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'ProfileTab'>,
  StackNavigationProp<MainStackParamList>
>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, token, logout } = useAuthStore();
  const { clearCart } = useCartStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: User }>('/users/profile');
      return res.data.data;
    },
    enabled: !!token,
  });

  const currentUser = profile ?? user;

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearCart();
          queryClient.clear();
        },
      },
    ]);
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedIn}>
          <Text style={styles.title}>Profile</Text>
          <Ionicons name="person-circle-outline" size={80} color="#e5e5e5" style={styles.guestIcon} />
          <Text style={styles.guestTitle}>You're not logged in</Text>
          <Button
            title="Login"
            onPress={() => navigation.navigate('Login' as never)}
            style={styles.loginBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityLabel="Edit Profile"
          >
            <Ionicons name="create-outline" size={22} color="#f47b20" />
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentUser?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser?.name}</Text>
            <Text style={styles.userMobile}>{currentUser?.mobile}</Text>
            <Text style={styles.userEmail}>{currentUser?.email}</Text>
          </View>
        </View>

        {/* Wallet */}
        {currentUser && (
          <View style={styles.walletCard}>
            <Ionicons name="wallet-outline" size={20} color="#f47b20" />
            <Text style={styles.walletLabel}>Wallet Balance</Text>
            <Text style={styles.walletAmount}>₹{currentUser.wallet ?? 0}</Text>
          </View>
        )}

        {/* Verification Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification</Text>
          <TouchableOpacity
            style={styles.verifyRow}
            onPress={() =>
              !currentUser?.aadhaarVerified && navigation.navigate('AadhaarVerify', {})
            }
          >
            <View style={styles.verifyLeft}>
              <Ionicons name="card-outline" size={18} color="#666" />
              <Text style={styles.verifyLabel}>Aadhaar Card</Text>
            </View>
            <Text style={currentUser?.aadhaarVerified ? styles.verified : styles.notVerified}>
              {currentUser?.aadhaarVerified ? '✓ Verified' : 'Verify Now →'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.verifyRow}
            onPress={() => !currentUser?.dlVerified && navigation.navigate('UploadDL', {})}
          >
            <View style={styles.verifyLeft}>
              <Ionicons name="car-outline" size={18} color="#666" />
              <Text style={styles.verifyLabel}>Driving License</Text>
            </View>
            <Text style={currentUser?.dlVerified ? styles.verified : styles.notVerified}>
              {currentUser?.dlVerified ? '✓ Verified' : 'Upload →'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {[
            { label: 'Edit Profile', icon: 'person-outline', onPress: () => navigation.navigate('EditProfile') },
            { label: 'My Referrals', icon: 'gift-outline', onPress: () => navigation.navigate('Referral') },
            { label: 'Cart', icon: 'cart-outline', onPress: () => navigation.navigate('Cart') },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuRow}
              onPress={item.onPress}
              accessibilityLabel={item.label}
            >
              <View style={styles.menuLeft}>
                <Ionicons name={item.icon as any} size={18} color="#666" />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Ionicons name="information-circle-outline" size={18} color="#666" />
              <Text style={styles.menuLabel}>App Version</Text>
            </View>
            <Text style={styles.versionText}>
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  notLoggedIn: { flex: 1, padding: 24, alignItems: 'center' },
  guestIcon: { marginVertical: 32 },
  guestTitle: { fontSize: 18, color: '#666', marginBottom: 24 },
  loginBtn: { width: 200 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f47b20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  userMobile: { fontSize: 14, color: '#666', marginTop: 2 },
  userEmail: { fontSize: 13, color: '#999', marginTop: 1 },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5ed',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 14,
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffd4a8',
  },
  walletLabel: { flex: 1, fontSize: 14, color: '#666', fontWeight: '500' },
  walletAmount: { fontSize: 18, fontWeight: '700', color: '#f47b20' },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 12,
    paddingBottom: 4,
  },
  verifyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  verifyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifyLabel: { fontSize: 14, color: '#1a1a1a' },
  verified: { fontSize: 13, color: '#22c55e', fontWeight: '500' },
  notVerified: { fontSize: 13, color: '#f47b20', fontWeight: '500' },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuLabel: { fontSize: 14, color: '#1a1a1a' },
  versionText: { fontSize: 13, color: '#999' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fff5f5',
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
});
