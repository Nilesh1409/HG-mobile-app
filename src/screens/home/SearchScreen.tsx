import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { MainStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import ScreenHeader from '../../components/common/ScreenHeader';

type Nav = StackNavigationProp<MainStackParamList, 'Search'>;

const formatDate = (d: Date) => d.toISOString().split('T')[0];
const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<'bikes' | 'hostels'>('bikes');
  const location = 'Chikkamagaluru';

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [people, setPeople] = useState('1');

  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  const handleSearch = () => {
    if (tab === 'bikes') {
      navigation.navigate('BikeSearch', {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        startTime,
        endTime,
        location,
      });
    } else {
      // Navigate to hostel tab
      navigation.navigate('MainTabs' as never);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Search" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Tab toggle */}
        <View style={styles.tabs}>
          {(['bikes', 'hostels'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'bikes' ? '🏍 Bikes' : '🏨 Hostels'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location always preset */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e5e5e5' }}>
          <Ionicons name="location" size={16} color="#f47b20" />
          <Text style={{ fontSize: 14, color: '#1a1a1a', fontWeight: '500' }}>Chikkamagaluru</Text>
        </View>

        {/* Start Date */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{tab === 'bikes' ? 'Start Date' : 'Check In'}</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowStartDate(true)}>
              <Text style={styles.pickerText}>{formatDate(startDate)}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{tab === 'bikes' ? 'End Date' : 'Check Out'}</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowEndDate(true)}>
              <Text style={styles.pickerText}>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showStartDate && (
          <DateTimePicker
            value={startDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowStartDate(Platform.OS === 'ios');
              if (date) setStartDate(date);
            }}
          />
        )}
        {showEndDate && (
          <DateTimePicker
            value={endDate}
            mode="date"
            minimumDate={startDate}
            onChange={(_, date) => {
              setShowEndDate(Platform.OS === 'ios');
              if (date) setEndDate(date);
            }}
          />
        )}

        {tab === 'bikes' && (
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>Start Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.timeRow}>
                  {TIME_SLOTS.filter((_, i) => i % 4 === 0).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.timeChip, startTime === t && styles.timeChipActive]}
                      onPress={() => setStartTime(t)}
                    >
                      <Text style={[styles.timeChipText, startTime === t && styles.timeChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>End Time</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.timeRow}>
                  {TIME_SLOTS.filter((_, i) => i % 4 === 0).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.timeChip, endTime === t && styles.timeChipActive]}
                      onPress={() => setEndTime(t)}
                    >
                      <Text style={[styles.timeChipText, endTime === t && styles.timeChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {tab === 'hostels' && (
          <Input
            label="Number of Guests"
            placeholder="1"
            value={people}
            onChangeText={setPeople}
            keyboardType="number-pad"
          />
        )}

        <Button title="Search" onPress={handleSearch} style={styles.searchBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 20, paddingBottom: 40 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#f47b20' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#fff' },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  fieldHalf: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', marginBottom: 6 },
  picker: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: { fontSize: 15, color: '#1a1a1a' },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  timeChipActive: { backgroundColor: '#f47b20', borderColor: '#f47b20' },
  timeChipText: { fontSize: 12, color: '#666' },
  timeChipTextActive: { color: '#fff' },
  searchBtn: { marginTop: 8 },
});
