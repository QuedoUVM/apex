import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { updateUserProfile, logoutUser, enableTwoFactor, disableTwoFactor } from '../authService';
import { getBiometricType, clearCredentials, getCredentials } from '../biometricAuth';
import { clearSecret } from '../twoFactor';
import TwoFactorSetupScreen from './TwoFactorSetupScreen';
import { C } from '../theme';

const APP_VERSION = '1.0.0 · Demo';

function Avatar({ name, size = 60 }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function Row({ icon, label, value, onPress, danger, rightIcon = 'chevron-forward' }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      <View style={[styles.rowIcon, danger && { backgroundColor: C.redLight }]}>
        <Ionicons name={icon} size={18} color={danger ? C.red : C.purple} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: C.red }]}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {onPress && <Ionicons name={rightIcon} size={16} color={danger ? C.red : C.muted} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ onClose }) {
  const user = auth.currentUser;

  const [profile, setProfile] = useState({
    nombre: user?.displayName ?? '',
    telefono: '',
    rfc: '',
    fechaNacimiento: '',
  });

  const [editModal, setEditModal]   = useState(false);
  const [setupModal, setSetupModal] = useState(false);
  const [draft, setDraft]           = useState(profile);
  const [saving, setSaving]         = useState(false);
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [bioType, setBioType]       = useState(null);
  const [hasBioCreds, setHasBioCreds] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [snap, type, creds] = await Promise.all([
        getDoc(doc(db, 'athena_users', user.uid)),
        getBiometricType(),
        getCredentials(),
      ]);
      if (snap.exists()) {
        const d = snap.data();
        const p = {
          nombre:          d.displayName    ?? user.displayName ?? '',
          telefono:        d.telefono        ?? '',
          rfc:             d.rfc             ?? '',
          fechaNacimiento: d.fechaNacimiento ?? '',
        };
        setProfile(p);
        setDraft(p);
        setTfaEnabled(d.twoFactorEnabled ?? false);
      }
      setBioType(type);
      setHasBioCreds(!!creds);
    } catch (_) {}
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveProfile() {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName:     draft.nombre.trim()          || null,
        telefono:        draft.telefono.trim()         || null,
        rfc:             draft.rfc.trim().toUpperCase()|| null,
        fechaNacimiento: draft.fechaNacimiento.trim()  || null,
      });
      setProfile(draft);
      setEditModal(false);
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleTfa(value) {
    if (value) {
      setSetupModal(true);
    } else {
      Alert.alert(
        'Desactivar 2FA',
        '¿Estás seguro? Tu cuenta quedará menos protegida.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desactivar', style: 'destructive',
            onPress: async () => {
              await Promise.all([disableTwoFactor(user.uid), clearSecret()]);
              setTfaEnabled(false);
            },
          },
        ],
      );
    }
  }

  async function disableBiometric() {
    Alert.alert(
      'Desactivar acceso biométrico',
      '¿Eliminar las credenciales guardadas en este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar', style: 'destructive',
          onPress: async () => { await clearCredentials(); setHasBioCreds(false); },
        },
      ],
    );
  }

  async function doLogout() {
    try {
      await AsyncStorage.multiRemove(['@butler_transactions', '@butler_credit_profile']);
      await logoutUser();
    } catch (_) {}
  }

  function confirmLogout() {
    if (Platform.OS === 'web') {
      // Alert.alert multi-button no funciona en web — usar confirm nativo del browser
      if (window.confirm('¿Cerrar sesión?')) doLogout();
    } else {
      Alert.alert(
        'Cerrar sesión',
        '¿Estás seguro de que quieres salir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar sesión', style: 'destructive', onPress: doLogout },
        ],
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={24} color={C.muted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <Avatar name={profile.nombre} size={72} />
          <Text style={styles.name}>{profile.nombre || 'Sin nombre'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Profile info */}
        <Text style={styles.sectionTitle}>Información personal</Text>
        <View style={styles.card}>
          <Row icon="person-outline"   label="Nombre"             value={profile.nombre          || '—'} onPress={() => { setDraft(profile); setEditModal(true); }} />
          <Row icon="call-outline"     label="Teléfono"           value={profile.telefono         || '—'} onPress={() => { setDraft(profile); setEditModal(true); }} />
          <Row icon="card-outline"     label="RFC"                value={profile.rfc              || '—'} onPress={() => { setDraft(profile); setEditModal(true); }} />
          <Row icon="calendar-outline" label="Fecha de nacimiento" value={profile.fechaNacimiento  || '—'} onPress={() => { setDraft(profile); setEditModal(true); }} />
        </View>

        {/* App settings */}
        <Text style={styles.sectionTitle}>Configuración</Text>
        <View style={styles.card}>
          <Row icon="cash-outline"         label="Moneda"    value="MXN · Peso mexicano"  />
          <Row icon="language-outline"     label="Idioma"    value="Español (México)"      />
          <Row icon="phone-portrait-outline" label="Versión" value={APP_VERSION}           />
          <Row icon="shield-checkmark-outline" label="Privacidad y datos"
            onPress={() => Alert.alert('Privacidad', 'Tus datos financieros se almacenan únicamente en este dispositivo mediante AsyncStorage. Los datos de cuenta se guardan en Firebase.')} />
          <Row icon="document-text-outline"  label="Términos de uso"
            onPress={() => Alert.alert('Términos', 'Apex es un proyecto académico. Las proyecciones e información financiera son estimaciones y no constituyen asesoría financiera certificada.')} />
        </View>

        {/* Security */}
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => toggleTfa(!tfaEnabled)}>
            <View style={styles.rowIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={C.purple} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Verificación en dos pasos</Text>
              <Text style={styles.rowValue}>{tfaEnabled ? 'Activada (TOTP)' : 'Desactivada'}</Text>
            </View>
            <Switch
              value={tfaEnabled}
              onValueChange={toggleTfa}
              trackColor={{ false: C.border, true: C.purple }}
              thumbColor="#fff"
            />
          </TouchableOpacity>

          {bioType && (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={hasBioCreds ? 0.7 : 1}
              onPress={hasBioCreds ? disableBiometric : undefined}
            >
              <View style={styles.rowIcon}>
                <Ionicons
                  name={bioType === 'faceid' ? 'scan-outline' : 'finger-print-outline'}
                  size={18} color={C.purple}
                />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>
                  {bioType === 'faceid' ? 'Face ID' : 'Huella dactilar'}
                </Text>
                <Text style={styles.rowValue}>
                  {hasBioCreds ? 'Habilitado — toca para desactivar' : 'Desactivado — inicia sesión para activar'}
                </Text>
              </View>
              <Ionicons
                name={hasBioCreds ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={hasBioCreds ? C.green : C.muted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          <Row icon="log-out-outline" label="Cerrar sesión" danger onPress={confirmLogout} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <TwoFactorSetupScreen
        visible={setupModal}
        onClose={() => setSetupModal(false)}
        onSuccess={() => { setSetupModal(false); setTfaEnabled(true); }}
      />

      {/* Edit profile modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={styles.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar perfil</Text>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { key: 'nombre',          label: 'Nombre completo',      placeholder: 'Juan García López',    keyboard: 'default' },
              { key: 'telefono',        label: 'Teléfono',             placeholder: '+52 55 1234 5678',     keyboard: 'phone-pad' },
              { key: 'rfc',             label: 'RFC',                  placeholder: 'GALO900101XXX',        keyboard: 'default' },
              { key: 'fechaNacimiento', label: 'Fecha de nacimiento',  placeholder: 'DD/MM/AAAA',           keyboard: 'numbers-and-punctuation' },
            ].map(f => (
              <View key={f.key} style={{ marginBottom: 20 }}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={draft[f.key]}
                  onChangeText={v => setDraft(d => ({ ...d, [f.key]: f.key === 'rfc' ? v.toUpperCase() : v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={C.muted}
                  keyboardType={f.keyboard}
                  autoCapitalize={f.key === 'nombre' ? 'words' : 'characters'}
                />
              </View>
            ))}
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveProfile} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { paddingHorizontal: 20 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  headerTitle: { color: C.text, fontSize: 20, fontWeight: '700' },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar:        { backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.purple + '55' },
  avatarText:    { color: C.purple, fontWeight: '800', letterSpacing: 1 },
  name:          { color: C.text, fontSize: 20, fontWeight: '700', marginTop: 12 },
  email:         { color: C.muted, fontSize: 13, marginTop: 4 },

  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },
  card:         { backgroundColor: C.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },

  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  rowIcon:    { width: 34, height: 34, borderRadius: 10, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel:   { color: C.text, fontSize: 14, fontWeight: '500' },
  rowValue:   { color: C.muted, fontSize: 12, marginTop: 1 },

  modalWrap:   { flex: 1, backgroundColor: C.bgBase, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle:  { color: C.text, fontSize: 20, fontWeight: '700' },
  fieldLabel:  { color: C.muted, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  fieldInput:  { backgroundColor: C.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, fontWeight: '600' },
  saveBtn:     { backgroundColor: C.purple, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
