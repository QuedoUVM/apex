import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, fmt } from '../theme';

// Compound interest: A = P(1+r)^n + PMT * [((1+r)^n - 1) / r]
function compound(principal, monthly, annualRate, years) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal + monthly * n;
  return principal * Math.pow(1 + r, n) + monthly * (Math.pow(1 + r, n) - 1) / r;
}

const INSTRUMENTS = [
  { name: 'CETES Directo',      rate: 10.5, risk: 'Bajo',   icon: '🏛️', color: '#60A5FA' },
  { name: 'SOFIPOS',            rate: 12.0, risk: 'Bajo',   icon: '🏦', color: '#34D399' },
  { name: 'Fondo gubernamental',rate:  9.0, risk: 'Bajo',   icon: '📋', color: '#A78BFA' },
  { name: 'S&P 500 (histórico)',rate: 10.0, risk: 'Medio',  icon: '🇺🇸', color: '#FBBF24' },
  { name: 'BMV / IPC (histórico)',rate: 7.0,risk: 'Medio',  icon: '📈', color: '#F97316' },
  { name: 'Cuenta bancaria',    rate:  4.0, risk: 'Bajo',   icon: '🏧', color: '#94A3B8' },
  { name: 'Bajo el colchón',    rate:  0.0, risk: 'Ninguno',icon: '🛏️', color: '#475569' },
];

const riskColor = { 'Bajo': C.green, 'Medio': C.yellow, 'Alto': C.red, 'Ninguno': C.muted };

