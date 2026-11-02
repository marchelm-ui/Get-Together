import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../lib/colors';

export default function RootLayout() {
  return (
    <>
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
    </>
  );
}
