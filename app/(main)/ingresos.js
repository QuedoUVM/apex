import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, ActivityIndicator, StyleSheet, Alert, Platform,
} from 'react-native';
import Toast from '../../components/ui/Toast';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { getIngresos, addIngreso, deleteIngreso, CATEGORIAS_INGRESO } from '../../services/ingresos';
import TransactionItem from '../../components/ui/TransactionItem';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeader from '../../components/ui/ScreenHeader';
import AppButton from '../../components/ui/AppButton';
import { HP, fontSizes, radii } from '../../styles/theme';

const HOY = new Date().toISOString().slice(0, 10);
const INIT = { descripcion: '', monto: '', categoria: CATEGORIAS_INGRESO[0].label, fecha: HOY };

export default function IngresosScreen() {
  const { colors } = useTheme();
  const { user }   = useAuth();

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState(INIT);
  const [errors,  setErrors]  = useState({});
  const [toast,   setToast]   = useState(null);
  const isSubmitting = useRef(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    try { setItems(await getIngresos(user.uid)); } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const set = (f) => (v) => { setForm((p) => ({ ...p, [f]: v })); setErrors((p) => ({ ...p, [f]: '' })); };

  const validar = () => {
    const e = {};
    if (!form.descripcion.trim())                              e.descripcion = 'Campo requerido';
    if (!form.monto || isNaN(form.monto) || +form.monto <= 0) e.monto       = 'Monto inválido';
    if (!form.fecha.match(/^\d{4}-\d{2}-\d{2}$/))             e.fecha       = 'Formato: AAAA-MM-DD';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return;
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setSaving(true);
    try {
      const cat = CATEGORIAS_INGRESO.find((c) => c.label === form.categoria);
      await addIngreso(user.uid, { ...form, icon: cat?.icon });
      setForm(INIT); setModal(false); cargar();
      setToast({ message: 'Ingreso guardado', type: 'success' });
    } catch { Alert.alert('Error', 'No se pudo guardar el ingreso.'); }
    finally { setSaving(false); isSubmitting.current = false; }
  };

  const eliminar = async (id) => {
    try {
      await deleteIngreso(user.uid, id);
      setItems((p) => p.filter((x) => x.id !== id));
      setToast({ message: 'Ingreso eliminado', type: 'success' });
    }
    catch { Alert.alert('Error', 'No se pudo eliminar.'); }
  };

  const total = items.reduce((s, x) => s + (x.monto || 0), 0);

  const AddBtn = (
    <TouchableOpacity
      style={[s.fab, { backgroundColor: colors.success }]}
      onPress={() => setModal(true)}
    >
      <Ionicons name="add" size={22} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <View style={[s.fill, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.statusBar} />
      <ScreenHeader title="Ingresos" right={AddBtn} />

      <View style={[s.resumen, { backgroundColor: colors.bgCard, borderColor: colors.border, marginHorizontal: HP }]}>
        <Text style={[s.resumenLbl, { color: colors.textMuted }]}>Total registrado</Text>
        <Text style={[s.resumenAmt, { color: colors.success }]}>
          +${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={[s.list, { paddingBottom: 100 }]}
          renderItem={({ item }) => (
            <TransactionItem item={item} tipo="ingreso" onDelete={eliminar} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="trending-up-outline"
              title="Sin ingresos registrados"
              subtitle="Toca + para agregar tu primer ingreso"
            />
          }
        />
      )}

      <Toast config={toast} onHide={() => setToast(null)} />

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.bgCard }]}>
            <View style={s.sheetHandle} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Nuevo ingreso</Text>

            <Text style={[s.lbl, { color: colors.textSub }]}>Descripción</Text>
            <TextInput
              style={[s.inp, { backgroundColor: colors.bgInput, borderColor: errors.descripcion ? colors.danger : colors.border, color: colors.text }]}
              placeholder="Ej. Quincena, cliente…"
              placeholderTextColor={colors.textMuted}
              value={form.descripcion}
              onChangeText={set('descripcion')}
            />
            {errors.descripcion ? <Text style={[s.err, { color: colors.danger }]}>{errors.descripcion}</Text> : null}

            <Text style={[s.lbl, { color: colors.textSub }]}>Monto ($)</Text>
            <TextInput
              style={[s.inp, { backgroundColor: colors.bgInput, borderColor: errors.monto ? colors.danger : colors.border, color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={form.monto}
              onChangeText={set('monto')}
            />
            {errors.monto ? <Text style={[s.err, { color: colors.danger }]}>{errors.monto}</Text> : null}

            <Text style={[s.lbl, { color: colors.textSub }]}>Fecha</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[s.inp, { flex: 1, backgroundColor: colors.bgInput, borderColor: errors.fecha ? colors.danger : colors.border, color: colors.text }]}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={form.fecha}
                onChangeText={set('fecha')}
                keyboardType="numeric"
                maxLength={10}
              />
              <TouchableOpacity
                style={{ padding: 8, backgroundColor: colors.success, borderRadius: 8 }}
                onPress={() => {
                  const d = new Date();
                  const yyyy = d.getFullYear();
                  const mm = String(d.getMonth() + 1).padStart(2, '0');
                  const dd = String(d.getDate()).padStart(2, '0');
                  set('fecha')(`${yyyy}-${mm}-${dd}`);
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Hoy</Text>
              </TouchableOpacity>
            </View>
            {errors.fecha ? <Text style={[s.err, { color: colors.danger }]}>{errors.fecha}</Text> : null}

            <Text style={[s.lbl, { color: colors.textSub }]}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {CATEGORIAS_INGRESO.map((cat) => {
                const active = form.categoria === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    style={[s.chip, {
                      backgroundColor: active ? colors.successLight : colors.bgSubtle,
                      borderColor:     active ? colors.success      : colors.border,
                    }]}
                    onPress={() => set('categoria')(cat.label)}
                  >
                    <Ionicons name={cat.icon} size={14} color={active ? colors.success : colors.textMuted} style={{ marginRight: 5 }} />
                    <Text style={[s.chipTxt, { color: active ? colors.success : colors.textSub }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <AppButton title="Guardar ingreso" onPress={guardar} loading={saving} />
            <AppButton
              title="Cancelar" variant="ghost"
              onPress={() => { setModal(false); setForm(INIT); setErrors({}); }}
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
  resumen:     { borderRadius: radii.lg, borderWidth: 1, padding: 16, marginBottom: 16 },
  resumenLbl:  { fontSize: fontSizes.xs, marginBottom: 4 },
  resumenAmt:  { fontSize: 26, fontWeight: '800' },
  fab:         { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  list:        { paddingHorizontal: HP },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: fontSizes.lg, fontWeight: '700', marginBottom: 16 },
  lbl:         { fontSize: fontSizes.sm, fontWeight: '500', marginBottom: 6 },
  inp:         { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: fontSizes.md, marginBottom: 4 },
  err:         { fontSize: fontSizes.xs, marginBottom: 10 },
  chip:        { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1 },
  chipTxt:     { fontSize: fontSizes.sm },
});
