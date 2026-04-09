import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';

function AuthGuard() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const router    = useRouter();
  const segments  = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(main)/home');
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={[s.loader, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthGuard />
    </ThemeProvider>
  );
}

const s = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
