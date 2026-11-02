import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, H, Input, Screen } from '../../components/ui';
import { useStore } from '../../lib/hooks';

/** Opened from an invite link: gettogether://join/ABC123 */
export default function JoinByLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { store, error } = useStore();
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { AsyncStorage.getItem('get-together/nickname').then((n) => n && setNickname(n)).catch(() => {}); }, []);

  const join = async () => {
    if (!store || !code) return;
    if (!nickname.trim()) { setMsg('What should people call you?'); return; }
    setBusy(true); setMsg(null);
    try {
      await AsyncStorage.setItem('get-together/nickname', nickname.trim());
      const g = await store.joinGroup(String(code), nickname.trim());
      router.replace(`/group/${g.id}`);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Screen>
      <View style={{ padding: 16 }}>
        <Card>
          <H sub={`Invite code ${String(code ?? '').toUpperCase()}`}>You're invited</H>
          <Input value={nickname} onChangeText={setNickname} placeholder="Your name" autoCapitalize="words" maxLength={24} />
          <Button title="Join calendar" onPress={join} loading={busy} disabled={!store} style={{ marginTop: 10 }} />
          {msg || error ? <Text style={{ color: '#b91c1c', marginTop: 10, fontWeight: '600' }}>{msg ?? error}</Text> : null}
        </Card>
      </View>
    </Screen>
  );
}
