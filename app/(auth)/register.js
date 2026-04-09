import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import { registerUser } from '../../services/auth';
import {
  validateRequired,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
  validateCURP,
  validateDate,
} from '../../constants/validation';
import { colors, spacing, radii, fontSizes } from '../../styles/theme';

const INITIAL_FORM = {
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  curp: '',
  fechaNacimiento: '',
  direccion: '',
};

const INITIAL_ERRORS = { ...INITIAL_FORM };

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // --- Validación por paso ---
  const validateStep1 = () => {
    const e = {};
    e.nombre = validateRequired(form.nombre, 'El nombre').message;
    e.email = validateEmail(form.email).message;
    e.password = validatePassword(form.password).message;
    e.confirmPassword = validatePasswordMatch(form.password, form.confirmPassword).message;
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.values(e).every((msg) => !msg);
  };

  const validateStep2 = () => {
    const e = {};
    e.phone = validatePhone(form.phone).message;
    e.curp = validateCURP(form.curp).message;
    e.fechaNacimiento = validateDate(form.fechaNacimiento).message;
    e.direccion = validateRequired(form.direccion, 'La dirección').message;
    setErrors((prev) => ({ ...prev, ...e }));
    return Object.values(e).every((msg) => !msg);
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;

    setGeneralError('');
    setLoading(true);
    try {
      await registerUser(form);
      // Firebase auto-inicia sesión tras registro →
      // onAuthStateChanged dispara → auth guard redirige a /(main)/home
    } catch (err) {
      setGeneralError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.fondo}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <View style={styles.blob} />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appName}>BancoApp</Text>
        <Text style={styles.tagline}>Crea tu cuenta</Text>

        {/* Indicador de paso */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
          <View style={styles.stepLine} />
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
        </View>
        <Text style={styles.stepLabel}>Paso {step} de 2</Text>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.titulo}>Datos personales</Text>

              <AppInput
                label="Nombre completo"
                value={form.nombre}
                onChangeText={set('nombre')}
                placeholder="Juan Pablo García"
                autoCapitalize="words"
                error={errors.nombre}
              />

              <AppInput
                label="Correo electrónico"
                value={form.email}
                onChangeText={set('email')}
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              <AppInput
                label="Contraseña"
                value={form.password}
                onChangeText={set('password')}
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                secureTextEntry
                error={errors.password}
              />

              <AppInput
                label="Confirmar contraseña"
                value={form.confirmPassword}
                onChangeText={set('confirmPassword')}
                placeholder="Repite tu contraseña"
                secureTextEntry
                error={errors.confirmPassword}
              />

              <AppButton title="Siguiente" onPress={handleNext} style={styles.boton} />
            </>
          ) : (
            <>
              <Text style={styles.titulo}>Información de contacto</Text>

              <AppInput
                label="Número de teléfono"
                value={form.phone}
                onChangeText={set('phone')}
                placeholder="5512345678"
                keyboardType="phone-pad"
                maxLength={13}
                error={errors.phone}
              />

              <AppInput
                label="CURP"
                value={form.curp}
                onChangeText={(v) => set('curp')(v.toUpperCase())}
                placeholder="LOOA531113HTCPBN07"
                autoCapitalize="characters"
                maxLength={18}
                error={errors.curp}
              />

              <AppInput
                label="Fecha de nacimiento"
                value={form.fechaNacimiento}
                onChangeText={set('fechaNacimiento')}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                error={errors.fechaNacimiento}
              />

              <AppInput
                label="Dirección"
                value={form.direccion}
                onChangeText={set('direccion')}
                placeholder="Calle, número, colonia, ciudad"
                autoCapitalize="sentences"
                error={errors.direccion}
              />

              {generalError ? (
                <Text style={styles.errorGeneral}>{generalError}</Text>
              ) : null}

              <AppButton
                title="Crear cuenta"
                onPress={handleRegister}
                loading={loading}
                style={styles.boton}
              />

              <AppButton
                title="Regresar"
                onPress={() => setStep(1)}
                variant="ghost"
                style={styles.botonBack}
                disabled={loading}
              />
            </>
          )}

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.linkWrap}
          >
            <Text style={styles.link}>
              ¿Ya tienes cuenta? <Text style={styles.linkBold}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.12,
    top: -60,
    right: -60,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.surface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textLight,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  stepLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
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
    color: colors.textDark,
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
  botonBack: {
    marginTop: spacing.sm,
  },
  linkWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  link: {
    fontSize: fontSizes.sm,
    color: colors.textMid,
  },
  linkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
