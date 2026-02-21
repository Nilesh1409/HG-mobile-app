import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import ScreenHeader from '../../components/common/ScreenHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';
import type { ReferralData } from '../../types/payment.types';

export default function ReferralScreen() {
  const { user } = useAuthStore();
  const [applyCode, setApplyCode] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ReferralData }>('/referrals');
      return res.data.data;
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => api.post('/referrals/apply', { referralCode: applyCode }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Referral applied!', text2: 'Reward will be credited soon' });
      refetch();
      setApplyCode('');
    },
    onError: (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to apply',
        text2: err?.response?.data?.message ?? 'Invalid code',
      });
    },
  });

  const handleCopy = async () => {
    const code = user?.referralCode ?? data?.referralCode ?? '';
    await Clipboard.setStringAsync(code);
    Toast.show({ type: 'success', text1: 'Code copied!', text2: code });
  };

  const handleShare = async () => {
    const code = user?.referralCode ?? data?.referralCode ?? '';
    await Share.share({
      message: `Use my HappyGo referral code ${code} to get discounts on bike rentals and hostel bookings! Download the app at happygorentals.com`,
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const referralCode = user?.referralCode ?? data?.referralCode ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="My Referrals" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />
        }
      >
        {/* Your Code */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          <Text style={styles.code}>{referralCode}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeBtn} onPress={handleCopy} accessibilityLabel="Copy referral code">
              <Ionicons name="copy-outline" size={16} color="#f47b20" />
              <Text style={styles.codeBtnText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeBtn} onPress={handleShare} accessibilityLabel="Share referral code">
              <Ionicons name="share-outline" size={16} color="#f47b20" />
              <Text style={styles.codeBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        {data && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{data.totalReferrals}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₹{data.totalRewards}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>
        )}

        {/* Apply Code */}
        <View style={styles.applySection}>
          <Text style={styles.applyTitle}>Apply a Referral Code</Text>
          <Input
            placeholder="Enter referral code"
            value={applyCode}
            onChangeText={(t) => setApplyCode(t.toUpperCase())}
            autoCapitalize="characters"
          />
          <Button
            title="Apply Code"
            onPress={() => applyMutation.mutate()}
            loading={applyMutation.isPending}
            disabled={!applyCode.trim()}
          />
        </View>

        {/* Referral List */}
        {(data?.referrals?.length ?? 0) > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Referral History</Text>
            {(data?.referrals ?? []).map((r) => (
              <View key={r._id} style={styles.referralRow}>
                <View>
                  <Text style={styles.refName}>{r.referredUser?.name ?? 'Unknown'}</Text>
                  <Text style={styles.refDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.refRight}>
                  <Text style={styles.refReward}>+₹{r.rewardAmount}</Text>
                  <Text style={r.status === 'completed' ? styles.refCompleted : styles.refPending}>
                    {r.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 20, paddingBottom: 40 },
  codeCard: {
    backgroundColor: '#fff5ed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd4a8',
    marginBottom: 16,
    gap: 8,
  },
  codeLabel: { fontSize: 13, color: '#666' },
  code: { fontSize: 32, fontWeight: '800', color: '#f47b20', letterSpacing: 4 },
  codeActions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffd4a8',
  },
  codeBtnText: { color: '#f47b20', fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  applySection: { marginBottom: 24, gap: 8 },
  applyTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  listSection: {},
  listTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  referralRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  refName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  refDate: { fontSize: 12, color: '#999', marginTop: 2 },
  refRight: { alignItems: 'flex-end' },
  refReward: { fontSize: 15, fontWeight: '700', color: '#22c55e' },
  refPending: { fontSize: 12, color: '#f59e0b', textTransform: 'capitalize' },
  refCompleted: { fontSize: 12, color: '#22c55e', textTransform: 'capitalize' },
});
