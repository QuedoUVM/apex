import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fontSizes } from '../../styles/theme';

/**
 * @param {{ icon, title, subtitle }} props
 *   icon – nombre de Ionicons (ej. 'wallet-outline')
 */
export default function EmptyState({ icon = 'folder-open-outline', title, subtitle }) {
  const { colors } = useTheme();

  return (
    <View style={s.wrap}>
      <View style={[s.iconWrap, { backgroundColor: colors.bgSubtle }]}>
        <Ionicons name={icon} size={36} color={colors.textMuted} />
      </View>
      <Text style={[s.title, { color: colors.textSub }]}>{title}</Text>
      {subtitle ? (
        <Text style={[s.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width:        72,
    height:       72,
    borderRadius: 36,
    alignItems:   'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize:   fontSizes.md,
    fontWeight: '600',
    textAlign:  'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize:  fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
