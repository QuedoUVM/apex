import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getSecret, verifyTOTP } from '../twoFactor';
import { getBiometricType, authenticateBiometric } from '../biometricAuth';
import { logoutUser } from '../authService';
import { C } from '../theme';

export default function TwoFactorVerifyScreen({ onVerified }) {
  const [code, setCode]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [bioType, setBioType]       = useState(null);
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    getBiometricType().then(setBioType);
    // attempt biometric automatically on mount
    tryBiometric(true);
  }, []);

  async function tryBiometric(silent = false) {
    const type = await getBiometricType();
    if (!type) return;
    setBioLoading(true);
    try {
      const ok = await authenticateBiometric(
        type === 'faceid' ? 'Usa Face ID para continuar' : 'Usa tu huella para continuar'
      );
      if (ok) onVerified();
    } catch {
      if (!silent) setError('No se pudo autenticar. Ingresa tu código.');
    } finally {
      setBioLoading(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) { setError('El código debe tener 6 dígitos.'); return; }
    setLoading(true); setError(null);
    try {
      const secret = await getSecret();
      if (!secret) { setError('No se encontró el secreto 2FA en este dispositivo.'); return; }
      const valid = await verifyTOTP(secret, code);
      if (valid) {
        onVerified();
      } else {
        setError('Código incorrecto o expirado. Intenta de nuevo.');
        setCode('');
      }
    } catch {
      setError('Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const bioIcon = bioType === 'faceid' ? 'scan-outline' : 'finger-print-outline';
  const bioLabel = bioType === 'faceid' ? 'Face ID' : 'Huella dactilar';

  return (
    <LinearGradient colors={['#0F0F1F', '#1A1A2E', '#1C1040']} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.container}>

          {/* Icon */}
          <View style={s.iconWrap}>
            <View style={s.iconGlow} />
            <Ionicons name="shield-checkmark" size={44} color={C.purple} />
          </View>

          <Text style={s.title}>Verificación en dos pasos</Text>
          <Text style={s.subtitle}>
            Ingresa el código de 6 dígitos de tu app de autenticación
          </Text>

          {/* TOTP input */}
          <TextInput
            style={s.codeInput}
            value={code}
            onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(null); }}
            placeholder="000 000"
            placeholderTextColor={C.muted}
            keyboardType="number-pad"
            textAlign="center"
            maxLength={6}
            autoFocus
          />

          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={C.red} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, (loading || code.length < 6) && s.btnDisabled]}
            onPress={handleVerify}
            disabled={loading || code.length < 6}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Verificar</Text>}
          </TouchableOpacity>

          {/* Biometric alternative */}
          {bioType && (
            <TouchableOpacity style={s.bioBtn} onPress={() => tryBiometric(false)} disabled={bioLoading}>
              {bioLoading
                ? <ActivityIndicator color={C.purple} size="small" />
                : (
                  <>
                    <Ionicons name={bioIcon} size={22} color={C.purple} />
                    <Text style={s.bioBtnText}>Usar {bioLabel}</Text>
                  </>
                )}
            </TouchableOpacity>
          )}

          {/* Sign out */}
          <TouchableOpacity style={s.signOutBtn} onPress={logoutUser}>
            <Text style={s.signOutText}>Cerrar sesión</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  inner:     { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },

  iconWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  iconGlow: { position: 'absolute', width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(107,92,231,0.18)' },

  title:    { color: C.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  codeInput: {
    alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border,
    fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: 12,
    paddingVertical: 18, marginTop: 8,
  },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  errorText: { color: C.red, fontSize: 13, flex: 1 },

  btn:         { alignSelf: 'stretch', backgroundColor: C.purple, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },

  bioBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, backgroundColor: 'rgba(107,92,231,0.1)', borderRadius: 14, marginTop: 4 },
  bioBtnText: { color: C.purple, fontSize: 15, fontWeight: '600' },

  signOutBtn:  { marginTop: 16 },
  signOutText: { color: C.muted, fontSize: 13 },
});
