import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../services/auth';
import { auth, db } from '../../services/firebase';
import AppButton from '../../components/ui/AppButton';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { HP, fontSizes, radii } from '../../styles/theme';

// ─── Selector de tema ─────────────────────────────────────────────────────────
const MODOS = [
  { key: 'light',  label: 'Claro',   icon: 'sunny-outline' },
  { key: 'dark',   label: 'Oscuro',  icon: 'moon-outline' },
  { key: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];

function ThemeSelector({ mode, setMode, colors }) {
  return (
    <View style={[ts.wrap, { backgroundColor: colors.bgSubtle, borderRadius: radii.lg }]}>
      {MODOS.map((m) => {
        const active = mode === m.key;
        return (
          <TouchableOpacity
            key={m.key}
            style={[ts.btn, active && { backgroundColor: colors.bgCard, borderRadius: radii.md }]}
            onPress={() => setMode(m.key)}
          >
            <Ionicons name={m.icon} size={16} color={active ? colors.accent : colors.textMuted} />
            <Text style={[ts.label, { color: active ? colors.accent : colors.textMuted }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const ts = StyleSheet.create({
  wrap:  { flexDirection: 'row', padding: 4, marginBottom: 16 },
  btn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9 },
  label: { fontSize: fontSizes.sm, fontWeight: '500' },
});

// ─── Fila de dato ─────────────────────────────────────────────────────────────
function DataRow({ label, value, colors, last }) {
  return (
    <View style={[dr.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={[dr.lbl, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[dr.val, { color: colors.text }]}>{value || '—'}</Text>
    </View>
  );
}
const dr = StyleSheet.create({
  row: { paddingVertical: 13, paddingHorizontal: 16 },
  lbl: { fontSize: fontSizes.xs, marginBottom: 2 },
  val: { fontSize: fontSizes.md, fontWeight: '500' },
});

// ─── Fila de opción ───────────────────────────────────────────────────────────
function OptionRow({ icon, label, sublabel, onPress, danger, colors, last }) {
  const ic = danger ? colors.danger : colors.accent;
  const bg = danger ? colors.dangerLight : colors.accentLight;
  return (
    <TouchableOpacity
      style={[or.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <View style={[or.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={ic} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[or.label, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
        {sublabel ? <Text style={[or.sub, { color: colors.textMuted }]}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}
const or = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label:    { fontSize: fontSizes.md, fontWeight: '500' },
  sub:      { fontSize: fontSizes.xs, marginTop: 1 },
});

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function PerfilScreen() {
  const { colors, mode, setMode } = useTheme();
  const { user } = useAuth();

  const [userData,  setUserData]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [modalEdit, setModalEdit] = useState(false);
  const [modalPass, setModalPass] = useState(false);
  const [form,      setForm]      = useState({ nombre: '', phone: '', direccion: '' });
  const [pass,      setPass]      = useState({ actual: '', nueva: '', confirmar: '' });
  const [passErr,   setPassErr]   = useState('');

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUserData(d);
        setForm({ nombre: d.nombre || '', phone: d.phone || '', direccion: d.direccion || '' });
      }
    } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const setF  = (f) => (v) => setForm((p) => ({ ...p, [f]: v }));
  const setP  = (f) => (v) => { setPass((p) => ({ ...p, [f]: v })); setPassErr(''); };

  const guardarPerfil = async () => {
    if (!form.nombre.trim()) return Alert.alert('', 'El nombre es requerido.');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { nombre: form.nombre.trim(), phone: form.phone.trim(), direccion: form.direccion.trim(), updatedAt: serverTimestamp() });
      await updateProfile(auth.currentUser, { displayName: form.nombre.trim() });
      setModalEdit(false); cargar();
    } catch { Alert.alert('Error', 'No se pudo actualizar el perfil.'); }
    finally { setSaving(false); }
  };

  const cambiarPassword = async () => {
    if (!pass.actual || !pass.nueva || !pass.confirmar) return setPassErr('Completa todos los campos.');
    if (pass.nueva !== pass.confirmar) return setPassErr('Las contraseñas no coinciden.');
    if (pass.nueva.length < 8) return setPassErr('Mínimo 8 caracteres.');
    setSaving(true);
    try {
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(user.email, pass.actual));
      await updatePassword(auth.currentUser, pass.nueva);
      setModalPass(false); setPass({ actual: '', nueva: '', confirmar: '' });
      Alert.alert('Listo', 'Contraseña actualizada.');
    } catch (err) {
      setPassErr(err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Contraseña actual incorrecta.' : 'No se pudo cambiar la contraseña.');
    } finally { setSaving(false); }
  };

  const cerrarSesion = () =>
    Alert.alert('Cerrar sesión', '¿Deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logoutUser },
    ]);

  const eliminarCuenta = () =>
    Alert.alert('Eliminar cuenta', 'Esta acción es irreversible.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteUser(auth.currentUser); }
        catch { Alert.alert('', 'Vuelve a iniciar sesión y luego elimina la cuenta.'); }
      }},
    ]);

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const inicial = (userData?.nombre || user?.displayName || 'U')[0].toUpperCase();

  return (
    <View style={[s.fill, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.statusBar} />
      <ScreenHeader title="Perfil" />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={[s.avatar, { backgroundColor: colors.accent }]}>
            <Text style={s.avatarLetter}>{inicial}</Text>
          </View>
          <Text style={[s.avatarName, { color: colors.text }]}>{userData?.nombre || user?.displayName}</Text>
          <Text style={[s.avatarEmail, { color: colors.textMuted }]}>{user?.email}</Text>
        </View>

        {/* Apariencia */}
        <Text style={[s.section, { color: colors.textMuted }]}>APARIENCIA</Text>
        <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={s.themeRow}>
            <View style={[s.themeIcon, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="color-palette-outline" size={18} color={colors.accent} />
            </View>
            <Text style={[s.themeLabel, { color: colors.text }]}>Tema de la app</Text>
          </View>
          <ThemeSelector mode={mode} setMode={setMode} colors={colors} />
        </View>

        {/* Datos personales */}
        <Text style={[s.section, { color: colors.textMuted }]}>DATOS PERSONALES</Text>
        <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {[
            { lbl: 'Nombre',           val: userData?.nombre },
            { lbl: 'Correo',           val: userData?.email },
            { lbl: 'Teléfono',         val: userData?.phone },
            { lbl: 'CURP',             val: userData?.curp },
            { lbl: 'Nacimiento',       val: userData?.fechaNacimiento },
            { lbl: 'Dirección',        val: userData?.direccion },
          ].map(({ lbl, val }, i, arr) => (
            <DataRow key={lbl} label={lbl} value={val} colors={colors} last={i === arr.length - 1} />
          ))}
        </View>

        {/* Configuración */}
        <Text style={[s.section, { color: colors.textMuted }]}>CONFIGURACIÓN</Text>
        <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <OptionRow icon="create-outline"    label="Editar perfil"      sublabel="Nombre, teléfono, dirección" onPress={() => setModalEdit(true)} colors={colors} />
          <OptionRow icon="lock-closed-outline" label="Cambiar contraseña" sublabel="Actualiza tu acceso"        onPress={() => setModalPass(true)}  colors={colors} last />
        </View>

        {/* Cuenta */}
        <Text style={[s.section, { color: colors.textMuted }]}>CUENTA</Text>
        <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <OptionRow icon="log-out-outline" label="Cerrar sesión"  onPress={cerrarSesion}    colors={colors} />
          <OptionRow icon="trash-outline"   label="Eliminar cuenta" sublabel="Acción irreversible" onPress={eliminarCuenta} colors={colors} danger last />
        </View>
      </ScrollView>

      {/* Modal: editar perfil */}
      <Modal visible={modalEdit} transparent animationType="slide" onRequestClose={() => setModalEdit(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.bgCard }]}>
            <View style={s.handle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Editar perfil</Text>
            {[
              { f: 'nombre',   lbl: 'Nombre completo', ph: 'Tu nombre' },
              { f: 'phone',    lbl: 'Teléfono',        ph: '5512345678', kb: 'phone-pad' },
              { f: 'direccion',lbl: 'Dirección',       ph: 'Calle, número, colonia' },
            ].map(({ f, lbl, ph, kb }) => (
              <View key={f}>
                <Text style={[s.lbl, { color: colors.textSub }]}>{lbl}</Text>
                <TextInput
                  style={[s.inp, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                  placeholder={ph} placeholderTextColor={colors.textMuted}
                  value={form[f]} onChangeText={setF(f)} keyboardType={kb || 'default'}
                />
              </View>
            ))}
            <AppButton title="Guardar cambios" onPress={guardarPerfil} loading={saving} />
            <AppButton title="Cancelar" variant="ghost" onPress={() => setModalEdit(false)} style={{ marginTop: 8 }} disabled={saving} />
          </View>
        </View>
      </Modal>

      {/* Modal: cambiar contraseña */}
      <Modal visible={modalPass} transparent animationType="slide" onRequestClose={() => setModalPass(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.bgCard }]}>
            <View style={s.handle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Cambiar contraseña</Text>
            {[
              { f: 'actual',    lbl: 'Contraseña actual' },
              { f: 'nueva',     lbl: 'Nueva contraseña' },
              { f: 'confirmar', lbl: 'Confirmar nueva contraseña' },
            ].map(({ f, lbl }) => (
              <View key={f}>
                <Text style={[s.lbl, { color: colors.textSub }]}>{lbl}</Text>
                <TextInput
                  style={[s.inp, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
                  placeholder="••••••••" placeholderTextColor={colors.textMuted}
                  secureTextEntry value={pass[f]} onChangeText={setP(f)}
                />
              </View>
            ))}
            {passErr ? <Text style={[s.errTxt, { color: colors.danger }]}>{passErr}</Text> : null}
            <AppButton title="Actualizar contraseña" onPress={cambiarPassword} loading={saving} />
            <AppButton title="Cancelar" variant="ghost"
              onPress={() => { setModalPass(false); setPass({ actual: '', nueva: '', confirmar: '' }); setPassErr(''); }}
              style={{ marginTop: 8 }} disabled={saving}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  fill:        { flex: 1 },
  scroll:      { paddingHorizontal: HP },
  avatarWrap:  { alignItems: 'center', paddingVertical: 24 },
  avatar:      { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarLetter:{ fontSize: 32, fontWeight: '700', color: '#fff' },
  avatarName:  { fontSize: fontSizes.lg, fontWeight: '700', marginBottom: 4 },
  avatarEmail: { fontSize: fontSizes.sm },
  section:     { fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
  card:        { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  themeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 12 },
  themeIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  themeLabel:  { fontSize: fontSizes.md, fontWeight: '500' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: fontSizes.lg, fontWeight: '700', marginBottom: 16 },
  lbl:         { fontSize: fontSizes.sm, fontWeight: '500', marginBottom: 6 },
  inp:         { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: fontSizes.md, marginBottom: 12 },
  errTxt:      { fontSize: fontSizes.sm, textAlign: 'center', marginBottom: 12 },
});
