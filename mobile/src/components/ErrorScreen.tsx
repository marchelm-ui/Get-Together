import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

/**
 * Shown instead of a blank/closed app when something throws.
 * Expo Router picks up a route's exported `ErrorBoundary`; the root layout exports this one.
 */
export function ErrorScreen({ error, retry }: { error: Error; retry?: () => void }) {
  const detail = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}\n\n${error?.stack ?? ''}`;
  return (
    <View style={{ flex: 1, backgroundColor: '#fff4f4', padding: 20, paddingTop: 60 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: '#b91c1c', marginBottom: 6 }}>Something went wrong</Text>
      <Text style={{ color: '#7f1d1d', marginBottom: 12 }}>Screenshot this and send it to Claude — it's the exact error.</Text>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12 }}>
        <Text selectable style={{ fontFamily: 'monospace', fontSize: 12, color: '#15192b' }}>{detail}</Text>
      </ScrollView>
      {retry ? (
        <Pressable onPress={retry} style={{ marginTop: 14, backgroundColor: '#b91c1c', borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('RootErrorBoundary', error); }
  render() {
    if (this.state.error) return <ErrorScreen error={this.state.error} retry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
