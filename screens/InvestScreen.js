import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { API_URL, FETCH_TIMEOUT_MS } from '../config';
import { C, fmt } from '../theme';
import { calcScore } from '../creditUtils';

// ── Math ──────────────────────────────────────────────────────────────────────
function compound(P, annualRate, days) {
  const years = days / 365;
  const r = annualRate / 100;
  return P * Math.pow(1 + r, years);
}

function daysSince(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return Math.max(1, (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Catalogue ─────────────────────────────────────────────────────────────────
const INSTRUMENTS = [
  {
    id: 'cetes28',
    name: 'CETES 28 días',
    rate: 10.5,
    risk: 'Bajo',
    icon: 'business-outline',
    color: '#60A5FA',
    minAmount: 100,
    desc: 'Deuda del gobierno mexicano. El instrumento más seguro. Libre de ISR hasta $28,736 MXN al año.',
    ideal: 'Ahorro de corto plazo o fondo de emergencia.',
  },
  {
    id: 'cetes364',
    name: 'CETES 364 días',
    rate: 11.0,
    risk: 'Bajo',
    icon: 'business-outline',
    color: '#93C5FD',
    minAmount: 100,
    desc: 'Mayor plazo que CETES 28d, mayor tasa. Perfecto si no necesitarás el dinero en un año.',
    ideal: 'Dinero que no necesitas en 12 meses.',
  },
  {
    id: 'sofipo',
    name: 'SOFIPO',
    rate: 12.5,
    risk: 'Bajo',
    icon: 'shield-checkmark-outline',
    color: '#34D399',
    minAmount: 500,
    desc: 'Protegida por PROSOFIPO hasta $175,000 MXN. Tasa más alta que CETES con casi el mismo riesgo.',
    ideal: 'Mejor tasa conservando seguridad.',
  },
  {
    id: 'fondogub',
    name: 'Fondo gubernamental',
    rate: 9.0,
    risk: 'Bajo',
    icon: 'document-text-outline',
    color: '#A78BFA',
    minAmount: 1000,
    desc: 'Fondos de inversión en deuda del gobierno. Alta liquidez — puedes salir en 24-48 hrs.',
    ideal: 'Liquidez inmediata con mejor rendimiento que banco.',
  },
  {
    id: 'sp500',
    name: 'ETF S&P 500',
    rate: 10.0,
    risk: 'Medio',
    icon: 'globe-outline',
    color: '#FBBF24',
    minAmount: 1000,
    desc: 'Las 500 empresas más grandes de EUA. Promedio histórico ~10% anual pero con volatilidad. No garantizado.',
    ideal: 'Ahorro a largo plazo (+5 años) con mayor rendimiento potencial.',
  },
  {
    id: 'nasdaq',
    name: 'ETF NASDAQ-100',
    rate: 13.0,
    risk: 'Medio-Alto',
    icon: 'rocket-outline',
    color: '#E879F9',
    minAmount: 1000,
    desc: 'Las 100 empresas tecnológicas más grandes (Apple, Google, Meta). Mayor potencial y mayor riesgo.',
    ideal: 'Inversión a muy largo plazo (+7 años) tolerando caídas temporales.',
  },
  {
    id: 'bmv',
    name: 'BMV / IPC',
    rate: 7.0,
    risk: 'Medio',
    icon: 'stats-chart-outline',
    color: '#FB923C',
    minAmount: 500,
    desc: 'Bolsa Mexicana de Valores. Empresas mexicanas líderes como FEMSA, Banorte, Walmex.',
    ideal: 'Apostar al crecimiento de la economía mexicana.',
  },
];

const RISK_COLOR = { 'Bajo': C.green, 'Medio': C.yellow, 'Medio-Alto': '#FB923C', 'Alto': C.red };
const QUICK_AMOUNTS = [500, 1000, 5000, 10000];
const TABS = ['Portafolio', 'Recomendacion', 'Invertir'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const toDate = (d) => d?.toDate?.() ?? new Date(d);

async function buildContext(uid) {
  const [txSnap, userSnap] = await Promise.all([
    getDocs(query(collection(db, 'athena_users', uid, 'transactions'), orderBy('date', 'desc'))),
    getDoc(doc(db, 'athena_users', uid)),
  ]);
  const txs   = txSnap.docs.map(d => d.data());
  const now   = new Date();
  const month = txs.filter(t => {
    const d = toDate(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income  = month.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = month.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const cp    = userSnap.data()?.creditProfile ?? null;
  const score = cp ? calcScore(cp) : null;

  let ctx = `Ingresos este mes: ${fmt(income)}\nGastos este mes: ${fmt(expense)}\nBalance disponible: ${fmt(balance)}\n`;
  if (score) ctx += `Score crediticio: ${score} puntos\nUtilización de crédito: ${cp.utilization}%\n`;

  return { ctx, balance, income, expense, score };
}

async function askAthena(ctx) {
  const prompt =
    'Según mi situación financiera actual, ¿en qué instrumento de inversión me conviene poner mi dinero disponible este mes? ' +
    'Dame una recomendación concreta, menciona 2-3 opciones ordenadas por riesgo (de bajo a alto) ' +
    'y explica brevemente por qué cada una encaja con mi perfil. Máximo 120 palabras.';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ mensaje: prompt, historial: [], contexto_usuario: ctx }),
    });
    const data = await res.json();
    return data.respuesta ?? 'No pude obtener una recomendación. Intenta de nuevo.';
  } finally {
    clearTimeout(timer);
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InvestScreen() {
  const [tab,          setTab]          = useState(0);
  const [positions,    setPositions]    = useState([]);
  const [balance,      setBalance]      = useState(null);  // disponible este mes
  const [advice,       setAdvice]       = useState('');
  const [adviceLoading,setAdviceLoading]= useState(false);
  const [adviceCtx,    setAdviceCtx]    = useState('');
  const [selectedInst, setSelectedInst] = useState(null);
  const [buyAmount,    setBuyAmount]    = useState('');
  const [buying,       setBuying]       = useState(false);
  const [expandedPos,  setExpandedPos]  = useState(null);
  const scrollRef = useRef(null);

  // ── Load data ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const [{ balance: bal, ctx }, invSnap] = await Promise.all([
        buildContext(uid),
        getDocs(query(collection(db, 'athena_users', uid, 'investments'), orderBy('dateInvested', 'desc'))),
      ]);
      setBalance(bal);
      setAdviceCtx(ctx);
      setPositions(invSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (_) {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Recommendation ──────────────────────────────────────────────────────────
  const fetchAdvice = async () => {
    if (!adviceCtx) return;
    setAdviceLoading(true);
    try {
      const text = await askAthena(adviceCtx);
      setAdvice(text);
    } catch {
      setAdvice('No pude conectar con Athena. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setAdviceLoading(false);
    }
  };

  // Auto-fetch advice when switching to tab 1
  const handleTabChange = (i) => {
    setTab(i);
    if (i === 1 && !advice && !adviceLoading) fetchAdvice();
  };

  // ── Buy ─────────────────────────────────────────────────────────────────────
  const confirmBuy = async () => {
    const amount = parseFloat(buyAmount.replace(/,/g, '')) || 0;
    const uid    = auth.currentUser?.uid;
    if (!uid || !selectedInst) return;

    if (amount < selectedInst.minAmount) {
      Alert.alert('Monto mínimo', `El mínimo para ${selectedInst.name} es ${fmt(selectedInst.minAmount)}.`);
      return;
    }
    if (balance !== null && amount > balance) {
      Alert.alert('Saldo insuficiente', `Tu balance disponible es ${fmt(balance)}.`);
      return;
    }

    setBuying(true);
    try {
      const newPos = {
        instrument: selectedInst.name,
        instrumentId: selectedInst.id,
        rate: selectedInst.rate,
        risk: selectedInst.risk,
        color: selectedInst.color,
        icon: selectedInst.icon,
        amountInvested: amount,
        dateInvested: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'athena_users', uid, 'investments'), newPos);
      setPositions(prev => [{ id: docRef.id, ...newPos, dateInvested: { toDate: () => new Date() } }, ...prev]);
      setSelectedInst(null);
      setBuyAmount('');
      setTab(0);
    } catch {
      Alert.alert('Error', 'No se pudo registrar la inversión. Intenta de nuevo.');
    } finally {
      setBuying(false);
    }
  };

  // ── Withdraw ────────────────────────────────────────────────────────────────
  const withdraw = (pos) => {
    const days    = daysSince(pos.dateInvested);
    const current = compound(pos.amountInvested, pos.rate, days);
    const gain    = current - pos.amountInvested;
    Alert.alert(
      'Retirar inversión',
      `Retirarás ${fmt(current)} (ganancia: ${gain >= 0 ? '+' : ''}${fmt(gain)}).\n\nEsta acción es simulada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Retirar',
          style: 'destructive',
          onPress: async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) return;
            try {
              await deleteDoc(doc(db, 'athena_users', uid, 'investments', pos.id));
              setPositions(prev => prev.filter(p => p.id !== pos.id));
              setExpandedPos(null);
            } catch {}
          },
        },
      ],
    );
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const totalInvested = positions.reduce((s, p) => s + p.amountInvested, 0);
  const totalCurrent  = positions.reduce((s, p) => s + compound(p.amountInvested, p.rate, daysSince(p.dateInvested)), 0);
  const totalGain     = totalCurrent - totalInvested;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Inversiones</Text>
          <Text style={s.subtitle}>Simulado · basado en tus finanzas reales</Text>
        </View>

        {/* Tab bar */}
        <View style={s.tabRow}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t}
              style={[s.tabBtn, tab === i && s.tabBtnActive]}
              onPress={() => handleTabChange(i)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, tab === i && s.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ═══ TAB 0: PORTAFOLIO ═══ */}
          {tab === 0 && (
            <>
              {/* Balance disponible */}
              {balance !== null && (
                <View style={s.balanceCard}>
                  <Text style={s.balanceLabel}>Saldo disponible este mes</Text>
                  <Text style={[s.balanceValue, { color: balance >= 0 ? C.green : C.red }]}>
                    {fmt(balance)}
                  </Text>
                  {balance <= 0 && (
                    <Text style={s.balanceWarning}>
                      Tus gastos superan tus ingresos este mes. No es buen momento para invertir.
                    </Text>
                  )}
                  {balance > 0 && balance < 2000 && (
                    <Text style={s.balanceHint}>
                      Saldo ajustado. Considera CETES desde $100 MXN.
                    </Text>
                  )}
                </View>
              )}

              {/* Portfolio summary */}
              {positions.length > 0 ? (
                <>
                  <View style={s.summaryCard}>
                    <View style={s.summaryRow}>
                      <View style={s.summaryItem}>
                        <Text style={s.summaryLabel}>Total invertido</Text>
                        <Text style={s.summaryValue}>{fmt(totalInvested)}</Text>
                      </View>
                      <View style={s.summaryDivider} />
                      <View style={s.summaryItem}>
                        <Text style={s.summaryLabel}>Valor actual</Text>
                        <Text style={[s.summaryValue, { color: C.green }]}>{fmt(totalCurrent)}</Text>
                      </View>
                      <View style={s.summaryDivider} />
                      <View style={s.summaryItem}>
                        <Text style={s.summaryLabel}>Ganancia</Text>
                        <Text style={[s.summaryValue, { color: totalGain >= 0 ? C.green : C.red }]}>
                          {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={s.sectionTitle}>Mis posiciones</Text>
                  {positions.map(pos => {
                    const days    = daysSince(pos.dateInvested);
                    const current = compound(pos.amountInvested, pos.rate, days);
                    const gain    = current - pos.amountInvested;
                    const isOpen  = expandedPos === pos.id;
                    const dateStr = toDate(pos.dateInvested).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

                    return (
                      <TouchableOpacity
                        key={pos.id}
                        style={[s.posCard, isOpen && { borderColor: pos.color + '66' }]}
                        onPress={() => setExpandedPos(isOpen ? null : pos.id)}
                        activeOpacity={0.8}
                      >
                        <View style={s.posTop}>
                          <View style={[s.posIconCircle, { backgroundColor: pos.color + '18' }]}>
                            <Ionicons name={pos.icon || 'trending-up-outline'} size={18} color={pos.color} />
                          </View>
                          <View style={s.posInfo}>
                            <Text style={s.posName}>{pos.instrument}</Text>
                            <Text style={s.posDate}>Desde {dateStr}  ·  {pos.rate}% anual</Text>
                          </View>
                          <View style={s.posRight}>
                            <Text style={[s.posCurrent, { color: pos.color }]}>{fmt(current)}</Text>
                            <Text style={[s.posGain, { color: gain >= 0 ? C.green : C.red }]}>
                              {gain >= 0 ? '+' : ''}{fmt(gain)}
                            </Text>
                          </View>
                        </View>

                        {isOpen && (
                          <View style={[s.posExpanded, { borderTopColor: pos.color + '33' }]}>
                            <View style={s.posDetailRow}>
                              <View style={s.posDetailItem}>
                                <Text style={s.posDetailLabel}>Invertiste</Text>
                                <Text style={s.posDetailValue}>{fmt(pos.amountInvested)}</Text>
                              </View>
                              <View style={s.posDetailItem}>
                                <Text style={s.posDetailLabel}>Dias invertido</Text>
                                <Text style={s.posDetailValue}>{Math.floor(days)} dias</Text>
                              </View>
                              <View style={s.posDetailItem}>
                                <Text style={s.posDetailLabel}>Rendimiento</Text>
                                <Text style={[s.posDetailValue, { color: C.green }]}>
                                  {pos.amountInvested > 0 ? ((gain / pos.amountInvested) * 100).toFixed(4) : 0}%
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={s.withdrawBtn}
                              onPress={() => withdraw(pos)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="exit-outline" size={16} color={C.red} />
                              <Text style={s.withdrawText}>Retirar inversión</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <View style={s.emptyState}>
                  <Ionicons name="bar-chart-outline" size={48} color={C.muted} />
                  <Text style={s.emptyTitle}>Sin inversiones activas</Text>
                  <Text style={s.emptyText}>
                    Ve a la pestana "Recomendacion" para que Athena te diga donde invertir segun tu situacion financiera actual.
                  </Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => handleTabChange(1)} activeOpacity={0.7}>
                    <Text style={s.emptyBtnText}>Ver recomendacion de Athena</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ═══ TAB 1: RECOMENDACIÓN ═══ */}
          {tab === 1 && (
            <>
              {/* Context summary */}
              {balance !== null && (
                <View style={s.contextCard}>
                  <View style={s.contextRow}>
                    <Ionicons name="person-circle-outline" size={16} color={C.purple} />
                    <Text style={s.contextTitle}>Tu situacion este mes</Text>
                  </View>
                  <Text style={s.contextText}>{adviceCtx}</Text>
                </View>
              )}

              {/* Athena advice */}
              <View style={s.adviceCard}>
                <View style={s.adviceHeader}>
                  <View style={s.adviceAvatarCircle}>
                    <Ionicons name="sparkles-outline" size={18} color={C.purple} />
                  </View>
                  <View>
                    <Text style={s.adviceTitle}>Recomendacion de Athena</Text>
                    <Text style={s.adviceSub}>Basada en tus finanzas reales</Text>
                  </View>
                </View>

                {adviceLoading ? (
                  <View style={s.adviceLoading}>
                    <ActivityIndicator color={C.purple} size="small" />
                    <Text style={s.adviceLoadingText}>Athena esta analizando tu perfil...</Text>
                  </View>
                ) : advice ? (
                  <>
                    <Text style={s.adviceText}>{advice}</Text>
                    <TouchableOpacity style={s.refreshBtn} onPress={fetchAdvice} activeOpacity={0.7}>
                      <Ionicons name="refresh-outline" size={14} color={C.purple} />
                      <Text style={s.refreshText}>Actualizar consejo</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={s.getAdviceBtn} onPress={fetchAdvice} activeOpacity={0.7}>
                    <Ionicons name="sparkles-outline" size={16} color="#fff" />
                    <Text style={s.getAdviceBtnText}>Pedir recomendacion a Athena</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick invest from recommendation */}
              {advice && (
                <>
                  <Text style={s.sectionTitle}>Instrumentos sugeridos</Text>
                  <Text style={s.sectionSub}>Ordenados de menor a mayor riesgo</Text>
                  {INSTRUMENTS.slice(0, 4).map(inst => (
                    <TouchableOpacity
                      key={inst.id}
                      style={s.suggestCard}
                      onPress={() => { setSelectedInst(inst); handleTabChange(2); }}
                      activeOpacity={0.7}
                    >
                      <View style={[s.suggestIcon, { backgroundColor: inst.color + '18' }]}>
                        <Ionicons name={inst.icon} size={18} color={inst.color} />
                      </View>
                      <View style={s.suggestInfo}>
                        <Text style={s.suggestName}>{inst.name}</Text>
                        <Text style={s.suggestIdeal}>{inst.ideal}</Text>
                      </View>
                      <View style={s.suggestRight}>
                        <Text style={[s.suggestRate, { color: inst.color }]}>{inst.rate}%</Text>
                        <View style={[s.riskBadge, { backgroundColor: RISK_COLOR[inst.risk] + '22' }]}>
                          <Text style={[s.riskText, { color: RISK_COLOR[inst.risk] }]}>{inst.risk}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}

          {/* ═══ TAB 2: INVERTIR ═══ */}
          {tab === 2 && (
            <>
              {/* Buy form (shows when instrument selected) */}
              {selectedInst && (
                <View style={[s.buyCard, { borderColor: selectedInst.color + '55' }]}>
                  <View style={s.buyHeader}>
                    <View style={[s.buyIconCircle, { backgroundColor: selectedInst.color + '18' }]}>
                      <Ionicons name={selectedInst.icon} size={22} color={selectedInst.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.buyInstName}>{selectedInst.name}</Text>
                      <Text style={[s.buyRate, { color: selectedInst.color }]}>{selectedInst.rate}% anual</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedInst(null); setBuyAmount(''); }} hitSlop={10}>
                      <Ionicons name="close-circle-outline" size={22} color={C.muted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={s.buyLabel}>Cuanto quieres invertir</Text>
                  <View style={s.buyInputRow}>
                    <Text style={s.buyPrefix}>$</Text>
                    <TextInput
                      style={s.buyInput}
                      keyboardType="numeric"
                      value={buyAmount}
                      onChangeText={setBuyAmount}
                      placeholder="0"
                      placeholderTextColor={C.muted}
                      selectTextOnFocus
                    />
                    <Text style={s.buySuffix}>MXN</Text>
                  </View>

                  {/* Quick amounts */}
                  <View style={s.quickRow}>
                    {QUICK_AMOUNTS.map(a => (
                      <TouchableOpacity
                        key={a}
                        style={[s.quickBtn, buyAmount === String(a) && { borderColor: selectedInst.color, backgroundColor: selectedInst.color + '15' }]}
                        onPress={() => setBuyAmount(String(a))}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.quickBtnText, buyAmount === String(a) && { color: selectedInst.color }]}>
                          {fmt(a)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Preview */}
                  {parseFloat(buyAmount) > 0 && (
                    <View style={s.buyPreview}>
                      {[1, 3, 5].map(y => {
                        const val  = compound(parseFloat(buyAmount) || 0, selectedInst.rate, y * 365);
                        const gain = val - (parseFloat(buyAmount) || 0);
                        return (
                          <View key={y} style={s.previewItem}>
                            <Text style={s.previewYear}>{y} {y === 1 ? 'año' : 'años'}</Text>
                            <Text style={[s.previewVal, { color: selectedInst.color }]}>{fmt(val)}</Text>
                            <Text style={s.previewGain}>+{fmt(gain)}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <Text style={s.buyMinNote}>Minimo: {fmt(selectedInst.minAmount)}</Text>

                  <TouchableOpacity
                    style={[s.confirmBtn, { backgroundColor: selectedInst.color }, buying && { opacity: 0.6 }]}
                    onPress={confirmBuy}
                    disabled={buying}
                    activeOpacity={0.8}
                  >
                    {buying
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.confirmBtnText}>Confirmar inversion</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}

              {/* All instruments */}
              <Text style={s.sectionTitle}>Todos los instrumentos</Text>
              <Text style={s.sectionSub}>Toca uno para invertir</Text>

              {INSTRUMENTS.map(inst => (
                <TouchableOpacity
                  key={inst.id}
                  style={[s.instCard, selectedInst?.id === inst.id && { borderColor: inst.color + '66' }]}
                  onPress={() => { setSelectedInst(inst); setBuyAmount(''); scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
                  activeOpacity={0.7}
                >
                  <View style={[s.instIconCircle, { backgroundColor: inst.color + '18' }]}>
                    <Ionicons name={inst.icon} size={18} color={inst.color} />
                  </View>
                  <View style={s.instInfo}>
                    <Text style={s.instName}>{inst.name}</Text>
                    <Text style={s.instDesc}>{inst.ideal}</Text>
                  </View>
                  <View style={s.instRight}>
                    <Text style={[s.instRate, { color: inst.color }]}>{inst.rate}%</Text>
                    <View style={[s.riskBadge, { backgroundColor: RISK_COLOR[inst.risk] + '22' }]}>
                      <Text style={[s.riskText, { color: RISK_COLOR[inst.risk] }]}>{inst.risk}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={s.disclaimer}>
                <Ionicons name="information-circle-outline" size={13} color={C.muted} />
                <Text style={s.disclaimerText}>
                  {' '}Simulacion educativa. Las tasas historicas no garantizan rendimientos futuros. Consulta a un asesor certificado antes de invertir dinero real.
                </Text>
              </View>
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingTop: 8 },

  header:   { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  title:    { color: C.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 2 },

  // Tabs
  tabRow:        { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tabBtn:        { flex: 1, paddingVertical: 9, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  tabBtnActive:  { backgroundColor: C.purple + '22', borderColor: C.purple },
  tabText:       { color: C.muted, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: C.purple },

  // Balance card
  balanceCard:    { backgroundColor: C.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 20, marginBottom: 16, alignItems: 'center' },
  balanceLabel:   { color: C.muted, fontSize: 12, marginBottom: 6 },
  balanceValue:   { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  balanceWarning: { color: C.red, fontSize: 12, marginTop: 8, textAlign: 'center' },
  balanceHint:    { color: C.yellow, fontSize: 12, marginTop: 8, textAlign: 'center' },

  // Summary
  summaryCard:    { backgroundColor: C.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 16, marginBottom: 20 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem:    { alignItems: 'center', flex: 1 },
  summaryLabel:   { color: C.muted, fontSize: 11, marginBottom: 4 },
  summaryValue:   { color: C.text, fontSize: 15, fontWeight: '700' },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: C.border },

  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionSub:   { color: C.muted, fontSize: 12, marginBottom: 12 },

  // Position cards
  posCard:       { backgroundColor: C.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, marginBottom: 10, overflow: 'hidden' },
  posTop:        { flexDirection: 'row', alignItems: 'center', padding: 14 },
  posIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  posInfo:       { flex: 1 },
  posName:       { color: C.text, fontSize: 14, fontWeight: '600', marginBottom: 3 },
  posDate:       { color: C.muted, fontSize: 11 },
  posRight:      { alignItems: 'flex-end' },
  posCurrent:    { fontSize: 14, fontWeight: '700' },
  posGain:       { fontSize: 11, marginTop: 2 },
  posExpanded:   { borderTopWidth: 1, padding: 14, gap: 12 },
  posDetailRow:  { flexDirection: 'row', justifyContent: 'space-around' },
  posDetailItem: { alignItems: 'center' },
  posDetailLabel:{ color: C.muted, fontSize: 11, marginBottom: 4 },
  posDetailValue:{ color: C.text, fontSize: 13, fontWeight: '700' },
  withdrawBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.red + '12', borderRadius: 12, borderWidth: 1, borderColor: C.red + '33', padding: 10 },
  withdrawText:  { color: C.red, fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  emptyText:  { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  emptyBtn:   { backgroundColor: C.purple + '22', borderRadius: 16, borderWidth: 1, borderColor: C.purple, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText:{ color: C.purple, fontSize: 14, fontWeight: '700' },

  // Advice
  contextCard:  { backgroundColor: C.bgBase, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 14, marginBottom: 14 },
  contextRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  contextTitle: { color: C.purple, fontSize: 12, fontWeight: '700' },
  contextText:  { color: C.muted, fontSize: 12, lineHeight: 18 },

  adviceCard:        { backgroundColor: C.surface, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 18, marginBottom: 20 },
  adviceHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  adviceAvatarCircle:{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.purple + '22', alignItems: 'center', justifyContent: 'center' },
  adviceTitle:       { color: C.text, fontSize: 14, fontWeight: '700' },
  adviceSub:         { color: C.muted, fontSize: 11 },
  adviceLoading:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  adviceLoadingText: { color: C.muted, fontSize: 13 },
  adviceText:        { color: C.text, fontSize: 14, lineHeight: 22 },
  refreshBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start' },
  refreshText:       { color: C.purple, fontSize: 13, fontWeight: '600' },
  getAdviceBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.purple, borderRadius: 14, padding: 14 },
  getAdviceBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },

  suggestCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 14, marginBottom: 8 },
  suggestIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  suggestInfo:  { flex: 1 },
  suggestName:  { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  suggestIdeal: { color: C.muted, fontSize: 11 },
  suggestRight: { alignItems: 'flex-end', gap: 4 },
  suggestRate:  { fontSize: 14, fontWeight: '800' },

  // Buy card
  buyCard:        { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 20 },
  buyHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  buyIconCircle:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buyInstName:    { color: C.text, fontSize: 15, fontWeight: '700' },
  buyRate:        { fontSize: 13, fontWeight: '600', marginTop: 2 },
  buyLabel:       { color: C.muted, fontSize: 12, fontWeight: '500', marginBottom: 8 },
  buyInputRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgBase, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, paddingHorizontal: 14, marginBottom: 12 },
  buyPrefix:      { color: C.muted, fontSize: 18, fontWeight: '700', marginRight: 4 },
  buyInput:       { flex: 1, color: C.text, fontSize: 28, fontWeight: '800', paddingVertical: 14 },
  buySuffix:      { color: C.muted, fontSize: 14 },
  quickRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBtn:       { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgBase },
  quickBtnText:   { color: C.muted, fontSize: 11, fontWeight: '700' },
  buyPreview:     { flexDirection: 'row', backgroundColor: C.bgBase, borderRadius: 14, padding: 14, marginBottom: 14, justifyContent: 'space-around' },
  previewItem:    { alignItems: 'center' },
  previewYear:    { color: C.muted, fontSize: 11, marginBottom: 4 },
  previewVal:     { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  previewGain:    { color: C.green, fontSize: 11 },
  buyMinNote:     { color: C.muted, fontSize: 11, marginBottom: 14 },
  confirmBtn:     { borderRadius: 16, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Instrument list
  instCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, padding: 14, marginBottom: 8 },
  instIconCircle:{ width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  instInfo:      { flex: 1 },
  instName:      { color: C.text, fontSize: 13, fontWeight: '600', marginBottom: 2 },
  instDesc:      { color: C.muted, fontSize: 11 },
  instRight:     { alignItems: 'flex-end', gap: 4 },
  instRate:      { fontSize: 14, fontWeight: '800' },

  riskBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  riskText:  { fontSize: 10, fontWeight: '600' },

  disclaimer:     { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  disclaimerText: { color: C.muted, fontSize: 11, lineHeight: 16, flex: 1 },
});
