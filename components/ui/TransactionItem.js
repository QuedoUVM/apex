import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fontSizes } from '../../styles/theme';

/**
 * Ítem de transacción para listas de Gastos e Ingresos.
 * @param {{ item, tipo, onDelete }} props
 *   tipo: 'gasto' | 'ingreso'
 *   item.icon: nombre de Ionicons
 */
export default function TransactionItem({ item, tipo, onDelete }) {
  const { colors } = useTheme();
  const esGasto = tipo === 'gasto';

  const iconBg    = esGasto ? colors.dangerLight  : colors.successLight;
  const iconColor = esGasto ? colors.danger        : colors.success;
  const amtColor  = esGasto ? colors.danger        : colors.success;
  const prefix    = esGasto ? '−' : '+';

  const confirmar = () =>
    Alert.alert('Eliminar', `¿Eliminar "${item.descripcion}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);

  return (
    <View style={[s.row, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Ícono de categoría */}
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={item.icon || (esGasto ? 'card-outline' : 'cash-outline')} size={18} color={iconColor} />
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={[s.desc, { color: colors.text }]} numberOfLines={1}>
          {item.descripcion}
        </Text>
        <Text style={[s.meta, { color: colors.textMuted }]}>
          {item.categoria} · {item.fecha}
        </Text>
      </View>

      {/* Monto */}
      <Text style={[s.monto, { color: amtColor }]}>
        {prefix}${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </Text>

      {/* Eliminar */}
      {onDelete && (
        <TouchableOpacity onPress={confirmar} style={s.del} hitSlop={10}>
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   14,
    borderWidth:    1,
    padding:        14,
    marginBottom:   8,
  },
  iconWrap: {
    width:         40,
    height:        40,
    borderRadius:  20,
    alignItems:    'center',
    justifyContent: 'center',
    marginRight:   12,
  },
  info: {
    flex:        1,
    marginRight: 8,
  },
  desc: {
    fontSize:     fontSizes.md,
    fontWeight:   '500',
    marginBottom: 2,
  },
  meta: {
    fontSize: fontSizes.xs,
  },
  monto: {
    fontSize:    fontSizes.md,
    fontWeight:  '700',
    marginRight: 8,
  },
  del: { padding: 4 },
});
