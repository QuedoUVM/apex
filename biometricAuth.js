import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CREDS_KEY = 'apex_bio_creds';

export async function getBiometricType() {
  if (Platform.OS === 'web') return null;
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return null;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return null;
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'faceid';
  return 'fingerprint';
}

export async function authenticateBiometric(reason = 'Confirma tu identidad') {
  if (Platform.OS === 'web') return false;
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    fallbackLabel: 'Usar contraseña',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function saveCredentials(email, password) {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(CREDS_KEY, JSON.stringify({ email, password }));
}

export async function getCredentials() {
  if (Platform.OS === 'web') return null;
  try {
    const raw = await SecureStore.getItemAsync(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearCredentials() {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(CREDS_KEY).catch(() => {});
}
