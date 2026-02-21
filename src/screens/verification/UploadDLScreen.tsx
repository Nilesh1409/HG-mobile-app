import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import type { MainStackParamList } from '../../navigation/types';
import ScreenHeader from '../../components/common/ScreenHeader';
import Button from '../../components/common/Button';
import api from '../../lib/api';

type Nav = StackNavigationProp<MainStackParamList, 'UploadDL'>;
type Route = RouteProp<MainStackParamList, 'UploadDL'>;

export default function UploadDLScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { bookingId } = route.params ?? {};
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission denied' });
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
        });

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!imageUri) return;
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() ?? 'dl_image.jpg';
      formData.append('dlImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: filename,
      } as unknown as Blob);
      if (bookingId) formData.append('bookingId', bookingId);

      await api.post('/users/dl-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUploaded(true);
      Toast.show({ type: 'success', text1: 'DL Uploaded', text2: 'Verification pending' });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: err?.response?.data?.message ?? 'Please try again',
      });
    } finally {
      setUploading(false);
    }
  };

  if (uploaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Driving License" />
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>DL Uploaded!</Text>
          <Text style={styles.successSubtitle}>
            Your driving license is under review. Verification usually takes 24 hours.
          </Text>
          <Button title="Done" onPress={() => navigation.goBack()} style={styles.doneBtn} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Upload Driving License" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.description}>
          Upload a clear photo of the front side of your driving license.
          This is required to activate your bike bookings.
        </Text>

        {imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity onPress={() => setImageUri(null)} style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadArea}>
            <Text style={styles.uploadIcon}>📷</Text>
            <Text style={styles.uploadText}>No image selected</Text>
            <View style={styles.pickButtons}>
              <Button
                title="Camera"
                variant="outline"
                onPress={() => pickImage(true)}
                style={styles.pickBtn}
              />
              <Button
                title="Gallery"
                variant="outline"
                onPress={() => pickImage(false)}
                style={styles.pickBtn}
              />
            </View>
          </View>
        )}

        {imageUri && (
          <Button
            title="Submit for Verification"
            onPress={handleUpload}
            loading={uploading}
            style={styles.submitBtn}
          />
        )}

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips for a good photo:</Text>
          <Text style={styles.tip}>• Ensure good lighting</Text>
          <Text style={styles.tip}>• All text should be clearly readable</Text>
          <Text style={styles.tip}>• No blur or reflections</Text>
          <Text style={styles.tip}>• Full DL visible in frame</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 20, paddingBottom: 40 },
  description: { fontSize: 14, color: '#666', lineHeight: 22, marginBottom: 24 },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  uploadIcon: { fontSize: 48 },
  uploadText: { fontSize: 14, color: '#999' },
  pickButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  pickBtn: { flex: 1 },
  previewContainer: { marginBottom: 24, alignItems: 'center', gap: 12 },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  changeBtn: { padding: 8 },
  changeBtnText: { color: '#f47b20', fontSize: 14, fontWeight: '600' },
  submitBtn: { marginBottom: 20 },
  tips: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    gap: 6,
  },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  tip: { fontSize: 13, color: '#666' },
  successContainer: { flex: 1, alignItems: 'center', padding: 32, gap: 16 },
  successIcon: {
    fontSize: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    textAlign: 'center',
    lineHeight: 80,
    color: '#fff',
    overflow: 'hidden',
  },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  successSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  doneBtn: { width: '100%' },
});