export default function InvestScreen() {
  const [principal, setPrincipal] = useState('10000');
  const [monthly,   setMonthly]   = useState('1000');
  const [rate,      setRate]      = useState('10.5');
  const [years,     setYears]     = useState('5');

  const P   = parseFloat(principal.replace(/,/g, '')) || 0;
  const PMT = parseFloat(monthly.replace(/,/g, ''))   || 0;
  const R   = parseFloat(rate)    || 0;
  const Y   = parseInt(years)     || 1;

  const finalValue   = compound(P, PMT, R, Y);
  const totalDeposit = P + PMT * Y * 12;
  const gain         = finalValue - totalDeposit;
  const roi          = totalDeposit > 0 ? (gain / totalDeposit) * 100 : 0;

  const Field = ({ label, value, onChangeText, suffix }) => (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          value={value}
          onChangeText={onChangeText}
          selectTextOnFocus
        />
        {suffix && <Text style={s.suffix}>{suffix}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={s.header}>
            <Text style={s.title}>Calculadora de Inversión</Text>
            <Text style={s.subtitle}>Proyección con interés compuesto</Text>
          </View>

          {/* Inputs */}
          <View style={s.card}>
            <View style={s.fieldsRow}>
              <View style={{ flex: 1 }}>
                <Field label="Inversión inicial" value={principal} onChangeText={setPrincipal} suffix="MXN" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Aportación mensual" value={monthly} onChangeText={setMonthly} suffix="MXN" />
              </View>
            </View>
            <View style={s.fieldsRow}>
              <View style={{ flex: 1 }}>
                <Field label="Tasa anual" value={rate} onChangeText={setRate} suffix="%" />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Field label="Plazo" value={years} onChangeText={setYears} suffix="años" />
              </View>
            </View>
          </View>

          {/* Result */}
          <View style={[s.resultCard, { borderColor: gain >= 0 ? C.green + '44' : C.red + '44' }]}>
            <Text style={s.resultMainLabel}>Valor proyectado</Text>
            <Text style={[s.resultMain, { color: C.green }]}>{fmt(finalValue)}</Text>

            <View style={s.resultDivider} />

            <View style={s.resultRow}>
              <View style={s.resultItem}>
                <Text style={s.resultLabel}>Total aportado</Text>
                <Text style={s.resultValue}>{fmt(totalDeposit)}</Text>
              </View>
              <View style={s.resultItem}>
                <Text style={s.resultLabel}>Ganancia</Text>
                <Text style={[s.resultValue, { color: gain >= 0 ? C.green : C.red }]}>{fmt(gain)}</Text>
              </View>
              <View style={s.resultItem}>
                <Text style={s.resultLabel}>ROI</Text>
                <Text style={[s.resultValue, { color: gain >= 0 ? C.green : C.red }]}>{roi.toFixed(1)}%</Text>
              </View>
            </View>
          </View>

          {/* Instrument comparison */}
          <Text style={s.sectionTitle}>Comparativa de instrumentos</Text>
          <Text style={s.sectionSub}>Con {fmt(P)} inicial + {fmt(PMT)}/mes por {Y} años</Text>

          {INSTRUMENTS.map(inst => {
            const val  = compound(P, PMT, inst.rate, Y);
            const gain = val - totalDeposit;
            return (
              <TouchableOpacity
                key={inst.name}
                style={[s.instRow, rate === String(inst.rate) && { borderColor: inst.color + '66', backgroundColor: inst.color + '0A' }]}
                onPress={() => setRate(String(inst.rate))}
                activeOpacity={0.7}
              >
                <Text style={s.instIcon}>{inst.icon}</Text>
                <View style={s.instInfo}>
                  <Text style={s.instName}>{inst.name}</Text>
                  <View style={s.instMeta}>
                    <Text style={[s.instRate, { color: inst.color }]}>{inst.rate}% anual</Text>
                    <View style={[s.riskBadge, { backgroundColor: riskColor[inst.risk] + '22' }]}>
                      <Text style={[s.riskText, { color: riskColor[inst.risk] }]}>Riesgo {inst.risk}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.instResult}>
                  <Text style={[s.instFinal, { color: inst.color }]}>{fmt(val)}</Text>
                  <Text style={[s.instGain, { color: gain >= 0 ? C.green : C.red }]}>
                    {gain >= 0 ? '+' : ''}{fmt(gain)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={s.disclaimer}>
            <Ionicons name="information-circle-outline" size={14} color={C.muted} />
            <Text style={s.disclaimerText}> Las tasas históricas no garantizan rendimientos futuros. CETES y SOFIPOS son las opciones más seguras para inversionistas en México. Consulta a un asesor financiero certificado antes de invertir.</Text>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20 },

  header:   { marginBottom: 20 },
  title:    { color: C.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 2 },

  card:      { backgroundColor: C.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 16, marginBottom: 16 },
  fieldsRow: { flexDirection: 'row', marginBottom: 12 },

  field:       { marginBottom: 4 },
  fieldLabel:  { color: C.muted, fontSize: 12, fontWeight: '500', marginBottom: 6 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgBase, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 12 },
  input:       { flex: 1, color: C.text, fontSize: 16, fontWeight: '700', paddingVertical: 12 },
  suffix:      { color: C.muted, fontSize: 12, marginLeft: 4 },

  resultCard:     { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24, alignItems: 'center' },
  resultMainLabel:{ color: C.muted, fontSize: 13, marginBottom: 6 },
  resultMain:     { fontSize: 36, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },
  resultDivider:  { width: '100%', height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginBottom: 16 },
  resultRow:      { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  resultItem:     { alignItems: 'center' },
  resultLabel:    { color: C.muted, fontSize: 11, marginBottom: 4 },
  resultValue:    { color: C.text, fontSize: 15, fontWeight: '700' },

  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSub:   { color: C.muted, fontSize: 12, marginBottom: 16 },

  instRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 14, marginBottom: 8 },
  instIcon:  { fontSize: 24, marginRight: 12 },
  instInfo:  { flex: 1 },
  instName:  { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  instMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  instRate:  { fontSize: 12, fontWeight: '700' },
  riskBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  riskText:  { fontSize: 10, fontWeight: '600' },
  instResult:{ alignItems: 'flex-end' },
  instFinal: { fontSize: 14, fontWeight: '700' },
  instGain:  { fontSize: 11, marginTop: 2 },

  disclaimer:     { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  disclaimerText: { color: C.muted, fontSize: 11, lineHeight: 16, flex: 1 },
});
