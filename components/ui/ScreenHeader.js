import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { HP, HEADER_TOP, fontSizes } from '../../styles/theme';

/**
 * Header estándar reutilizable para todas las pantallas.
 * @param {{ title, subtitle, onBack, right }} props
 *   onBack  – si se pasa, muestra flecha de regreso
 *   right   – nodo React opcional (ej. botón de acción)
 */
export default function ScreenHeader({ title, subtitle, onBack, right }) {
  const { colors } = useTheme();

  return (
    <View style={[s.wrap, { backgroundColor: colors.bg }]}>
      <View style={s.left}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={s.back} hitSlop={10}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={s.titles}>
          {subtitle ? (
            <Text style={[s.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
          <Text style={[s.title, { color: colors.text }]}>{title}</Text>
        </View>
      </View>
      {right ? <View style={s.right}>{right}</View> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingTop:        HEADER_TOP,
    paddingHorizontal: HP,
    paddingBottom:     16,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-end',
  },
  left: {
    flexDirection: 'row',
    alignItems:    'center',
    flex:          1,
  },
  back: {
    marginRight: 10,
    padding:     2,
  },
  titles: { flex: 1 },
  subtitle: {
    fontSize:    fontSizes.xs,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  title: {
    fontSize:   fontSizes.xl,
    fontWeight: '700',
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
});
