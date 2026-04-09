import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { getInversiones, addInversion, deleteInversion, updateValorActual, TIPOS_INVERSION } from '../../services/inversiones';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeader from '../../components/ui/ScreenHeader';
import AppButton from '../../components/ui/AppButton';
import { useRouter } from 'expo-router';
import { HP, fontSizes, radii } from '../../styles/theme';

const INIT = { nombre: '', tipo: TIPOS_INVERSION[0].label, montoInvertido: '', valorActual: '' };

function InvCard({ item, colors, onDelete, onUpdate }) {
  const tipo      = TIPOS_INVERSION.find((t) => t.label === item.tipo);
  const ganancia  = item.valorActual - item.montoInvertido;
  const pct       = item.montoInvertido > 0 ? ((ganancia / item.montoInvertido) * 100).toFixed(1) : '0.0';
  const positivo  = ganancia >= 0;

  return (
    <View style={[s.invCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={s.invTop}>
        <View style={[s.invIcon, { backgroundColor: colors.accentLight }]}>
          <Ionicons name={tipo?.icon || 'bar-chart-outline'} size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[s.invName, { color: colors.text }]}>{item.nombre}</Text>
          <Text style={[s.invType, { color: colors.textMuted }]}>{item.tipo}</Text>
        </View>
        <TouchableOpacity onPress={() => onUpdate(item)} hitSlop={8}>
          <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert('Eliminar', `¿Eliminar "${item.nombre}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) },
          ])}
          style={{ marginLeft: 12 }} hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={[s.invRow, { borderTopColor: colors.border }]}>
        <View>
          <Text style={[s.invLbl, { color: colors.textMuted }]}>Invertido</Text>
          <Text style={[s.invAmt, { color: colors.text }]}>${item.montoInvertido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[s.invLbl, { color: colors.textMuted }]}>Valor actual</Text>
          <Text style={[s.invAmt, { color: colors.text }]}>${item.valorActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[s.invLbl, { color: colors.textMuted }]}>Rendimiento</Text>
          <Text style={[s.invPct, { color: positivo ? colors.success : colors.danger }]}>
            {positivo ? '+' : ''}{pct}%
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function InversionesScreen() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const router     = useRouter();

  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState(false);
  const [modalUpdate, setModalUpdate] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [form,        setForm]        = useState(INIT);
  const [updateItem,  setUpdateItem]  = useState(null);
  const [nuevoValor,  setNuevoValor]  = useState('');
  const [errors,      setErrors]      = useState({});

  const cargar = useCallback(async () => {
    if (!user) return;
    try { setItems(await getInversiones(user.uid)); } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const set = (f) => (v) => { setForm((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: '' })); };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim())                                        e.nombre        = 'Campo requerido';
    if (!form.montoInvertido || +form.montoInvertido <= 0)          e.montoInvertido = 'Monto inválido';
    if (!form.valorActual    || +form.valorActual    <= 0)          e.valorActual    = 'Monto inválido';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    setSaving(true);
    try { await addInversion(user.uid, form); setForm(INIT); setModal(false); cargar(); }
    catch { Alert.alert('Error', 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };

  const eliminar = async (id) => {
    try { await deleteInversion(user.uid, id); setItems((p) => p.filter((x) => x.id !== id)); }
    catch { Alert.alert('Error', 'No se pudo eliminar.'); }
  };

  const abrirUpdate = (item) => { setUpdateItem(item); setNuevoValor(String(item.valorActual)); setModalUpdate(true); };

  const guardarUpdate = async () => {
    if (!nuevoValor || +nuevoValor <= 0) return;
    setSaving(true);
    try { await updateValorActual(user.uid, updateItem.id, nuevoValor); setModalUpdate(false); cargar(); }
    catch { Alert.alert('Error', 'No se pudo actualizar.'); }
    finally { setSaving(false); }
  };

  const tInv = items.reduce((s, x) => s + (x.montoInvertido || 0), 0);
  const tAct = items.reduce((s, x) => s + (x.valorActual    || 0), 0);
  const gan  = tAct - tInv;

  const AddBtn = (
    <TouchableOpacity style={[s.fab, { backgroundColor: colors.accent }]} onPress={() => setModal(true)}>
      <Ionicons name="add" size={22} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <View style={[s.fill, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.statusBar} />
      <ScreenHeader title="Inversiones" onBack={() => router.back()} right={AddBtn} />

      {/* Resumen portafolio */}
      <View style={[s.resumen, { backgroundColor: colors.bgCard, borderColor: colors.border, marginHorizontal: HP }]}>
        <Text style={[s.resLbl, { color: colors.textMuted }]}>Portafolio total</Text>
        <Text style={[s.resTotal, { color: colors.text }]}>${tAct.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
        <View style={s.resRow}>
          <View>
            <Text style={[s.resSubLbl, { color: colors.textMuted }]}>Invertido</Text>
            <Text style={[s.resSub, { color: colors.textSub }]}>${tInv.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.resSubLbl, { color: colors.textMuted }]}>Ganancia / Pérdida</Text>
            <Text style={[s.resSub, { color: gan >= 0 ? colors.success : colors.danger }]}>
              {gan >= 0 ? '+' : ''}${gan.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: 100 }]}
          renderItem={({ item }) => <InvCard item={item} colors={colors} onDelete={eliminar} onUpdate={abrirUpdate} />}
          ListEmptyComponent={<EmptyState icon="bar-chart-outline" title="Sin inversiones" subtitle="Toca + para registrar tu portafolio" />}
        />
      )}

      {/* Modal: nueva inversión */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.overlay}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={[s.sheet, { backgroundColor: colors.bgCard }]}>
              <View style={s.handle} />
              <Text style={[s.sheetTitle, { color: colors.text }]}>Nueva inversión</Text>

              {[{ f: 'nombre', ph: 'Ej. Tesla, Bitcoin, Depto…', lbl: 'Nombre' },
                { f: 'montoInvertido', ph: '0.00', lbl: 'Monto invertido ($)', kb: 'decimal-pad' },
                { f: 'valorActual', ph: '0.00', lbl: 'Valor actual ($)', kb: 'decimal-pad' },
              ].map(({ f, ph, lbl, kb }) => (
                <View key={f}>
                  <Text style={[s.lbl, { color: colors.textSub }]}>{lbl}</Text>
                  <TextInput
                    style={[s.inp, { backgroundColor: colors.bgInput, borderColor: errors[f] ? colors.danger : colors.border, color: colors.text }]}
                    placeholder={ph} placeholderTextColor={colors.textMuted}
                    keyboardType={kb || 'default'} value={form[f]} onChangeText={set(f)}
                  />
                  {errors[f] ? <Text style={[s.err, { color: colors.danger }]}>{errors[f]}</Text> : null}
                </View>
              ))}

              <Text style={[s.lbl, { color: colors.textSub }]}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                {TIPOS_INVERSION.map((t) => {
                  const active = form.tipo === t.label;
                  return (
                    <TouchableOpacity
                      key={t.label}
                      style={[s.chip, { backgroundColor: active ? colors.accentLight : colors.bgSubtle, borderColor: active ? colors.accent : colors.border }]}
                      onPress={() => set('tipo')(t.label)}
                    >
                      <Ionicons name={t.icon} size={14} color={active ? colors.accent : colors.textMuted} style={{ marginRight: 5 }} />
                      <Text style={[s.chipTxt, { color: active ? colors.accent : colors.textSub }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <AppButton title="Guardar inversión" onPress={guardar} loading={saving} />
              <AppButton title="Cancelar" variant="ghost" onPress={() => { setModal(false); setForm(INIT); setErrors({}); }} style={{ marginTop: 8 }} disabled={saving} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal: actualizar valor */}
      <Modal visible={modalUpdate} transparent animationType="fade" onRequestClose={() => setModalUpdate(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.bgCard }]}>
            <View style={s.handle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Actualizar valor</Text>
            <Text style={[s.lbl, { color: colors.textSub }]}>Nuevo valor actual ($)</Text>
            <TextInput
              style={[s.inp, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text }]}
              keyboardType="decimal-pad" value={nuevoValor} onChangeText={setNuevoValor} placeholderTextColor={colors.textMuted}
            />
            <AppButton title="Actualizar" onPress={guardarUpdate} loading={saving} />
            <AppButton title="Cancelar" variant="ghost" onPress={() => setModalUpdate(false)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  fill:      { flex: 1 },
  resumen:   { borderRadius: radii.xl, borderWidth: 1, padding: 16, marginBottom: 16 },
  resLbl:    { fontSize: fontSizes.xs, marginBottom: 4 },
  resTotal:  { fontSize: 28, fontWeight: '800', marginBottom: 12 },
  resRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  resSubLbl: { fontSize: fontSizes.xs, marginBottom: 2 },
  resSub:    { fontSize: fontSizes.md, fontWeight: '600' },
  fab:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list:      { paddingHorizontal: HP },
  invCard:   { borderRadius: radii.lg, borderWidth: 1, padding: 14, marginBottom: 8 },
  invTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  invIcon:   { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  invName:   { fontSize: fontSizes.md, fontWeight: '600' },
  invType:   { fontSize: fontSizes.xs },
  invRow:    { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 12 },
  invLbl:    { fontSize: fontSizes.xs, marginBottom: 2 },
  invAmt:    { fontSize: fontSizes.sm, fontWeight: '600' },
  invPct:    { fontSize: fontSizes.md, fontWeight: '800' },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:{ fontSize: fontSizes.lg, fontWeight: '700', marginBottom: 16 },
  lbl:       { fontSize: fontSizes.sm, fontWeight: '500', marginBottom: 6 },
  inp:       { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: fontSizes.md, marginBottom: 4 },
  err:       { fontSize: fontSizes.xs, marginBottom: 10 },
  chip:      { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1 },
  chipTxt:   { fontSize: fontSizes.sm },
});
