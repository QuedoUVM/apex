import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSizes } from '../../styles/theme';

export default function AppInput({ label, error, containerStyle, ...rest }) {
  const { colors } = useTheme();

  return (
    <View style={[s.container, containerStyle]}>
      {label ? (
        <Text style={[s.label, { color: colors.textSub }]}>{label}</Text>
      ) : null}
      <TextInput
        style={[
          s.input,
          { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.text },
          error ? { borderColor: colors.danger, borderWidth: 1.5 } : null,
        ]}
        placeholderTextColor={colors.textMuted}
        {...rest}
      />
      {error ? (
        <Text style={[s.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontSize:     fontSizes.sm,
    fontWeight:   '500',
    marginBottom: 6,
  },
  input: {
    borderWidth:       1,
    borderRadius:      12,
    paddingHorizontal: 16,
    paddingVertical:   13,
    fontSize:          fontSizes.md,
  },
  error: {
    fontSize:  fontSizes.xs,
    marginTop: 4,
  },
});
