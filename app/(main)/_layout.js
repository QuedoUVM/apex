import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const TABS = [
  { name: 'home',      label: 'Inicio',    icon: 'home-outline' },
  { name: 'gastos',    label: 'Gastos',    icon: 'trending-down-outline' },
  { name: 'ingresos',  label: 'Ingresos',  icon: 'trending-up-outline' },
  { name: 'credito',   label: 'Crédito',   icon: 'shield-checkmark-outline' },
  { name: 'perfil',    label: 'Perfil',    icon: 'person-outline' },
];

export default function MainLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
          height:          62,
          paddingBottom:   10,
          paddingTop:      6,
        },
        tabBarLabelStyle: {
          fontSize:   11,
          fontWeight: '500',
        },
      }}
    >
      {TABS.map(({ name, label, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} size={size} color={color} />
            ),
          }}
        />
      ))}
      {/* Pantallas sin tab visible */}
      <Tabs.Screen name="inversiones"   options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
    </Tabs>
  );
}
