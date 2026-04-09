import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import { loginWithEmailOrPhone } from '../../services/auth';
import { spacing, radii, fontSizes } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);
  const shake = useRef(new Animated.Value(0)).current;

  const sacudir = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (isSubmitting.current) return;
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Completa todos los campos.');
      sacudir();
      return;
    }

    isSubmitting.current = true;
    setLoading(true);
    try {
      await loginWithEmailOrPhone(identifier, password);
      // La redirección ocurre reactivamente desde el auth guard en _layout.js
    } catch (err) {
      setError(err.message);
      sacudir();
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  const styles = StyleSheet.create({
    fondo: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    blob: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: colors.primary,
      opacity: 0.15,
      top: -80,
      left: -80,
    },
    contenido: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxl,
    },
    appName: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
      letterSpacing: 1,
    },
    tagline: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radii.xl,
      padding: spacing.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    },
    titulo: {
      fontSize: fontSizes.xl,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.lg,
    },
    errorGeneral: {
      color: colors.danger,
      fontSize: fontSizes.sm,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    boton: {
      marginTop: spacing.sm,
    },
    linkWrap: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    link: {
      fontSize: fontSizes.sm,
      color: colors.textSub,
    },
    linkBold: {
      color: colors.primary,
      fontWeight: '600',
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={colors.statusBar} />
      <View style={styles.blob} />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>BancoApp</Text>
        <Text style={styles.tagline}>Tu dinero, siempre contigo</Text>

        <Animated.View style={[styles.card, { transform: [{ translateX: shake }] }]}>
          <Text style={styles.titulo}>Iniciar sesión</Text>

          <AppInput
            label="Correo o teléfono"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="correo@ejemplo.com o 5512345678"
            autoCapitalize="none"
            keyboardType="email-address"
            error={error && !password ? error : ''}
          />

          <AppInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error=""
          />

          {error ? <Text style={styles.errorGeneral}>{error}</Text> : null}

          <AppButton
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            style={styles.boton}
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkWrap}>
            <Text style={styles.link}>
              ¿No tienes cuenta? <Text style={styles.linkBold}>Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
