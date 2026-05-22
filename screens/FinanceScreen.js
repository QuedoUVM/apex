import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection, doc, addDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { C, fmt } from '../theme';

const INCOME_CATS  = ['💼 Nómina','🎯 Freelance','📈 Inversiones','🏠 Renta','🎁 Regalo','➕ Otro'];
const EXPENSE_CATS = ['🍔 Comida','🚗 Transporte','🎬 Entretenimiento','💊 Salud','🏠 Hogar','📱 Servicios','👕 Ropa','📚 Educación','💳 Deudas','➕ Otro'];

// Convierte Timestamp de Firestore o string ISO a Date
const toDate = (d) => d?.toDate?.() ?? new Date(d);

function emojiFrom(cat) { return cat.split(' ')[0]; }

function txsRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return collection(db, 'athena_users', uid, 'transactions');
}

export default function FinanceScreen() {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modal,  setModal]  = useState(false);
  const [type,   setType]   = useState('expense');
  const [amount, setAmount] = useState('');
  const [desc,   setDesc]   = useState('');
  const [cat,    setCat]    = useState('');

  // ── carga desde Firestore ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    const ref = txsRef();
    if (!ref) return;
    try {
      const snap = await getDocs(query(ref, orderBy('date', 'desc')));
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (_) {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── agregar transacción ────────────────────────────────────────────────────
  const addTransaction = async () => {
    const n = parseFloat(amount.replace(/,/g, ''));
    if (!n || n <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.');
    if (!cat)         return Alert.alert('Categoría',     'Selecciona una categoría.');
    const ref = txsRef();
    if (!ref) return;
    const entry = {
      type,
      amount:      n,
      description: desc.trim() || cat,
      category:    cat,
      emoji:       emojiFrom(cat),
      date:        serverTimestamp(),
    };
    try {
      await addDoc(ref, entry);
      await load();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el movimiento.');
    }
    setModal(false);
    setAmount(''); setDesc(''); setCat('');
  };

  // ── eliminar transacción ───────────────────────────────────────────────────
  const deleteTransaction = (id) => {
    Alert.alert('Eliminar', '¿Eliminar este movimiento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        try {
          await deleteDoc(doc(db, 'athena_users', uid, 'transactions', id));
          setTransactions(prev => prev.filter(t => t.id !== id));
        } catch (_) {}
      }},
    ]);
  };

  // ── cálculos del mes ───────────────────────────────────────────────────────
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = toDate(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income  = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const visible = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
  const cats    = type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Mis Finanzas</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Resumen del mes */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderColor: C.greenLight }]}>
          <Text style={s.summaryLabel}>Ingresos</Text>
          <Text style={[s.summaryAmt, { color: C.green }]}>{fmt(income)}</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: C.redLight }]}>
          <Text style={s.summaryLabel}>Gastos</Text>
          <Text style={[s.summaryAmt, { color: C.red }]}>{fmt(expense)}</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: C.purpleLight }]}>
          <Text style={s.summaryLabel}>Balance</Text>
          <Text style={[s.summaryAmt, { color: income - expense >= 0 ? C.green : C.red }]}>{fmt(income - expense)}</Text>
        </View>
      </View>

      {/* Tabs de filtro */}
      <View style={s.tabs}>
        {[['all','Todos'],['income','Ingresos'],['expense','Gastos']].map(([v, label]) => (
          <TouchableOpacity key={v} style={[s.tab, filter === v && s.tabActive]} onPress={() => setFilter(v)}>
            <Text style={[s.tabText, filter === v && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={visible}
        keyExtractor={i => i.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={40} color={C.muted} />
            <Text style={s.emptyText}>Sin movimientos</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.txRow} onLongPress={() => deleteTransaction(item.id)} activeOpacity={0.7}>
            <View style={[s.txIcon, { backgroundColor: item.type === 'income' ? C.greenLight : C.redLight }]}>
              <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
            </View>
            <View style={s.txInfo}>
              <Text style={s.txDesc}>{item.description}</Text>
              <Text style={s.txMeta}>{item.category} · {toDate(item.date).toLocaleDateString('es-MX')}</Text>
            </View>
            <Text style={[s.txAmt, { color: item.type === 'income' ? C.green : C.red }]}>
              {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Modal: nuevo movimiento */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={s.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Nuevo movimiento</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Tipo */}
          <View style={s.typeRow}>
            {[['expense','Gasto',C.red],['income','Ingreso',C.green]].map(([v, label, color]) => (
              <TouchableOpacity key={v}
                style={[s.typeBtn, type === v && { backgroundColor: color + '22', borderColor: color }]}
                onPress={() => { setType(v); setCat(''); }}>
                <Text style={[s.typeBtnText, type === v && { color }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.fieldLabel}>Monto (MXN)</Text>
          <TextInput style={s.amountInput} placeholder="0" placeholderTextColor={C.muted}
            keyboardType="numeric" value={amount} onChangeText={setAmount} />

          <Text style={s.fieldLabel}>Descripción (opcional)</Text>
          <TextInput style={s.textInput} placeholder="Ej. Súper del sábado"
            placeholderTextColor={C.muted} value={desc} onChangeText={setDesc} />

          <Text style={s.fieldLabel}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {cats.map(c => (
                <TouchableOpacity key={c} style={[s.catChip, cat === c && s.catChipActive]} onPress={() => setCat(c)}>
                  <Text style={[s.catChipText, cat === c && { color: C.purple }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={s.confirmBtn} onPress={addTransaction}>
            <Text style={s.confirmText}>Guardar movimiento</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  header:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  addBtn:{ backgroundColor: C.purple, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  summaryRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  summaryCard:  { flex: 1, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
  summaryLabel: { color: C.muted, fontSize: 11, marginBottom: 4 },
  summaryAmt:   { fontSize: 14, fontWeight: '700' },

  tabs:         { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: C.surface, borderRadius: 12, padding: 3 },
  tab:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:    { backgroundColor: C.purple },
  tabText:      { color: C.muted, fontSize: 13, fontWeight: '600' },
  tabTextActive:{ color: '#FFF' },

  list:     { paddingHorizontal: 16, paddingBottom: 20 },
  empty:    { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:{ color: C.muted, fontSize: 14 },

  txRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo: { flex: 1 },
  txDesc: { color: C.text, fontSize: 14, fontWeight: '600' },
  txMeta: { color: C.muted, fontSize: 11, marginTop: 2 },
  txAmt:  { fontSize: 14, fontWeight: '700' },

  modalWrap:   { flex: 1, backgroundColor: C.bgBase, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle:  { color: C.text, fontSize: 20, fontWeight: '700' },

  typeRow:    { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn:    { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.surface },
  typeBtnText:{ color: C.muted, fontWeight: '600', fontSize: 15 },

  fieldLabel:  { color: C.muted, fontSize: 13, fontWeight: '500', marginBottom: 8 },
  amountInput: { backgroundColor: C.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 28, color: C.text, fontWeight: '700', marginBottom: 16 },
  textInput:   { backgroundColor: C.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.text, marginBottom: 16 },

  catChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  catChipActive:{ borderColor: C.purple, backgroundColor: C.purpleLight },
  catChipText:  { color: C.muted, fontSize: 13 },

  confirmBtn:  { backgroundColor: C.purple, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  confirmText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
