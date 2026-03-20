import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface PopupData {
  title: string;
  description: string;
  show: 'once' | 'always' | 'never';
  imageUrl?: string;
}

const POPUP_SEEN_KEY = 'popup_seen_v1';

export default function PopupBanner() {
  const [visible, setVisible] = useState(false);
  const [popup, setPopup] = useState<PopupData | null>(null);
  const { user } = useAuthStore();
  // Prevent multiple concurrent fetches when navigating quickly
  const fetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (fetchingRef.current) return;

      let cancelled = false;
      fetchingRef.current = true;

      const fetchAndDecide = async () => {
        try {
          const res = await api.get<{ success: boolean; data: PopupData }>('/popup');
          if (cancelled) return;
          const data = res.data?.data;
          if (!data || data.show === 'never') return;

          if (data.show === 'always') {
            setPopup(data);
            setVisible(true);
            return;
          }

          // show === 'once' — track per-user in SecureStore
          const key = user ? `${POPUP_SEEN_KEY}_${user._id ?? (user as any).id}` : POPUP_SEEN_KEY;
          const seen = await SecureStore.getItemAsync(key);
          if (!seen) {
            setPopup(data);
            setVisible(true);
          }
        } catch {
          // popup is non-critical; ignore errors silently
        } finally {
          fetchingRef.current = false;
        }
      };

      fetchAndDecide();
      return () => { cancelled = true; };
    }, [user])
  );

  const handleClose = async () => {
    setVisible(false);
    if (popup?.show === 'once') {
      const key = user ? `${POPUP_SEEN_KEY}_${user._id ?? (user as any).id}` : POPUP_SEEN_KEY;
      await SecureStore.setItemAsync(key, 'true');
    }
  };

  if (!visible || !popup) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Close */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Banner image */}
          {!!popup.imageUrl && (
            <Image
              source={{ uri: popup.imageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          )}

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.logoRow}>
              <Image
                source={require('../../../assets/happygo.jpeg')}
                style={styles.logo}
                resizeMode="cover"
              />
              <View>
                <Text style={styles.brandName}>Happy Go</Text>
                <Text style={styles.brandSub}>Happy Ride Happy Stay</Text>
              </View>
            </View>

            <Text style={styles.title}>{popup.title}</Text>
            <Text style={styles.desc}>{popup.description}</Text>

            <TouchableOpacity style={styles.ctaBtn} onPress={handleClose}>
              <Text style={styles.ctaBtnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  sheet: {
    width: '100%', maxWidth: 380,
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  closeBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16,
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
  },
  bannerImage: { width: '100%', height: 180, backgroundColor: '#f47b20' },
  content: { padding: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  logo: { width: 44, height: 44, borderRadius: 12 },
  brandName: { fontSize: 16, fontWeight: '800', color: '#f47b20' },
  brandSub: { fontSize: 11, color: '#888', marginTop: 1 },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  desc: { fontSize: 14, color: '#555', lineHeight: 21, marginBottom: 20 },
  ctaBtn: {
    backgroundColor: '#f47b20', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#f47b20', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
