import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { getGastos } from '../../services/gastos';
import { getIngresos } from '../../services/ingresos';
import { getNotificaciones } from '../../services/notificaciones';
import SummaryCard from '../../components/ui/SummaryCard';
import TransactionItem from '../../components/ui/TransactionItem';
import EmptyState from '../../components/ui/EmptyState';
import { HP, HEADER_TOP, fontSizes, radii } from '../../styles/theme';

const MES = new Date().toISOString().slice(0, 7);

const ACCESOS = [
  { label: 'Gastos',      icon: 'trending-down-outline', route: '/(main)/gastos' },
  { label: 'Ingresos',    icon: 'trending-up-outline',   route: '/(main)/ingresos' },
  { label: 'Crédito',     icon: 'shield-checkmark-outline', route: '/(main)/credito' },
  { label: 'Inversiones', icon: 'bar-chart-outline',     route: '/(main)/inversiones' },
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const router     = useRouter();

  const [gastos,     setGastos]     = useState([]);
  const [ingresos,   setIngresos]   = useState([]);
  const [notifs,     setNotifs]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const [g, i, n] = await Promise.all([
        getGastos(user.uid),
        getIngresos(user.uid),
        getNotificaciones(user.uid),
      ]);
      setGastos(g); setIngresos(i); setNotifs(n);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const gastosMes     = gastos.filter(  (x) => x.fecha?.startsWith(MES));
  const ingresosMes   = ingresos.filter((x) => x.fecha?.startsWith(MES));
  const totalGastos   = gastosMes.reduce(  (s, x) => s + (x.monto || 0), 0);
  const totalIngresos = ingresosMes.reduce((s, x) => s + (x.monto || 0), 0);
  const saldo         = totalIngresos - totalGastos;
  const noLeidas      = notifs.filter((n) => !n.leida).length;
  const nombre        = user?.displayName?.split(' ')[0] || 'Usuario';

  const recientes = [
    ...gastos.map( (x) => ({ ...x, tipo: 'gasto' })),
    ...ingresos.map((x) => ({ ...x, tipo: 'ingreso' })),
  ]
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
    .slice(0, 5);

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[s.fill, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.statusBar} />

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: colors.bg, paddingTop: HEADER_TOP }]}>
        <View>
          <Text style={[s.saludo, { color: colors.textMuted }]}>
            {new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={[s.nombre, { color: colors.text }]}>Hola, {nombre}</Text>
        </View>
        <TouchableOpacity
          style={[s.bell, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
          onPress={() => router.push('/(main)/notificaciones')}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {noLeidas > 0 && (
            <View style={[s.badge, { backgroundColor: colors.danger }]}>
              <Text style={s.badgeTxt}>{noLeidas > 9 ? '9+' : noLeidas}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={colors.accent} />
        }
      >
        {/* ── Tarjeta de saldo ── */}
        <View style={[s.balanceCard, { backgroundColor: colors.accent }]}>
          <Text style={s.balanceLbl}>Saldo del mes</Text>
          <Text style={[s.balanceAmt, { color: saldo < 0 ? colors.danger : '#fff' }]}>
            {saldo < 0 ? '−' : ''}${Math.abs(saldo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </Text>
          <View style={s.summaryRow}>
            <SummaryCard label="Ingresos" amount={totalIngresos} icon="trending-up-outline" />
            <View style={{ width: 8 }} />
            <SummaryCard label="Gastos" amount={totalGastos} icon="trending-down-outline" />
          </View>
        </View>

        {/* ── Accesos rápidos ── */}
        <Text style={[s.sectionTitle, { color: colors.textMuted }]}>ACCESOS RÁPIDOS</Text>
        <View style={s.quickGrid}>
          {ACCESOS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[s.quickItem, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => router.push(a.route)}
            >
              <View style={[s.quickIconWrap, { backgroundColor: colors.bgSubtle }]}>
                <Ionicons name={a.icon} size={20} color={colors.accent} />
              </View>
              <Text style={[s.quickLabel, { color: colors.textSub }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Últimas transacciones ── */}
        <Text style={[s.sectionTitle, { color: colors.textMuted }]}>ÚLTIMOS MOVIMIENTOS</Text>
        {recientes.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Sin movimientos aún"
            subtitle="Agrega gastos o ingresos para ver tu historial"
          />
        ) : (
          recientes.map((item) => (
            <TransactionItem
              key={`${item.tipo}-${item.id}`}
              item={item}
              tipo={item.tipo}
              onDelete={null}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  fill:   { flex: 1 },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: HP,
    paddingBottom:     16,
  },
  saludo: { fontSize: fontSizes.xs, textTransform: 'capitalize', marginBottom: 2 },
  nombre: { fontSize: fontSizes.xl, fontWeight: '700' },
  bell: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, position: 'relative',
  },
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
  scroll:   { paddingHorizontal: HP },
  balanceCard: {
    borderRadius:  radii.xl,
    padding:       20,
    marginBottom:  24,
    shadowColor:   '#7c3aed',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius:  14,
    elevation:     10,
  },
  balanceLbl: { fontSize: fontSizes.xs, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  balanceAmt: { fontSize: 36, fontWeight: '800', marginBottom: 16 },
  summaryRow: { flexDirection: 'row' },
  sectionTitle: {
    fontSize:      fontSizes.xs,
    fontWeight:    '700',
    letterSpacing: 0.8,
    marginBottom:  10,
    marginTop:     4,
  },
  quickGrid: {
    flexDirection:   'row',
    flexWrap:        'wrap',
    gap:             8,
    marginBottom:    24,
  },
  quickItem: {
    width:         '47.5%',
    flexDirection: 'row',
    alignItems:    'center',
    borderRadius:  radii.lg,
    borderWidth:   1,
    padding:       14,
    gap:           10,
  },
  quickIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: fontSizes.sm, fontWeight: '500' },
});
