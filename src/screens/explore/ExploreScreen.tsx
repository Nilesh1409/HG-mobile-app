import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { MainStackParamList } from '../../navigation/types';
import HostelCard from '../../components/hostels/HostelCard';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import api from '../../lib/api';
import type { Hostel } from '../../types/hostel.types';

type Nav = StackNavigationProp<MainStackParamList, 'ExploreTab'>;

export default function ExploreScreen() {
  const navigation = useNavigation<Nav>();

  const { data: hostels, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['hostels'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Hostel[] }>('/hostels');
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hostels</Text>
        <Text style={styles.subtitle}>Comfortable stays at great locations</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f47b20" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={hostels ?? []}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HostelCard
              hostel={item}
              onPress={() => navigation.navigate('HostelDetail', { hostelId: item._id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="bed-outline" title="No hostels available" subtitle="Check back soon!" />
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f47b20" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40 },
});
