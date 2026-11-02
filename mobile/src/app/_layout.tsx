import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/colors';
import { AdBanner } from '../components/AdBanner';

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingBottom: insets.bottom }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerShadowVisible: false,
          headerTintColor: theme.ink,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Get-Together' }} />
        <Stack.Screen name="join/[code]" options={{ title: 'Join calendar' }} />
        <Stack.Screen name="group/[id]/index" options={{ title: 'Calendar' }} />
        <Stack.Screen name="group/[id]/day/[date]" options={{ title: 'Day' }} />
        <Stack.Screen name="group/[id]/schedule" options={{ title: 'My work schedule', presentation: 'modal' }} />
        <Stack.Screen name="group/[id]/people" options={{ title: 'People & invite', presentation: 'modal' }} />
      </Stack>
      <AdBanner />
    </View>
  );
}
