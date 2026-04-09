import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSizes } from '../../styles/theme';

export default function AppButton({
  title,
  onPress,
  loading   = false,
  disabled  = false,
  variant   = 'primary',  // 'primary' | 'ghost' | 'danger'
  style,
}) {
  const { colors }  = useTheme();
  const isDisabled  = disabled || loading;

  const bg =
    variant === 'primary' ? colors.accent :
    variant === 'danger'  ? colors.danger :
    'transparent';

  const textColor =
    variant === 'ghost' ? colors.accent : '#ffffff';

  const borderStyle =
    variant === 'ghost'
      ? { borderWidth: 1.5, borderColor: colors.accent }
      : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[s.base, { backgroundColor: bg }, borderStyle, isDisabled && s.disabled, style]}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[s.text, { color: textColor }]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius:    14,
    paddingVertical: 14,
    alignItems:      'center',
    justifyContent:  'center',
    minHeight:       50,
  },
  disabled: { opacity: 0.45 },
  text: {
    fontSize:   fontSizes.md,
    fontWeight: '600',
  },
});
