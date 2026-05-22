import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { C } from '../theme';

export default function ChatHistoryScreen({ navigation }) {
  const [chats, setChats] = useState([]);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const snap = await getDocs(collection(db, 'athena_users', uid, 'chats'));
      const all  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort newest first (updatedAt is a Date.now() Unix ms number)
      all.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      setChats(all);
    } catch (e) { console.warn('[Athena] load chats:', e); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doDelete = async (id) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await deleteDoc(doc(db, 'athena_users', uid, 'chats', id));
      setChats(prev => prev.filter(c => c.id !== id));
    } catch (_) {}
  };

  const deleteChat = (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar esta conversación?')) doDelete(id);
    } else {
      Alert.alert('Eliminar chat', '¿Eliminar esta conversación?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => doDelete(id) },
      ]);
    }
  };

  const openNew = () => navigation.navigate('Chat', {});

  const formatDate = (ts) => {
    if (!ts) return '';
    const d    = new Date(ts); // ts is a Unix ms number from Date.now()
    const diff = Date.now() - ts;
    if (diff < 86400000)  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('es-MX', { weekday: 'short' });
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Athena</Text>
          <Text style={s.sub}>Tu asistente financiero</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={openNew} accessibilityLabel="Nueva conversación">
          <Ionicons name="create-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={c => c.id}
        contentContainerStyle={[s.list, chats.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="chatbubbles-outline" size={40} color={C.purple} />
            </View>
            <Text style={s.emptyTitle}>Sin conversaciones</Text>
            <Text style={s.emptyText}>Inicia una nueva para hablar con Athena sobre tus finanzas</Text>
            <TouchableOpacity style={s.startBtn} onPress={openNew}>
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={s.startBtnText}>Nueva conversación</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.chatRow}
            onPress={() => navigation.navigate('Chat', { chatId: item.id, title: item.title })}
            activeOpacity={0.7}
          >
            <View style={s.chatAvatar}>
              <Ionicons name="chatbubble" size={18} color={C.purple} />
            </View>
            <View style={s.chatInfo}>
              <Text style={s.chatTitle} numberOfLines={1}>
                {item.title || 'Nueva conversación'}
              </Text>
              <Text style={s.chatPreview} numberOfLines={1}>
                {item.lastMessage || 'Toca para continuar…'}
              </Text>
            </View>
            <View style={s.chatMeta}>
              <Text style={s.chatDate}>{formatDate(item.updatedAt)}</Text>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => deleteChat(item.id)}
                hitSlop={8}
                accessibilityLabel="Eliminar conversación"
              >
                <Ionicons name="trash-outline" size={15} color={C.muted} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:  { color: C.text, fontSize: 22, fontWeight: '700' },
  sub:    { color: C.muted, fontSize: 13, marginTop: 2 },
  newBtn: { backgroundColor: C.purple, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 24, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  emptyText:  { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 },
  startBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: C.purple, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24 },
  startBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  chatRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.hairline, gap: 12 },
  chatAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center' },
  chatInfo:   { flex: 1 },
  chatTitle:  { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  chatPreview:{ color: C.muted, fontSize: 12 },
  chatMeta:   { alignItems: 'flex-end', gap: 6 },
  chatDate:   { color: C.muted, fontSize: 11 },
  deleteBtn:  { padding: 4 },
});
