import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import Button from '../../components/common/Button';
import api from '../../lib/api';

type Nav = StackNavigationProp<MainStackParamList, 'AadhaarVerify'>;
type Route = RouteProp<MainStackParamList, 'AadhaarVerify'>;

// Cashfree requires https:// redirect URLs (rejects custom schemes like happygorentals://)
// We use the universal link and intercept it in the WebView before the OS handles it
const REDIRECT_URL = 'https://happygorentals.com/aadhaar-verified';

type FlowState =
  | 'idle'
  | 'loading'      // waiting for /initiate response
  | 'webview'      // DigiLocker WebView is open
  | 'polling'      // waiting for AUTHENTICATED status
  | 'completing'   // calling /complete
  | 'success';     // done

type VerifiedData = {
  maskedNumber: string;
  name: string;
  dob: string;
  gender: string;
  address: { full: string };
};

export default function AadhaarVerifyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params ?? {};

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [verifiedData, setVerifiedData] = useState<VerifiedData | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ── Step 1: Get DigiLocker URL from backend ─────────────────────────────────
  const handleInitiate = async () => {
    setFlowState('loading');
    try {
      const { data } = await api.post('/verification/aadhaar/initiate', {
        redirect_url: REDIRECT_URL,
        user_flow: 'signup', // works for both new and existing DigiLocker accounts
      });
      setDigilockerUrl(data.data.digilocker_url);
      setFlowState('webview');
    } catch (err: any) {
      setFlowState('idle');
      Toast.show({
        type: 'error',
        text1: 'Could not start verification',
        text2: err?.response?.data?.message || 'Please try again.',
      });
    }
  };

  // ── Step 2: Intercept DigiLocker redirect back to app ────────────────────────
  const handleWebViewNavigation = useCallback(
    (navState: WebViewNavigation) => {
      const url = navState.url ?? '';
      if (url.startsWith('https://happygorentals.com/aadhaar-verified')) {
        // User completed DigiLocker — intercept before the page loads
        setFlowState('polling');
        startPolling();
        return false;
      }
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Step 3: Poll /status until AUTHENTICATED ─────────────────────────────────
  const startPolling = useCallback(() => {
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // 30 × 2s = 60 seconds max

    pollIntervalRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await api.get('/verification/aadhaar/status');
        const status: string = data.data.status;

        if (status === 'AUTHENTICATED') {
          stopPolling();
          await handleComplete();
        } else if (status === 'EXPIRED') {
          stopPolling();
          setFlowState('idle');
          Toast.show({ type: 'error', text1: 'Session expired', text2: 'Please start again.' });
        } else if (status === 'CONSENT_DENIED') {
          stopPolling();
          setFlowState('idle');
          Toast.show({ type: 'error', text1: 'Consent denied', text2: 'Aadhaar sharing was rejected.' });
        } else if (attempts >= MAX_ATTEMPTS) {
          stopPolling();
          setFlowState('idle');
          Toast.show({ type: 'error', text1: 'Verification timed out', text2: 'Please try again.' });
        }
        // PENDING → keep polling
      } catch {
        // network hiccup — keep polling until max attempts
        if (attempts >= MAX_ATTEMPTS) {
          stopPolling();
          setFlowState('idle');
          Toast.show({ type: 'error', text1: 'Verification failed', text2: 'Please try again.' });
        }
      }
    }, 2000);
  }, [stopPolling]);

  // ── Step 4: Fetch & save Aadhaar data ───────────────────────────────────────
  const handleComplete = async () => {
    setFlowState('completing');
    try {
      const { data } = await api.post('/verification/aadhaar/complete', {});
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVerifiedData(data.data);
      setFlowState('success');
    } catch (err: any) {
      setFlowState('idle');
      Toast.show({
        type: 'error',
        text1: 'Failed to fetch Aadhaar details',
        text2: err?.response?.data?.message || 'Please try again.',
      });
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (flowState === 'success' && verifiedData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Aadhaar Verification" />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheckmark}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Aadhaar Verified!</Text>
          <View style={styles.verifiedCard}>
            <InfoRow label="Name" value={verifiedData.name} />
            <InfoRow label="DOB" value={verifiedData.dob} />
            <InfoRow label="Gender" value={verifiedData.gender} />
            <InfoRow label="Aadhaar" value={verifiedData.maskedNumber} last />
          </View>
          <Button title="Done" onPress={() => navigation.goBack()} style={styles.fullWidth} />
        </View>
      </SafeAreaView>
    );
  }

  // ── DigiLocker WebView modal ─────────────────────────────────────────────────
  const isWebViewOpen = flowState === 'webview';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Aadhaar Verification" />

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoTitle}>Secure via DigiLocker</Text>
          <Text style={styles.infoDesc}>
            Your Aadhaar is verified through DigiLocker — the government-approved
            platform. We never receive your raw Aadhaar number.
          </Text>
        </View>

        <View style={styles.stepList}>
          <Step num="1" text="Tap the button below" />
          <Step num="2" text="Log into DigiLocker with your Aadhaar-linked mobile OTP" />
          <Step num="3" text="Approve the document-sharing consent" />
          <Step num="4" text="You're verified instantly" />
        </View>

        {(flowState === 'loading' || flowState === 'polling' || flowState === 'completing') ? (
          <View style={styles.pollingBox}>
            <ActivityIndicator size="large" color="#f47b20" />
            <Text style={styles.pollingText}>
              {flowState === 'loading' && 'Opening DigiLocker…'}
              {flowState === 'polling' && 'Waiting for consent confirmation…'}
              {flowState === 'completing' && 'Fetching your Aadhaar details…'}
            </Text>
          </View>
        ) : (
          <Button
            title="Verify with DigiLocker"
            onPress={handleInitiate}
            style={styles.fullWidth}
          />
        )}
      </View>

      {/* Full-screen WebView modal for DigiLocker */}
      <Modal
        visible={isWebViewOpen}
        animationType="slide"
        onRequestClose={() => {
          setFlowState('idle');
          stopPolling();
        }}
      >
        <SafeAreaView style={styles.webViewContainer} edges={['top']}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>DigiLocker Verification</Text>
            <TouchableOpacity
              onPress={() => {
                setFlowState('idle');
                stopPolling();
              }}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtnText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: digilockerUrl }}
            onShouldStartLoadWithRequest={handleWebViewNavigation}
            onNavigationStateChange={(navState) => {
              if (navState.url?.startsWith('https://happygorentals.com/aadhaar-verified')) {
                setFlowState('polling');
                startPolling();
              }
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webViewLoader}>
                <ActivityIndicator size="large" color="#f47b20" />
              </View>
            )}
            style={styles.webView}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Small helper components ──────────────────────────────────────────────────

function Step({ num, text }: { num: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, padding: 20, justifyContent: 'space-between' },
  fullWidth: { width: '100%' },

  infoBox: {
    backgroundColor: '#fff8f3',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde8d0',
    marginBottom: 24,
  },
  infoIcon: { fontSize: 32, marginBottom: 8 },
  infoTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },
  infoDesc: { fontSize: 13, color: '#666', lineHeight: 20, textAlign: 'center' },

  stepList: { gap: 12, marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f47b20',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, color: '#444', lineHeight: 22, paddingTop: 2 },

  pollingBox: { alignItems: 'center', gap: 14, paddingVertical: 24 },
  pollingText: { fontSize: 14, color: '#666', textAlign: 'center' },

  // Success
  successContainer: { flex: 1, alignItems: 'center', padding: 32, gap: 16 },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheckmark: { fontSize: 40, color: '#fff' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  verifiedCard: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#eee' },
  rowLabel: { fontSize: 14, color: '#666' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },

  // WebView modal
  webViewContainer: { flex: 1, backgroundColor: '#fff' },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  webViewTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  closeBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  closeBtnText: { fontSize: 14, color: '#f47b20', fontWeight: '600' },
  webView: { flex: 1 },
  webViewLoader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
