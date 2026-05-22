import { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { getTwoFactorEnabled } from './authService';
import { C } from './theme';

import LoginScreen             from './LoginScreen';
import DashboardScreen         from './screens/DashboardScreen';
import FinanceScreen           from './screens/FinanceScreen';
import ChatHistoryScreen       from './screens/ChatHistoryScreen';
import ChatScreen              from './screens/ChatScreen';
import CreditScreen            from './screens/CreditScreen';
import InvestScreen            from './screens/InvestScreen';
import TwoFactorVerifyScreen   from './screens/TwoFactorVerifyScreen';

const Tab    = createBottomTabNavigator();
const Stack  = createNativeStackNavigator();

// ── Athena stack: chat history → individual chat ──────────────────────────
function AthenaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatHistory" component={ChatHistoryScreen} />
      <Stack.Screen name="Chat"        component={ChatScreen} />
    </Stack.Navigator>
  );
}

// icon name tuples [focused, unfocused]
const TAB_ICONS = {
  Inicio:    ['home',        'home-outline'],
  Finanzas:  ['cash',        'cash-outline'],
  Athena:    ['chatbubbles', 'chatbubbles-outline'],
  Crédito:   ['analytics',   'analytics-outline'],
  Inversión: ['trending-up', 'trending-up-outline'],
};

export default function App() {
  const [user,         setUser]         = useState(null);
  const [authReady,    setAuthReady]    = useState(false);
  const [tfaRequired,  setTfaRequired]  = useState(false);
  const [tfaVerified,  setTfaVerified]  = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const enabled = await getTwoFactorEnabled(u.uid).catch(() => false);
        setTfaRequired(enabled);
        setTfaVerified(false);
      } else {
        setTfaRequired(false);
        setTfaVerified(false);
      }
      setUser(u ?? null);
      setAuthReady(true);
    });
  }, []);

  const handleTfaVerified = useCallback(() => setTfaVerified(true), []);

  if (!authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.purple} size="large" />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (tfaRequired && !tfaVerified) {
    return <TwoFactorVerifyScreen onVerified={handleTfaVerified} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              const [active, inactive] = TAB_ICONS[route.name];
              return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
            },
            tabBarActiveTintColor:   C.purple,
            tabBarInactiveTintColor: C.muted,
            tabBarStyle: {
              backgroundColor:  C.bgBase,
              borderTopColor:   C.border,
              borderTopWidth:   StyleSheet.hairlineWidth,
              height:           60,
              paddingBottom:    8,
              paddingTop:       6,
              paddingHorizontal: 8,
            },
            tabBarLabelStyle: {
              fontSize:           10,
              fontWeight:         '600',
              includeFontPadding: false,
            },
            tabBarItemStyle: { paddingHorizontal: 0 },
          })}
        >
          <Tab.Screen name="Inicio"    component={DashboardScreen} />
          <Tab.Screen name="Finanzas"  component={FinanceScreen} />
          <Tab.Screen name="Athena"    component={AthenaStack} />
          <Tab.Screen name="Crédito"   component={CreditScreen} />
          <Tab.Screen name="Inversión" component={InvestScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
