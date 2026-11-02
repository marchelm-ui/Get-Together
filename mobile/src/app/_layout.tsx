import 'react-native-url-polyfill/auto';
import React from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../lib/colors';
import { AdBanner } from '../components/AdBanner';
import { ErrorScreen, RootErrorBoundary } from '../components/ErrorScreen';

/** Expo Router renders this for any error thrown while rendering a route. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} retry={retry} />;
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
    <SafeAreaProvider>
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
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
    </SafeAreaView>
    </SafeAreaProvider>
    </RootErrorBoundary>
  );
}
