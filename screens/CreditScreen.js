import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { C } from '../theme';
import { DEFAULT, FIELDS, calcScore, scoreColor, scoreLabel, scoreAdvice } from '../creditUtils';

export default function CreditScreen() {
  const [profile, setProfile] = useState(DEFAULT);
  const [modal, setModal]     = useState(false);
  const [draft, setDraft]     = useState(DEFAULT);

  useFocusEffect(useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'athena_users', uid)).then(snap => {
      const p = snap.data()?.creditProfile;
      if (p) { setProfile(p); setDraft(p); }
    }).catch(() => {});
  }, []));

  const saveProfile = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setProfile(draft);
    try {
      await setDoc(doc(db, 'athena_users', uid), { creditProfile: draft }, { merge: true });
    } catch (_) {}
    setModal(false);
  };

  const score  = calcScore(profile);
  const color  = scoreColor(score);
  const label  = scoreLabel(score);
  const advice = scoreAdvice(score);
  const pct    = (score - 400) / 450; // 0-1

  const WEIGHTS = [
    { label: 'Historial de pagos',     weight: 35, value: Math.round(profile.paymentHistory) + '%', good: profile.paymentHistory >= 90 },
    { label: 'Utilización de crédito', weight: 30, value: Math.round(profile.utilization) + '%',    good: profile.utilization <= 30 },
    { label: 'Antigüedad crediticia',  weight: 15, value: profile.creditAge + ' años',              good: profile.creditAge >= 5 },
    { label: 'Mix de crédito',         weight: 10, value: profile.creditTypes + ' tipos',           good: profile.creditTypes >= 2 },
    { label: 'Nuevas solicitudes',     weight: 10, value: profile.newApplications + ' en 12m',      good: profile.newApplications <= 2 },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Score Crediticio</Text>
          <Text style={s.subtitle}>Estimación Buró de Crédito · MX</Text>
        </View>

        {/* Big score display */}
        <View style={[s.scoreCard, { borderColor: color + '44' }]}>
          <View style={[s.scoreRing, { borderColor: color, shadowColor: color }]}>
            <Text style={[s.scoreNum, { color }]}>{score}</Text>
            <Text style={s.scoreRange}>de 850</Text>
          </View>
          <Text style={[s.scoreLabel, { color }]}>{label}</Text>

          {/* Progress bar */}
          <View style={s.barWrap}>
            <View style={s.barTrack}>
              {['#EF4444','#FB923C',C.yellow,'#A3E635',C.green].map((c, i) => (
                <View key={i} style={[s.barSegment, { backgroundColor: c }]} />
              ))}
              <View style={[s.barPointer, { left: `${Math.round(pct * 100)}%`, borderColor: color }]} />
            </View>
            <View style={s.barLabels}>
              <Text style={s.barLabel}>400</Text>
              <Text style={s.barLabel}>580</Text>
              <Text style={s.barLabel}>700</Text>
              <Text style={s.barLabel}>800</Text>
              <Text style={s.barLabel}>850</Text>
            </View>
          </View>
        </View>

        {/* Advice */}
        <View style={[s.adviceCard, { borderColor: color + '33' }]}>
          <Ionicons name="bulb-outline" size={18} color={color} />
          <Text style={s.adviceText}>{advice}</Text>
        </View>

        {/* Factor breakdown */}
        <Text style={s.sectionTitle}>Factores de tu score</Text>
        {WEIGHTS.map(w => (
          <View key={w.label} style={s.factorRow}>
            <View style={s.factorLeft}>
              <Ionicons name={w.good ? 'checkmark-circle' : 'alert-circle'} size={18} color={w.good ? C.green : C.yellow} />
              <View style={{ marginLeft: 10 }}>
                <Text style={s.factorLabel}>{w.label}</Text>
                <Text style={s.factorValue}>{w.value}</Text>
              </View>
            </View>
            <View style={s.weightBadge}>
              <Text style={s.weightText}>{w.weight}%</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={s.editBtn} onPress={() => { setDraft(profile); setModal(true); }}>
          <Ionicons name="create-outline" size={18} color="#FFF" />
          <Text style={s.editBtnText}>Actualizar mi información</Text>
        </TouchableOpacity>

        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>* Esta es una estimación basada en los parámetros de Buró de Crédito México. Tu score real puede variar. Consulta burodecredito.com.mx para tu reporte oficial.</Text>
        </View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={modal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={s.modalWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Mi perfil crediticio</Text>
            <TouchableOpacity onPress={() => setModal(false)}>
              <Ionicons name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {FIELDS.map(f => (
              <View key={f.key} style={{ marginBottom: 20 }}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <Text style={s.fieldTip}>{f.tip}</Text>
                <View style={s.fieldRow}>
                  <TextInput
                    style={s.fieldInput}
                    keyboardType="numeric"
                    value={String(draft[f.key])}
                    onChangeText={v => {
                      const n = parseFloat(v) || 0;
                      setDraft(d => ({ ...d, [f.key]: Math.min(Math.max(n, f.min), f.max) }));
                    }}
                  />
                  <Text style={s.fieldUnit}>{f.unit || 'unidades'}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.saveBtn} onPress={saveProfile}>
              <Text style={s.saveBtnText}>Guardar y recalcular</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  scroll:   { padding: 20 },
  header:   { marginBottom: 20 },
  title:    { color: C.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.muted, fontSize: 13, marginTop: 2 },

  scoreCard: { backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center', marginBottom: 16 },
  scoreRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 0 }, shadowRadius: 20, elevation: 10 },
  scoreNum:  { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  scoreRange:{ color: C.muted, fontSize: 13, marginTop: -4 },
  scoreLabel:{ fontSize: 18, fontWeight: '700', marginBottom: 20 },

  barWrap:    { width: '100%' },
  barTrack:   { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'visible', position: 'relative', marginBottom: 6 },
  barSegment: { flex: 1 },
  barPointer: { position: 'absolute', top: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.bgBase, borderWidth: 3, marginLeft: -8 },
  barLabels:  { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel:   { color: C.muted, fontSize: 10 },

  adviceCard: { flexDirection: 'row', gap: 12, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24, alignItems: 'flex-start' },
  adviceText: { color: C.text, fontSize: 13, lineHeight: 20, flex: 1 },

  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  factorRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline },
  factorLeft:  { flexDirection: 'row', alignItems: 'center' },
  factorLabel: { color: C.text, fontSize: 14, fontWeight: '500' },
  factorValue: { color: C.muted, fontSize: 12, marginTop: 2 },
  weightBadge: { backgroundColor: C.purpleLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  weightText:  { color: C.purple, fontSize: 12, fontWeight: '700' },

  editBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.purple, borderRadius: 16, paddingVertical: 14, marginTop: 24, marginBottom: 16 },
  editBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  disclaimer:     { paddingBottom: 20 },
  disclaimerText: { color: C.muted, fontSize: 11, lineHeight: 16 },

  modalWrap:   { flex: 1, backgroundColor: C.bgBase, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  modalTitle:  { color: C.text, fontSize: 20, fontWeight: '700' },

  fieldLabel: { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  fieldTip:   { color: C.muted, fontSize: 12, marginBottom: 8, lineHeight: 16 },
  fieldRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldInput: { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: C.text, fontWeight: '700' },
  fieldUnit:  { color: C.muted, fontSize: 13 },

  saveBtn:     { backgroundColor: C.purple, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
