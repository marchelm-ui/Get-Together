import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { Avatar, Button, Card, H, Input, Muted, Screen } from '../../../components/ui';
import { useGroup } from '../../../lib/hooks';
import { theme } from '../../../lib/colors';
import { INVITE_WEB_BASE, MAX_PEOPLE } from '../../../lib/config';

export default function PeopleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, me, loading, store } = useGroup(id);
  const [newName, setNewName] = useState('');
  const [rename, setRename] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  if (loading || !state) return <Screen><ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} /></Screen>;
  const { group, members } = state;
  const link = INVITE_WEB_BASE ? `${INVITE_WEB_BASE.replace(/\/$/, '')}/join/${group.code}` : Linking.createURL(`/join/${group.code}`);
  const text = `Join "${group.name}" on Get-Together so we can find a day that works for everyone.\n\nInvite code: ${group.code}\nLink: ${link}`;

  const share = async () => { try { await Share.share({ message: text }); } catch {} };
  const copy = async (t: string) => { await Clipboard.setStringAsync(t); setMsg('Copied!'); setTimeout(() => setMsg(null), 1500); };
  const addPerson = async () => {
    if (!store?.addLocalMember || !newName.trim()) return;
    try { await store.addLocalMember(group.id, newName.trim()); setNewName(''); } catch (e) { setMsg((e as Error).message); }
  };
  const saveRename = async () => { if (me && rename !== null && rename.trim() && store) { await store.renameMember(me.id, rename.trim()); setRename(null); } };
  const remove = async (mid: string) => {
    if (confirm !== mid) { setConfirm(mid); return; }
    setConfirm(null);
    try { await store?.removeMember(mid); if (mid === me?.id) router.replace('/'); } catch (e) { setMsg((e as Error).message); }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Card>
          <H sub="Anyone with the link or code can join. Their work schedule comes with them automatically.">Invite people</H>
          <View style={st.codeBox}>
            <Text style={st.code}>{group.code}</Text>
            <Pressable onPress={() => copy(group.code)} hitSlop={8}><Text style={{ color: theme.accent, fontWeight: '700' }}>Copy code</Text></Pressable>
          </View>
          <Button title="Share invite link" onPress={share} />
          <Pressable onPress={() => copy(link)} style={{ paddingVertical: 10 }}><Muted style={{ textAlign: 'center' }}>{link}</Muted></Pressable>
          {msg ? <Text style={{ color: theme.green, fontWeight: '700', textAlign: 'center' }}>{msg}</Text> : null}
        </Card>

        <Card>
          <H sub={`${members.length} of ${MAX_PEOPLE}`}>People</H>
          {members.map((m) => (
            <View key={m.id} style={st.row}>
              <Avatar name={m.nickname} color={m.color} />
              <View style={{ flex: 1 }}>
                {rename !== null && m.id === me?.id ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Input value={rename} onChangeText={setRename} autoFocus maxLength={24} style={{ flex: 1, paddingVertical: 6 }} />
                    <Button title="Save" onPress={saveRename} />
                  </View>
                ) : (
                  <>
                    <Text style={{ fontWeight: '700', fontSize: 15 }}>{m.nickname}{m.id === me?.id ? ' (you)' : ''}</Text>
                    <Muted>{state.schedules[m.id] ? 'Schedule set' : 'No schedule yet'}</Muted>
                  </>
                )}
              </View>
              {m.id === me?.id && rename === null ? <Pressable onPress={() => setRename(m.nickname)} hitSlop={8}><Text style={st.link}>Rename</Text></Pressable> : null}
              {m.id === me?.id || store?.kind === 'local' ? (
                <Pressable onPress={() => remove(m.id)} hitSlop={8}><Text style={[st.link, { color: '#b91c1c' }]}>{confirm === m.id ? 'Sure?' : m.id === me?.id ? 'Leave' : 'Remove'}</Text></Pressable>
              ) : null}
            </View>
          ))}
          {store?.kind === 'local' ? (
            <View style={{ marginTop: 10 }}>
              <Muted style={{ marginBottom: 6 }}>Offline mode: add people by hand and set their schedules for them.</Muted>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Input value={newName} onChangeText={setNewName} placeholder="Name" style={{ flex: 1 }} maxLength={24} />
                <Button title="Add" variant="secondary" onPress={addPerson} disabled={members.length >= MAX_PEOPLE} />
              </View>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  codeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.bg, borderRadius: 12, padding: 14, marginBottom: 10 },
  code: { fontSize: 26, fontWeight: '900', letterSpacing: 5, color: theme.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.line },
  link: { color: theme.accent, fontWeight: '700', fontSize: 13, marginLeft: 8 },
});
