import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { parseMonto } from '../../constants/validation';
import { getGastos } from '../../services/gastos';
import { getIngresos } from '../../services/ingresos';
import { db } from '../../services/firebase';
import CreditGauge from '../../components/ui/CreditGauge';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { HP, fontSizes, radii } from '../../styles/theme';

function calcularPuntaje(gastos, ingresos, createdAt) {
  let score = 600;
  const tG = gastos.reduce((s, x) => {
    const m = parseMonto(x.monto);
    return m !== null ? s + m : s;
  }, 0);
  const tI = ingresos.reduce((s, x) => {
    const m = parseMonto(x.monto);
    return m !== null ? s + m : s;
  }, 0);
  if (tI > 0) {
    const r = tG / tI;
    if      (r < 0.4) score += 80;
    else if (r < 0.6) score += 40;
    else if (r < 0.8) score += 10;
    else if (r > 1.2) score -= 80;
    else if (r > 1.0) score -= 40;
  }
  const txn = gastos.length + ingresos.length;
  score += txn >= 20 ? 50 : txn >= 10 ? 25 : txn >= 5 ? 10 : 0;
  if (createdAt) {
    const meses = Math.floor((Date.now() - new Date(createdAt).getTime()) / 2592000000);
    score += Math.min(meses * 5, 100);
  }
  return Math.min(850, Math.max(400, Math.round(score / 10) * 10));
}

function MetricRow({ label, value, status, detail, colors }) {
  const statusColor =
    status === 'Bueno'   ? colors.success :
    status === 'Medio'   ? colors.warning :
    status === 'Nuevo'   ? colors.textMuted : colors.danger;

  return (
    <View style={[s.metricRow, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.metricLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[s.metricStatus, { color: statusColor }]}>{status}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.metricValue, { color: colors.text }]}>{value}</Text>
        {detail ? <Text style={[s.metricDetail, { color: statusColor }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

export default function CreditoScreen() {
  const { colors } = useTheme();
  const { user }   = useAuth();

  const [puntaje,  setPuntaje]  = useState(600);
  const [metricas, setMetricas] = useState(null);
  const [loading,  setLoading]  = useState(true);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const [gastos, ingresos, snap] = await Promise.all([
        getGastos(user.uid),
        getIngresos(user.uid),
        getDoc(doc(db, 'users', user.uid)),
      ]);
      const createdAt = snap.data()?.createdAt?.toDate?.();
      const score = calcularPuntaje(gastos, ingresos, createdAt);
      setPuntaje(score);

      const tG = gastos.reduce((s, x) => {
        const m = parseMonto(x.monto);
        return m !== null ? s + m : s;
      }, 0);
      const tI = ingresos.reduce((s, x) => {
        const m = parseMonto(x.monto);
        return m !== null ? s + m : s;
      }, 0);
      const ratio = tI > 0 ? tG / tI : 1;
      const meses = createdAt
        ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 2592000000)
        : 0;

      setMetricas({
        pagos:   { value: gastos.length ? '95%' : 'Sin datos', status: gastos.length ? 'Bueno' : 'Nuevo', detail: gastos.length ? `${gastos.length} registros` : '' },
        uso:     { value: tI > 0 ? `${Math.round(ratio * 100)}%` : 'Sin datos', status: ratio < 0.6 ? 'Bueno' : ratio < 0.9 ? 'Medio' : 'Alto', detail: ratio < 0.6 ? 'Uso saludable' : 'Revisar gastos' },
        edad:    { value: meses >= 12 ? `${Math.floor(meses / 12)} año(s)` : `${meses} mes(es)`, status: meses >= 6 ? 'Bueno' : meses >= 2 ? 'Medio' : 'Nuevo', detail: '' },
        historial:{ value: `${gastos.length + ingresos.length} mov.`, status: (gastos.length + ingresos.length) >= 10 ? 'Bueno' : 'En progreso', detail: 'Total de movimientos' },
      });
    } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

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
      <ScreenHeader
        title="Puntaje crediticio"
        subtitle="Estimado · Actualizado hoy"
      />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <View style={s.gaugeWrap}>
          <CreditGauge value={puntaje} delta={6} />
        </View>

        {metricas && (
          <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <MetricRow label="Pagos a tiempo"  value={metricas.pagos.value}    status={metricas.pagos.status}    detail={metricas.pagos.detail}     colors={colors} />
            <MetricRow label="Uso de crédito"  value={metricas.uso.value}      status={metricas.uso.status}      detail={metricas.uso.detail}       colors={colors} />
            <MetricRow label="Antigüedad"       value={metricas.edad.value}     status={metricas.edad.status}     detail={metricas.edad.detail}      colors={colors} />
            <MetricRow label="Historial"        value={metricas.historial.value} status={metricas.historial.status} detail={metricas.historial.detail} colors={colors} />
          </View>
        )}

        <View style={[s.disclaimer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[s.disclaimerTxt, { color: colors.textMuted }]}>
            Estimación basada en tus registros. No representa un score crediticio oficial.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  fill:        { flex: 1 },
  scroll:      { paddingHorizontal: HP },
  gaugeWrap:   { alignItems: 'center', paddingVertical: 24 },
  card:        { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  metricRow:   { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  metricLabel: { fontSize: fontSizes.md, fontWeight: '600', marginBottom: 2 },
  metricStatus:{ fontSize: fontSizes.sm, fontWeight: '500' },
  metricValue: { fontSize: fontSizes.md, fontWeight: '700' },
  metricDetail:{ fontSize: fontSizes.xs, marginTop: 2 },
  disclaimer:  { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radii.lg, borderWidth: 1, padding: 12 },
  disclaimerTxt:{ flex: 1, fontSize: fontSizes.xs, lineHeight: 18 },
});
