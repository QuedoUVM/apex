import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { getNotificaciones, marcarLeida, marcarTodasLeidas } from '../../services/notificaciones';
import EmptyState from '../../components/ui/EmptyState';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { HP, fontSizes, radii } from '../../styles/theme';

const TIPO = {
  info:   { icon: 'information-circle-outline', color: (c) => c.primary },
  alerta: { icon: 'warning-outline',            color: (c) => c.warning },
  exito:  { icon: 'checkmark-circle-outline',   color: (c) => c.success },
};

function NotifItem({ item, onRead, colors }) {
  const cfg   = TIPO[item.tipo] || TIPO.info;
  const color = cfg.color(colors);

  return (
    <TouchableOpacity
      style={[
        s.item,
        { backgroundColor: colors.bgCard, borderColor: colors.border },
        !item.leida && { borderLeftWidth: 3, borderLeftColor: colors.accent },
      ]}
      onPress={() => !item.leida && onRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={cfg.icon} size={20} color={color} />
      </View>
      <View style={s.body}>
        <Text style={[s.title, { color: item.leida ? colors.textSub : colors.text },
          !item.leida && { fontWeight: '700' }
        ]}>
          {item.titulo}
        </Text>
        <Text style={[s.msg, { color: colors.textMuted }]} numberOfLines={2}>{item.mensaje}</Text>
      </View>
      {!item.leida && <View style={[s.dot, { backgroundColor: colors.accent }]} />}
    </TouchableOpacity>
  );
}

export default function NotificacionesScreen() {
  const { colors } = useTheme();
  const { user }   = useAuth();
  const router     = useRouter();

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    if (!user) return;
    try { setItems(await getNotificaciones(user.uid)); } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const leerUna = async (id) => {
    await marcarLeida(user.uid, id);
    setItems((p) => p.map((n) => n.id === id ? { ...n, leida: true } : n));
  };

  const leerTodas = async () => {
    await marcarTodasLeidas(user.uid);
    setItems((p) => p.map((n) => ({ ...n, leida: true })));
  };

  const noLeidas = items.filter((n) => !n.leida).length;

  const LeerTodas = noLeidas > 0 ? (
    <TouchableOpacity onPress={leerTodas}>
      <Text style={[s.leerTodas, { color: colors.accent }]}>Leer todas</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[s.fill, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.statusBar} />
      <ScreenHeader title="Notificaciones" onBack={() => router.back()} right={LeerTodas} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: 40 }]}
          renderItem={({ item }) => <NotifItem item={item} onRead={leerUna} colors={colors} />}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="Sin notificaciones"
              subtitle="Aquí aparecerán tus alertas y avisos"
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fill:      { flex: 1 },
  list:      { paddingHorizontal: HP },
  item:      { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radii.lg, borderWidth: 1, padding: 14, marginBottom: 8 },
  iconWrap:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body:      { flex: 1 },
  title:     { fontSize: fontSizes.sm, marginBottom: 2 },
  msg:       { fontSize: fontSizes.xs, lineHeight: 18 },
  dot:       { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginLeft: 8 },
  leerTodas: { fontSize: fontSizes.sm, fontWeight: '600' },
});
