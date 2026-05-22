import { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  doc, setDoc, addDoc, getDoc, getDocs,
  collection, query, orderBy,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { API_URL, FETCH_TIMEOUT_MS } from '../config';
import { C, fmt } from '../theme';
import { calcScore } from '../creditUtils';

const WELCOME = {
  id: 'welcome',
  role: 'agent',
  text: 'Hola, soy Athena 👋\nSoy tu asistente financiero personal. Puedo ayudarte con presupuestos, inversiones, score crediticio, CETES, AFORE y mucho más.\n¿En qué te ayudo hoy?',
};

const MAX_HISTORIAL = 16; // last 8 exchanges

const toDate = (d) => d?.toDate?.() ?? new Date(d);

// ── Build a plain-text financial context summary for Athena ─────────────────
async function buildFinancialContext(uid) {
  try {
    const [txSnap, userSnap] = await Promise.all([
      getDocs(query(
        collection(db, 'athena_users', uid, 'transactions'),
        orderBy('date', 'desc'),
      )),
      getDoc(doc(db, 'athena_users', uid)),
    ]);

    const transactions = txSnap.docs.map(d => d.data());
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = toDate(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const income  = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    // Top expense categories this month
    const byCategory = {};
    thisMonth.filter(t => t.type === 'expense').forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });
    const topExpenses = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([cat, amt]) => `${cat} (${fmt(amt)})`)
      .join(', ');

    const monthName = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
    let ctx = `=== CONTEXTO FINANCIERO DEL USUARIO (${monthName}) ===\n`;
    ctx += `Ingresos del mes: ${fmt(income)} MXN\n`;
    ctx += `Gastos del mes: ${fmt(expense)} MXN\n`;
    ctx += `Balance: ${fmt(balance)} MXN (${balance >= 0 ? 'positivo ✓' : 'NEGATIVO ⚠️'})\n`;
    if (topExpenses) ctx += `Principales categorías de gasto: ${topExpenses}\n`;
    ctx += `Total movimientos registrados (todos los meses): ${transactions.length}\n`;

    const cp = userSnap.data()?.creditProfile;
    if (cp) {
      const score = calcScore(cp);
      const scoreLabel =
        score < 580 ? 'Muy malo' : score < 650 ? 'Malo' :
        score < 700 ? 'Regular' : score < 750 ? 'Bueno' :
        score < 800 ? 'Muy bueno' : 'Excelente';
      ctx += `\n=== SCORE CREDITICIO ESTIMADO: ${score} puntos (${scoreLabel}) ===\n`;
      ctx += `Historial de pagos: ${cp.paymentHistory}% ${cp.paymentHistory >= 90 ? '✓' : '⚠️ bajo (ideal ≥90%)'}\n`;
      ctx += `Utilización de crédito: ${cp.utilization}% ${cp.utilization <= 30 ? '✓' : '⚠️ alto (ideal ≤30%)'}\n`;
      ctx += `Antigüedad crediticia: ${cp.creditAge} años ${cp.creditAge >= 5 ? '✓' : '⚠️ poca (más tiempo mejora el score)'}\n`;
      ctx += `Tipos de crédito: ${cp.creditTypes} ${cp.creditTypes >= 2 ? '✓' : '⚠️ diversificar'}\n`;
      ctx += `Solicitudes en 12 meses: ${cp.newApplications} ${cp.newApplications <= 2 ? '✓' : '⚠️ muchas solicitudes reducen el score'}\n`;
    } else {
      ctx += '\nEl usuario aún no ha configurado su perfil crediticio.\n';
    }

    return ctx;
  } catch (e) {
    console.warn('[Athena] No se pudo obtener contexto financiero:', e);
    return '';
  }
}


