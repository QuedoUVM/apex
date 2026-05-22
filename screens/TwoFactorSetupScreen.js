import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Linking, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';
import { enableTwoFactor } from '../authService';
import { generateSecret, buildOtpUri, verifyTOTP, saveSecret } from '../twoFactor';
import { C } from '../theme';

export default function TwoFactorSetupScreen({ visible, onClose, onSuccess }) {
  const [step, setStep]       = useState(1);
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  async function startSetup() {
    setLoading(true);
    try {
      const s = await generateSecret();
      setSecret(s);
      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  async function openInAuthApp() {
    const uri = buildOtpUri(secret, auth.currentUser?.email ?? '');
    const canOpen = await Linking.canOpenURL(uri);
    if (canOpen) {
      await Linking.openURL(uri);
    } else {
      Alert.alert(
        'App de autenticación no encontrada',
        'Instala Google Authenticator o Authy y luego usa "Agregar cuenta manual" con el código mostrado.',
      );
    }
  }

  async function confirmCode() {
    if (code.length !== 6) { setError('Ingresa el código de 6 dígitos.'); return; }
    setLoading(true); setError(null);
    try {
      const valid = await verifyTOTP(secret, code);
      if (!valid) { setError('Código incorrecto o expirado. Intenta de nuevo.'); return; }
      await saveSecret(secret);
      await enableTwoFactor(auth.currentUser.uid);
      setStep(3);
    } catch {
      setError('Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep(1); setSecret(''); setCode(''); setError(null);
    onClose();
  }

  function handleSuccess() {
    setStep(1); setSecret(''); setCode(''); setError(null);
    onSuccess();
  }

  const groupedSecret = secret.match(/.{1,4}/g)?.join(' ') ?? '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <Text style={s.title}>Verificación en dos pasos</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Step 1: intro */}
          {step === 1 && (
            <View style={s.stepWrap}>
              <View style={s.iconCircle}>
                <Ionicons name="shield-checkmark" size={40} color={C.green} />
              </View>
              <Text style={s.stepTitle}>Agrega una capa extra de seguridad</Text>
              <Text style={s.stepDesc}>
                Con 2FA, además de tu contraseña necesitarás un código de 6 dígitos generado
                por tu app de autenticación (Google Authenticator, Authy, etc.) cada vez que inicies sesión.
              </Text>
              <TouchableOpacity style={s.btn} onPress={startSetup} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Comenzar configuración</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: scan / enter secret */}
          {step === 2 && (
            <View style={s.stepWrap}>
              <Text style={s.stepTitle}>Configura tu app de autenticación</Text>

              <View style={s.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={C.blue} style={{ marginTop: 1 }} />
                <Text style={s.infoText}>
                  Abre Google Authenticator o Authy, pulsa "+" y elige "Ingresar clave manualmente".
                  Copia el código de abajo.
                </Text>
              </View>

              <Text style={s.secretLabel}>Clave secreta</Text>
              <View style={s.secretBox}>
                <Text selectable style={s.secretText}>{groupedSecret}</Text>
              </View>

              <TouchableOpacity style={s.secondaryBtn} onPress={openInAuthApp}>
                <Ionicons name="open-outline" size={16} color={C.purple} />
                <Text style={s.secondaryBtnText}>Abrir en app de autenticación</Text>
              </TouchableOpacity>

              <Text style={s.verifyLabel}>Código de verificación</Text>
              <TextInput
                style={s.codeInput}
                value={code}
                onChangeText={t => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                placeholder="000000"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                textAlign="center"
                maxLength={6}
              />
              {error && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={14} color={C.red} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[s.btn, (loading || code.length < 6) && s.btnDisabled]}
                onPress={confirmCode}
                disabled={loading || code.length < 6}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnText}>Verificar y activar</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: success */}
          {step === 3 && (
            <View style={s.stepWrap}>
              <View style={[s.iconCircle, { backgroundColor: C.greenLight }]}>
                <Ionicons name="checkmark-circle" size={40} color={C.green} />
              </View>
              <Text style={s.stepTitle}>¡2FA activado!</Text>
              <Text style={s.stepDesc}>
                Tu cuenta ahora está protegida con verificación en dos pasos.
                Necesitarás tu app de autenticación en cada inicio de sesión.
              </Text>
              <TouchableOpacity style={s.btn} onPress={handleSuccess}>
                <Text style={s.btnText}>Listo</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap:   { flex: 1, backgroundColor: C.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  title:  { color: C.text, fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  stepWrap:  { alignItems: 'center', paddingTop: 32, gap: 16 },
  iconCircle:{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  stepTitle: { color: C.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  stepDesc:  { color: C.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },

  infoBox:   { flexDirection: 'row', gap: 8, backgroundColor: C.blueLight, borderRadius: 12, padding: 12, alignSelf: 'stretch' },
  infoText:  { color: C.blue, fontSize: 13, lineHeight: 19, flex: 1 },

  secretLabel: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', alignSelf: 'flex-start' },
  secretBox:   { backgroundColor: C.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 20, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center' },
  secretText:  { color: C.text, fontSize: 17, fontWeight: '700', letterSpacing: 3, fontVariant: ['tabular-nums'] },

  secondaryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  secondaryBtnText: { color: C.purple, fontSize: 14, fontWeight: '600' },

  verifyLabel: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', alignSelf: 'flex-start', marginTop: 8 },
  codeInput:   { backgroundColor: C.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, fontSize: 28, fontWeight: '700', color: C.text, letterSpacing: 10, paddingVertical: 16, alignSelf: 'stretch' },

  errorBox:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  errorText: { color: C.red, fontSize: 13, flex: 1 },

  btn:         { backgroundColor: C.purple, borderRadius: 14, paddingVertical: 15, alignSelf: 'stretch', alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.45 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
