import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import styles from './styles';
import BankScreen from './BankScreen';

const USUARIO_VALIDO = 'admin';
const PASSWORD_VALIDO = '1234';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [shake] = useState(new Animated.Value(0));

  if (loggedIn) {
    return <BankScreen onLogout={() => setLoggedIn(false)} />;
  }

  const sacudir = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = () => {
    if (usuario.trim() === '' || password.trim() === '') {
      sacudir();
      Alert.alert('Error', 'Llena todos los campos.');
      return;
    }
    if (usuario === USUARIO_VALIDO && password === PASSWORD_VALIDO) {
      setLoggedIn(true);
    } else {
      sacudir();
      Alert.alert('Error', 'Usuario o contraseña incorrectos.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.loginFondo}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <View style={styles.loginBlob} />

      <View style={styles.loginContenido}>
        <Text style={styles.loginAppName}>BancoApp</Text>
        <Text style={styles.loginTagline}>Tu dinero, siempre contigo</Text>

        <Animated.View style={[styles.loginCard, { transform: [{ translateX: shake }] }]}>
          <Text style={styles.loginTitulo}>Iniciar sesión</Text>

          <Text style={styles.loginLabel}>Usuario</Text>
          <TextInput
            style={styles.input}
            value={usuario}
            onChangeText={setUsuario}
            placeholder="Tu usuario"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
          />

          <Text style={styles.loginLabel}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#aaa"
            secureTextEntry
          />

          <TouchableOpacity style={styles.boton} onPress={handleLogin}>
            <Text style={styles.botonTexto}>Entrar</Text>
          </TouchableOpacity>

          <Text style={styles.loginHint}>admin / 1234</Text>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}