export default function ChatScreen({ route, navigation }) {
  const initChatId = route?.params?.chatId ?? null;
  const initTitle  = route?.params?.title  ?? null;

  const [chatId,    setChatId]    = useState(initChatId);
  const [messages,  setMessages]  = useState([WELCOME]);
  const [historial, setHistorial] = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const listRef    = useRef(null);
  const loaded     = useRef(false);
  const cachedCtx  = useRef(null);  // financial context cached per session

  // ── Nav title ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (navigation && initTitle) navigation.setOptions({ title: initTitle });
  }, [navigation, initTitle]);

  // ── Load existing chat ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!initChatId || loaded.current) return;
    loaded.current = true;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'athena_users', uid, 'chats', initChatId)).then(snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.messages?.length)  setMessages(data.messages);
      if (data.historial?.length) setHistorial(data.historial);
    }).catch(e => console.warn('[Athena] Load chat error:', e));
  }, [initChatId]);

  // ── Update existing chat document ─────────────────────────────────────────
  const updateChat = useCallback(async (cid, msgs, hist) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !cid) return;
    const lastAgent = msgs.filter(m => m.role === 'agent').slice(-1)[0]?.text ?? '';
    try {
      await setDoc(
        doc(db, 'athena_users', uid, 'chats', cid),
        {
          messages:    msgs,
          historial:   hist.slice(-MAX_HISTORIAL),
          lastMessage: lastAgent.substring(0, 80),
          updatedAt:   Date.now(),
        },
        { merge: true },
      );
    } catch (e) {
      console.error('[Athena] updateChat failed:', e);
    }
  }, []);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const uid = auth.currentUser?.uid;
    const isFirstReal = messages.length === 1 && messages[0].id === 'welcome';
    const userMsg  = { id: Date.now().toString(), role: 'user', text };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInput('');
    setLoading(true);
    setError(null);

    // ── If this is a brand-new chat, create the Firestore document NOW
    // (before the API call) using addDoc so it's never lost on timeout.
    let activeCid = chatId;
    if (!activeCid && uid) {
      try {
        const chatRef = await addDoc(
          collection(db, 'athena_users', uid, 'chats'),
          {
            title:      (isFirstReal ? text : 'Nueva conversación').substring(0, 60),
            messages:   withUser,
            historial:  [],
            lastMessage: '',
            createdAt:  Date.now(),
            updatedAt:  Date.now(),
          },
        );
        activeCid = chatRef.id;
        setChatId(activeCid);
      } catch (e) {
        console.error('[Athena] create chat failed:', e);
      }
    }

    // ── Fetch financial context once per session ──────────────────────────
    if (uid && cachedCtx.current === null) {
      cachedCtx.current = await buildFinancialContext(uid);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mensaje:          text,
          historial:        historial.slice(-MAX_HISTORIAL),
          contexto_usuario: cachedCtx.current ?? '',
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Error ${res.status}`);
      }
      const data         = await res.json();
      const agentMsg     = { id: (Date.now() + 1).toString(), role: 'agent', text: data.respuesta };
      const finalMsgs    = [...withUser, agentMsg];
      const newHistorial = (data.historial ?? []).slice(-MAX_HISTORIAL);
      setMessages(finalMsgs);
      setHistorial(newHistorial);
      await updateChat(activeCid, finalMsgs, newHistorial);
    } catch (err) {
      setError(err.name === 'AbortError'
        ? 'La respuesta tardó demasiado. Intenta de nuevo.'
        : err.message || 'No se pudo conectar con el servidor.');
      // Update with user message even on API failure
      await updateChat(activeCid, withUser, historial);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [input, loading, historial, messages, chatId, updateChat]);

  // ── Render bubble ──────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAgent]}>
        {!isUser && (
          <View style={s.agentDot}>
            <View style={s.agentDotInner} />
          </View>
        )}
        <Text style={[s.bubbleText, isUser ? s.textUser : s.textAgent]}>{item.text}</Text>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.statusDot} />
          <View>
            <Text style={s.headerTitle}>Athena</Text>
            <Text style={s.headerSub}>Asistente financiero · IA</Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={C.purple} />
            <Text style={s.loadingText}>Athena está pensando…</Text>
          </View>
        )}

        {error && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠ {error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={16} color={C.red} />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Pregúntale a Athena…"
            placeholderTextColor={C.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!loading}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border, backgroundColor: C.bgBase },
  backBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: C.green },
  headerTitle:  { color: C.text, fontSize: 17, fontWeight: '700' },
  headerSub:    { color: C.muted, fontSize: 11, marginTop: 1 },

  list: { padding: 16, gap: 10, flexGrow: 1, backgroundColor: C.bg },

  bubble:      { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser:  { alignSelf: 'flex-end', backgroundColor: C.purple, borderBottomRightRadius: 4 },
  bubbleAgent: { alignSelf: 'flex-start', backgroundColor: C.surface, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  agentDot:      { width: 18, height: 18, borderRadius: 9, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  agentDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple },
  bubbleText:  { fontSize: 15, lineHeight: 22 },
  textUser:    { color: '#FFF' },
  textAgent:   { color: C.text, flex: 1 },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.bg },
  loadingText: { color: C.muted, fontSize: 13 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.redLight, paddingHorizontal: 16, paddingVertical: 10 },
  errorText:   { color: C.red, fontSize: 13, flex: 1 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.bgBase, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, gap: 8 },
  input:    { flex: 1, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15, color: C.text, maxHeight: 120, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  sendBtn:    { width: 42, height: 42, borderRadius: 21, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: C.surfaceHigh },
});
