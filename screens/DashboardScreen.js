import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, doc, getDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { C, fmt } from '../theme';
import { calcScore, scoreColor, scoreLabel } from '../creditUtils';
import ProfileScreen from './ProfileScreen';

const toDate = (d) => d?.toDate?.() ?? new Date(d);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function Avatar({ name, size = 34 }) {
  const initials = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
  return (
    <View style={[s.avatarBtn, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.avatarInitials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [transactions,   setTransactions]   = useState([]);
  const [creditProfile,  setCreditProfile]  = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const user        = auth.currentUser;
  const firstName   = (user?.displayName ?? '').split(' ')[0] || null;

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [txSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'athena_users', uid, 'transactions'), orderBy('date', 'desc'))),
        getDoc(doc(db, 'athena_users', uid)),
      ]);
      setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCreditProfile(userSnap.data()?.creditProfile ?? null);
    } catch (_) {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = toDate(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income  = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const score   = calcScore(creditProfile);
  const recent  = transactions.slice(0, 5); // already ordered desc from Firestore

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</Text>
            <Text style={s.sub}>Tu asistente financiero personal</Text>
          </View>
          <TouchableOpacity onPress={() => setProfileVisible(true)} hitSlop={8} accessibilityLabel="Mi perfil">
            <Avatar name={user?.displayName} />
          </TouchableOpacity>
        </View>

        {/* Balance principal */}
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Balance del mes</Text>
          <Text style={[s.balanceAmount, { color: balance >= 0 ? C.green : C.red }]}>
            {fmt(balance)}
          </Text>
          <Text style={s.balanceSub}>
            {now.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* Stats row */}
        <View style={s.row}>
          <TouchableOpacity style={[s.statCard, { flex: 1 }]} onPress={() => navigation.navigate('Finanzas')}>
            <Ionicons name="arrow-up-circle" size={22} color={C.green} />
            <Text style={s.statLabel}>Ingresos</Text>
            <Text style={[s.statAmount, { color: C.green }]}>{fmt(income)}</Text>
          </TouchableOpacity>
          <View style={{ width: 12 }} />
          <TouchableOpacity style={[s.statCard, { flex: 1 }]} onPress={() => navigation.navigate('Finanzas')}>
            <Ionicons name="arrow-down-circle" size={22} color={C.red} />
            <Text style={s.statLabel}>Gastos</Text>
            <Text style={[s.statAmount, { color: C.red }]}>{fmt(expense)}</Text>
          </TouchableOpacity>
        </View>

        {/* Credit score mini card */}
        <TouchableOpacity style={s.creditCard} onPress={() => navigation.navigate('Crédito')}>
          <View style={s.creditLeft}>
            <Ionicons name="shield-checkmark" size={20} color={score ? scoreColor(score) : C.muted} />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.creditLabel}>Score Buró de Crédito</Text>
              {score
                ? <Text style={[s.creditScore, { color: scoreColor(score) }]}>{score} · {scoreLabel(score)}</Text>
                : <Text style={s.creditEmpty}>Toca para calcular tu score</Text>
              }
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>

        {/* Quick actions */}
        <Text style={s.sectionTitle}>Acciones rápidas</Text>
        <View style={s.row}>
          {[
            { icon: 'add-circle',   label: 'Agregar\ntransacción', screen: 'Finanzas',  color: C.purple },
            { icon: 'chatbubbles',  label: 'Hablar con\nAthena',   screen: 'Athena',    color: C.blue },
            { icon: 'trending-up',  label: 'Calcular\ninversión',  screen: 'Inversión', color: C.green },
          ].map(({ icon, label, screen, color }) => (
            <TouchableOpacity key={screen} style={s.quickBtn} onPress={() => navigation.navigate(screen)}>
              <Ionicons name={icon} size={26} color={color} />
              <Text style={s.quickLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent transactions */}
        <Text style={s.sectionTitle}>Movimientos recientes</Text>
        {recent.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="receipt-outline" size={36} color={C.muted} />
            <Text style={s.emptyText}>Sin movimientos aún</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Finanzas')}>
              <Text style={s.emptyLink}>Agregar el primero</Text>
            </TouchableOpacity>
          </View>
        ) : recent.map(t => (
          <View key={t.id} style={s.txRow}>
            <View style={[s.txIcon, { backgroundColor: t.type === 'income' ? C.greenLight : C.redLight }]}>
              <Text style={s.txEmoji}>{t.emoji}</Text>
            </View>
            <View style={s.txInfo}>
              <Text style={s.txDesc}>{t.description}</Text>
              <Text style={s.txCat}>{t.category}</Text>
            </View>
            <Text style={[s.txAmount, { color: t.type === 'income' ? C.green : C.red }]}>
              {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
            </Text>
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Profile modal */}
      <Modal visible={profileVisible} animationType="slide" presentationStyle="pageSheet"
        onRequestClose={() => setProfileVisible(false)}>
        <ProfileScreen onClose={() => setProfileVisible(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting:    { color: C.text, fontSize: 21, fontWeight: '700' },
  sub:         { color: C.muted, fontSize: 13, marginTop: 2 },

  avatarBtn:      { backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.purple + '66' },
  avatarInitials: { color: C.purple, fontWeight: '800', letterSpacing: 0.5 },

  balanceCard:   { backgroundColor: C.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 24, alignItems: 'center', marginBottom: 16 },
  balanceLabel:  { color: C.muted, fontSize: 13, marginBottom: 6 },
  balanceAmount: { fontSize: 38, fontWeight: '800', letterSpacing: -1 },
  balanceSub:    { color: C.muted, fontSize: 12, marginTop: 4, textTransform: 'capitalize' },

  row:      { flexDirection: 'row', marginBottom: 16 },
  statCard: { backgroundColor: C.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 16, gap: 6 },
  statLabel:  { color: C.muted, fontSize: 12 },
  statAmount: { fontSize: 18, fontWeight: '700' },

  creditCard:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 16, marginBottom: 24 },
  creditLeft:  { flexDirection: 'row', alignItems: 'center' },
  creditLabel: { color: C.muted, fontSize: 12, marginBottom: 3 },
  creditScore: { fontSize: 15, fontWeight: '700' },
  creditEmpty: { color: C.purple, fontSize: 13 },

  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  quickBtn:   { flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 14, alignItems: 'center', gap: 8, marginHorizontal: 4 },
  quickLabel: { color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 15 },

  empty:     { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { color: C.muted, fontSize: 14 },
  emptyLink: { color: C.purple, fontSize: 14, fontWeight: '600' },

  txRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  txIcon:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txEmoji:  { fontSize: 20 },
  txInfo:   { flex: 1 },
  txDesc:   { color: C.text, fontSize: 14, fontWeight: '600' },
  txCat:    { color: C.muted, fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' },
});
