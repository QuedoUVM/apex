import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

/**
 * Toast simple para feedback de operaciones.
 *
 * Uso:
 *   const [toast, setToast] = useState(null);
 *   setToast({ message: 'Gasto guardado', type: 'success' });
 *   // Renderizar: <Toast config={toast} onHide={() => setToast(null)} />
 */
export default function Toast({ config, onHide }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!config) return;

    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2200),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  }, [config]);

  if (!config) return null;

  const bgColor =
    config.type === 'success'
      ? colors.success
      : config.type === 'error'
      ? colors.danger
      : colors.accent;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: bgColor, opacity },
      ]}
    >
      <Text style={styles.text}>{config.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: '80%',
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
