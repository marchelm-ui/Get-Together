import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Card, H, Input, Muted, Screen } from '../components/ui';
import { useStore } from '../lib/hooks';
import { lastStoreError } from '../lib/store';
import { theme } from '../lib/colors';
import type { Group } from '../lib/types';

const NAME_KEY = 'get-together/nickname';

export default function Home() {
  const { store, error } = useStore();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [nickname, setNickname] = useState('');
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { AsyncStorage.getItem(NAME_KEY).then((n) => n && setNickname(n)).catch(() => {}); }, []);
  const load = useCallback(() => { if (store) store.listMyGroups().then(setGroups).catch((e) => setMsg(e.message)); }, [store]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const needName = () => { if (!nickname.trim()) { setMsg('Add your name first — that\'s how friends will see you.'); return true; } AsyncStorage.setItem(NAME_KEY, nickname.trim()).catch(() => {}); return false; };

  const create = async () => {
    if (!store || needName()) return;
    const name = newName.trim() || `${nickname.trim()}'s get-together`;
    setBusy('create'); setMsg(null);
    try { const g = await store.createGroup(name, nickname.trim()); setNewName(''); router.push(`/group/${g.id}`); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  };
  const join = async () => {
    if (!store || needName()) return;
    if (code.trim().length < 4) { setMsg('Enter the 6-letter invite code.'); return; }
    setBusy('join'); setMsg(null);
    try { const g = await store.joinGroup(code, nickname.trim()); setCode(''); router.push(`/group/${g.id}`); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  };

  if (!store && !error) return <Screen><ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} /></Screen>;

  return (
    <Screen>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        data={groups ?? []}
        keyExtractor={(g) => g.id}
        ListHeaderComponent={
          <View>
            <Card>
              <H sub="Shown to everyone on your calendars.">Your name</H>
              <Input value={nickname} onChangeText={setNickname} placeholder="e.g. Marcus" autoCapitalize="words" maxLength={24} />
            </Card>
            <Card>
              <H sub="Start a calendar and invite up to 20 people.">New calendar</H>
              <Input value={newName} onChangeText={setNewName} placeholder="Name it (e.g. Camping trip, Game night)" maxLength={40} />
              <Button title="Create calendar" onPress={create} loading={busy === 'create'} style={{ marginTop: 10 }} />
            </Card>
            <Card>
              <H sub="Got a link or code from a friend?">Join a calendar</H>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Invite code" autoCapitalize="characters" maxLength={6} style={{ flex: 1, letterSpacing: 2, fontWeight: '700' }} />
                <Button title="Join" variant="secondary" onPress={join} loading={busy === 'join'} />
              </View>
            </Card>
            {msg ? <Text style={st.msg}>{msg}</Text> : null}
            {error ? <Text style={st.msg}>{error}</Text> : null}
            {store?.kind === 'local' ? <Muted style={{ marginBottom: 10 }}>Offline mode — this phone only.{lastStoreError ? ` Server: ${lastStoreError}` : ''}</Muted> : null}
            <H>Your calendars</H>
            {groups && groups.length === 0 ? <Muted>None yet. Create one above or join with a code.</Muted> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/group/${item.id}`)} style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}>
            <View style={{ flex: 1 }}>
              <Text style={st.rowTitle}>{item.name}</Text>
              <Muted>Code {item.code}</Muted>
            </View>
            <Text style={{ color: theme.muted, fontSize: 22 }}>›</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  msg: { color: '#b91c1c', marginBottom: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.line, padding: 14, marginBottom: 8 },
  rowTitle: { fontWeight: '700', fontSize: 16, color: theme.ink },
});
