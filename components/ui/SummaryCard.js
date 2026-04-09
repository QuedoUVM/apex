import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fontSizes } from '../../styles/theme';

/**
 * Tarjeta de resumen compacta.
 * @param {{ label, amount, icon, amountColor }} props
 *   icon – nombre de Ionicons
 */
export default function SummaryCard({ label, amount, icon, amountColor }) {
  const { colors } = useTheme();
  const finalColor = amountColor || colors.text;

  return (
    <View style={[s.card, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.7)" />
      <Text style={s.label}>{label}</Text>
      <Text style={[s.amount, { color: finalColor }]}>
        ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex:           1,
    borderRadius:   12,
    padding:        12,
    alignItems:     'flex-start',
  },
  label: {
    fontSize:    fontSizes.xs,
    color:       'rgba(255,255,255,0.65)',
    marginTop:   4,
    marginBottom: 2,
  },
  amount: {
    fontSize:   fontSizes.md,
    fontWeight: '700',
    color:      '#fff',
  },
});
