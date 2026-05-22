import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  loginUser, registerUser,
  signInWithGooglePopup, signInWithGoogleCredential,
} from './authService';
import {
  getBiometricType, authenticateBiometric,
  getCredentials, saveCredentials,
} from './biometricAuth';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID     = '788449188960-1hqchtupkudp0b62km4doi8g5iqal73a.apps.googleusercontent.com';
const IOS_CLIENT_ID     = '788449188960-7osoocud4e378viehtl4crdbppn556hu.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = '788449188960-ai4tj6uqsptv8f8j3tkmbe1dq8quhd51.apps.googleusercontent.com';

const C = {
  bgDeep: '#0F0F1F', bgBase: '#1A1A2E', bgViolet: '#1C1040',
  surface: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.09)',
  purple: '#6B5CE7', purpleGlow: 'rgba(107,92,231,0.22)', purpleFocus: 'rgba(107,92,231,0.08)',
  green: '#4ADE80', greenGlow: 'rgba(74,222,128,0.18)',
  textPrimary: '#EDEDEF', textMuted: '#8A8F98',
  error: '#F87171', errorBg: 'rgba(248,113,113,0.10)',
};

function Field({ label, icon, value, onChangeText, placeholder, keyboardType = 'default',
  secure, showToggle, onToggle, optional, onFocus, onBlur, focused,
  autoComplete, textContentType, onSubmitEditing, returnKeyType, editable = true }) {
  return (
    <View style={s.field}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {optional && <Text style={s.optionalTag}>Opcional</Text>}
      </View>
      <View style={[s.inputRow, focused && s.inputFocused]}>
        <Ionicons name={icon} size={18} color={focused ? C.purple : C.textMuted} style={s.inputIcon} />
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType={keyboardType}
          secureTextEntry={secure}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType ?? 'next'}
        />
        {showToggle && (
          <Pressable onPress={onToggle} style={s.eyeBtn} hitSlop={8}
            accessibilityLabel={secure ? 'Mostrar contraseña' : 'Ocultar contraseña'}>
            <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const [mode, setMode]       = useState('login');
  const [email, setEmail]     = useState('');
  const [password, setPwd]    = useState('');
  const [nombre, setNombre]   = useState('');
  const [telefono, setTel]    = useState('');
  const [rfc, setRfc]         = useState('');
  const [nacimiento, setNac]  = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [bioType, setBioType] = useState(null);
  const [hasBioCreds, setHasBioCreds] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID, androidClientId: ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    Promise.all([getBiometricType(), getCredentials()]).then(([type, creds]) => {
      setBioType(type);
      setHasBioCreds(!!creds);
    });
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      setGoogleLoading(true);
      signInWithGoogleCredential(id_token)
        .catch(err => setError(friendlyError(err.code)))
        .finally(() => setGoogleLoading(false));
    } else if (response?.type === 'error') {
      setError('No se pudo iniciar sesión con Google.');
    }
  }, [response]);

  function pressIn()  { Animated.spring(btnScale, { toValue: 0.97, speed: 30, bounciness: 0, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(btnScale, { toValue: 1,    speed: 20, bounciness: 5, useNativeDriver: true }).start(); }

  async function handleSubmit() {
    const e = email.trim();
    const p = password;
    if (!e || !p || loading) return;
    if (mode === 'register' && !nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    setLoading(true); setError(null);
    try {
      if (mode === 'login') {
        await loginUser(e, p);
        if (bioType && !hasBioCreds) {
          const bioLabel = bioType === 'faceid' ? 'Face ID' : 'huella dactilar';
          Alert.alert(
            `Habilitar ${bioLabel}`,
            `¿Quieres usar ${bioLabel} para iniciar sesión más rápido en el futuro?`,
            [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Habilitar', onPress: () => saveCredentials(e, p).then(() => setHasBioCreds(true)) },
            ],
          );
        }
      } else {
        await registerUser(e, p, {
          nombre:          nombre.trim(),
          telefono:        telefono.trim() || null,
          rfc:             rfc.trim().toUpperCase() || null,
          fechaNacimiento: nacimiento.trim() || null,
        });
      }
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    if (!bioType || !hasBioCreds || bioLoading) return;
    setBioLoading(true); setError(null);
    try {
      const ok = await authenticateBiometric(
        bioType === 'faceid' ? 'Usa Face ID para iniciar sesión' : 'Usa tu huella para iniciar sesión'
      );
      if (!ok) return;
      const creds = await getCredentials();
      if (!creds) { setError('No se encontraron credenciales. Inicia sesión con tu contraseña.'); return; }
      await loginUser(creds.email, creds.password);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setBioLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (Platform.OS === 'web') {
      setGoogleLoading(true);
      try { await signInWithGooglePopup(); }
      catch (err) { const m = friendlyError(err.code); if (m) setError(m); }
      finally { setGoogleLoading(false); }
    } else {
      promptAsync();
    }
  }

  function toggleMode() {
    setError(null); setEmail(''); setPwd(''); setNombre(''); setTel(''); setRfc(''); setNac('');
    setMode(m => m === 'login' ? 'register' : 'login');
  }

  const busy = loading || googleLoading;
  const f = (name) => ({ onFocus: () => setFocused(name), onBlur: () => setFocused(null), focused: focused === name });

  return (
    <LinearGradient colors={[C.bgDeep, C.bgBase, C.bgViolet]} locations={[0, 0.55, 1]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={s.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>

            {/* Brand */}
            <View style={s.brand}>
              <View style={s.dotWrap}>
                <View style={s.dotGlow} />
                <View style={s.dot} />
              </View>
              <Text style={s.brandTitle}>Athena</Text>
            </View>
            <Text style={s.brandSub}>Tu Asistente financiero personal</Text>

            {/* Card */}
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
                <Text style={s.cardSub}>{mode === 'login' ? 'Bienvenido de vuelta' : 'Únete gratis — en minutos'}</Text>
              </View>

              {Platform.OS === 'web' && (
                <>
                  <Pressable style={[s.googleBtn, busy && s.btnDisabledOutline]} onPress={handleGoogle}
                    disabled={busy} accessibilityRole="button" accessibilityLabel="Continuar con Google">
                    {googleLoading ? <ActivityIndicator size="small" color={C.textPrimary} /> : (
                      <><View style={s.googleLogo}><Text style={s.googleLogoG}>G</Text></View>
                        <Text style={s.googleBtnText}>Continuar con Google</Text></>
                    )}
                  </Pressable>
                  <View style={s.divider}>
                    <View style={s.dividerLine} />
                    <Text style={s.dividerLabel}>o continúa con correo</Text>
                    <View style={s.dividerLine} />
                  </View>
                </>
              )}

              {/* Register-only: nombre */}
              {mode === 'register' && (
                <Field label="Nombre completo" icon="person-outline" value={nombre} onChangeText={t => { setNombre(t); setError(null); }}
                  placeholder="Juan García López" autoComplete="name" textContentType="name" {...f('nombre')} editable={!busy} />
              )}

              {/* Email */}
              <Field label="Correo electrónico" icon="mail-outline" value={email} onChangeText={t => { setEmail(t); setError(null); }}
                placeholder="tu@correo.com" keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
                {...f('email')} editable={!busy} />

              {/* Register-only: teléfono */}
              {mode === 'register' && (
                <Field label="Teléfono" icon="call-outline" value={telefono} onChangeText={setTel}
                  placeholder="+52 55 1234 5678" keyboardType="phone-pad" autoComplete="tel"
                  textContentType="telephoneNumber" optional {...f('tel')} editable={!busy} />
              )}

              {/* Register-only: RFC */}
              {mode === 'register' && (
                <Field label="RFC" icon="card-outline" value={rfc} onChangeText={t => setRfc(t.toUpperCase())}
                  placeholder="GALO900101XXX" autoComplete="off" optional {...f('rfc')} editable={!busy} />
              )}

              {/* Register-only: fecha de nacimiento */}
              {mode === 'register' && (
                <Field label="Fecha de nacimiento" icon="calendar-outline" value={nacimiento} onChangeText={setNac}
                  placeholder="DD/MM/AAAA" keyboardType="numbers-and-punctuation" optional {...f('nac')} editable={!busy} />
              )}

              {/* Password */}
              <Field label="Contraseña" icon="lock-closed-outline" value={password}
                onChangeText={t => { setPwd(t); setError(null); }}
                placeholder="••••••••" secure={!showPwd} showToggle onToggle={() => setShowPwd(v => !v)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                {...f('pwd')} editable={!busy} onSubmitEditing={handleSubmit} returnKeyType="done" />

              {error && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={C.error} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <Pressable style={[s.btn, busy && s.btnDisabled]} onPress={handleSubmit}
                  onPressIn={pressIn} onPressOut={pressOut} disabled={busy}
                  accessibilityRole="button" accessibilityLabel={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}>
                  <View style={s.btnGlow} />
                  {loading ? <ActivityIndicator color="#FFF" size="small" />
                    : <Text style={s.btnText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>}
                </Pressable>
              </Animated.View>

              {mode === 'login' && bioType && hasBioCreds && (
                <Pressable style={[s.bioBtn, bioLoading && s.btnDisabledOutline]}
                  onPress={handleBiometric} disabled={busy || bioLoading}
                  accessibilityRole="button"
                  accessibilityLabel={bioType === 'faceid' ? 'Iniciar con Face ID' : 'Iniciar con huella dactilar'}>
                  {bioLoading
                    ? <ActivityIndicator size="small" color={C.textPrimary} />
                    : (
                      <>
                        <Ionicons
                          name={bioType === 'faceid' ? 'scan-outline' : 'finger-print-outline'}
                          size={22} color={C.textPrimary}
                        />
                        <Text style={s.bioBtnText}>
                          {bioType === 'faceid' ? 'Continuar con Face ID' : 'Continuar con huella dactilar'}
                        </Text>
                      </>
                    )}
                </Pressable>
              )}

              <Pressable onPress={toggleMode} disabled={busy} accessibilityRole="button">
                <Text style={s.toggleText}>
                  {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                  <Text style={s.toggleLink}>{mode === 'login' ? 'Regístrate' : 'Inicia sesión'}</Text>
                </Text>
              </Pressable>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function friendlyError(code) {
  switch (code) {
    case 'auth/invalid-email':           return 'El correo no tiene el formato correcto.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':    return 'Ese correo ya tiene una cuenta registrada.';
    case 'auth/weak-password':           return 'La contraseña debe tener mínimo 6 caracteres.';
    case 'auth/too-many-requests':       return 'Cuenta bloqueada temporalmente. Intenta más tarde.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return null;
    case 'auth/popup-blocked':           return 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes.';
    case 'auth/operation-not-allowed':   return 'Google Sign-In no está habilitado en Firebase.';
    case 'auth/network-request-failed':  return 'Sin conexión a internet. Revisa tu red.';
    default:                             return 'Algo salió mal. Intenta de nuevo.';
  }
}

const s = StyleSheet.create({
  inner:  { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 20 },

  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dotWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dotGlow: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(74,222,128,0.18)' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ADE80' },
  brandTitle: { color: '#EDEDEF', fontSize: 36, fontWeight: '800', letterSpacing: 0.3 },
  brandSub: { color: '#8A8F98', fontSize: 15, textAlign: 'center', marginBottom: 28 },

  card: { backgroundColor: C.surface, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 24, gap: 16 },
  cardHeader: { gap: 4 },
  cardTitle: { color: C.textPrimary, fontSize: 22, fontWeight: '700' },
  cardSub:   { color: C.textMuted, fontSize: 14 },

  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)', minHeight: 50, paddingHorizontal: 16 },
  btnDisabledOutline: { opacity: 0.5 },
  googleLogo: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  googleLogoG: { fontSize: 13, fontWeight: '800', color: '#4285F4', lineHeight: 16 },
  googleBtnText: { color: C.textPrimary, fontSize: 15, fontWeight: '500' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  dividerLabel: { color: C.textMuted, fontSize: 12, flexShrink: 0 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  field: { gap: 0 },
  label: { color: C.textMuted, fontSize: 13, fontWeight: '500', letterSpacing: 0.2 },
  optionalTag: { fontSize: 10, color: C.textMuted, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 14, minHeight: 50 },
  inputFocused: { borderColor: C.purple, backgroundColor: C.purpleFocus },
  inputIcon: { marginRight: 10 },
  input: { color: C.textPrimary, fontSize: 15, paddingVertical: 13 },
  eyeBtn: { padding: 6, marginLeft: 4 },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.errorBg, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, marginTop: -4 },
  errorText: { color: C.error, fontSize: 13, flex: 1 },

  btn: { backgroundColor: C.purple, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 4 },
  btnGlow: { position: 'absolute', top: -8, left: '20%', right: '20%', height: 20, borderRadius: 10, backgroundColor: C.purpleGlow },
  btnDisabled: { backgroundColor: 'rgba(107,92,231,0.38)' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  toggleText: { color: C.textMuted, fontSize: 14, textAlign: 'center' },
  toggleLink:  { color: C.purple, fontWeight: '600' },

  bioBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)', minHeight: 50, paddingHorizontal: 16 },
  bioBtnText: { color: C.textPrimary, fontSize: 15, fontWeight: '500' },
});
