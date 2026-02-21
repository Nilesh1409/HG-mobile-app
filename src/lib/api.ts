import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let navigationRef: { reset: (state: object) => void } | null = null;

export const setNavigationRef = (ref: { reset: (state: object) => void }) => {
  navigationRef = ref;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      await SecureStore.deleteItemAsync('token');
      if (navigationRef) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }],
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
