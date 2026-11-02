import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Avatar, Button, Card, Chip, Muted, Screen } from '../../../../components/ui';
import { useGroup } from '../../../../lib/hooks';
import { theme } from '../../../../lib/colors';
import { HOURS, bit, formatDateLong, formatHour, has, overrideKey, summarizeDay } from '../../../../lib/availability';

export default function DayScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date: string }>();
  const { state, me, loading, store } = useGroup(id);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const day = useMemo(() => (state && date ? summarizeDay(date, state.members, state.schedules, state.overrides, 1) : null), [state, date]);
  if (loading || !day || !state || !date) return <Screen><ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} /></Screen>;

  const byId = Object.fromEntries(state.members.map((m) => [m.id, m]));
  const mine = me ? day.perMember.find((p) => p.member.id === me.id) : undefined;
  const myOverride = me ? state.overrides[overrideKey(me.id, date)] : undefined;

  const toggleHour = async (h: number) => {
    if (!me || !mine || !store) return;
    const next = mine.mask ^ bit(h);
    setSaving(true);
    try { await store.saveOverride(me.id, date, next); } finally { setSaving(false); }
  };
  const reset = async () => { if (me && store) { setSaving(true); try { await store.saveOverride(me.id, date, null); } finally { setSaving(false); } } };

  const total = day.total;
  const windows = day.windows.slice(0, 4);

  return (
    <Screen>
      <Stack.Screen options={{ title: formatDateLong(date) }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* best windows */}
        <Card>
          <Text style={st.h}>Best times</Text>
          {windows.length === 0 ? <Muted>Nobody has free hours marked for this day yet.</Muted> : windows.map((w, i) => {
            const everyone = w.count === total && total > 0;
            return (
              <View key={i} style={[st.win, everyone && { backgroundColor: theme.goldSoft, borderColor: '#f3dc8c' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15 }}>{formatHour(w.start)} – {formatHour(w.end)}</Text>
                  <Text style={{ color: everyone ? '#8a6a00' : theme.muted, fontSize: 12.5, fontWeight: '600' }}>{everyone ? '★ Everyone is free' : `${w.count} of ${total} free`}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  {w.memberIds.slice(0, 8).map((mid, j) => <View key={mid} style={{ marginLeft: j ? -6 : 0 }}><Avatar name={byId[mid]?.nickname ?? '?'} color={byId[mid]?.color ?? '#999'} size={24} /></View>)}
                </View>
              </View>
            );
          })}
        </Card>

        {/* my editing */}
        {me ? (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <Button title={editing ? 'Done editing' : 'Edit my hours'} variant={editing ? 'primary' : 'secondary'} onPress={() => setEditing(!editing)} style={{ flex: 1 }} loading={saving} />
            {myOverride ? <Button title="Reset to schedule" variant="ghost" onPress={reset} /> : null}
          </View>
        ) : null}
        {editing ? <Muted style={{ marginBottom: 8 }}>Tap an hour to flip it free ↔ busy for you on this day only.</Muted> : null}

        {/* hour by hour */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {HOURS.map((h) => {
            const ids = day.byHour[h];
            const everyone = total > 0 && ids.length === total;
            const meFree = mine ? has(mine.mask, h) : false;
            const pct = total ? ids.length / total : 0;
            return (
              <Pressable key={h} onPress={editing ? () => toggleHour(h) : undefined} style={[st.row, everyone && { backgroundColor: theme.goldSoft }, editing && meFree && { backgroundColor: theme.accentSoft }]}>
                <Text style={st.hour}>{formatHour(h)}</Text>
                <View style={{ flex: 1 }}>
                  <View style={st.track}>
                    {ids.map((mid, i) => <View key={mid} style={{ flex: 1, backgroundColor: byId[mid]?.color ?? '#999', height: 8, borderTopLeftRadius: i === 0 ? 4 : 0, borderBottomLeftRadius: i === 0 ? 4 : 0, borderTopRightRadius: i === ids.length - 1 ? 4 : 0, borderBottomRightRadius: i === ids.length - 1 ? 4 : 0 }} />)}
                    <View style={{ flex: Math.max(0, total - ids.length) || (ids.length ? 0 : 1) }} />
                  </View>
                  {ids.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                      {ids.map((mid) => <Chip key={mid} name={byId[mid]?.nickname ?? '?'} color={byId[mid]?.color ?? '#999'} small />)}
                    </View>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', width: 44 }}>
                  <Text style={[st.cnt, everyone && { color: '#8a6a00' }, pct === 0 && { color: '#c7cbd8' }]}>{ids.length}/{total}</Text>
                  {editing ? <Text style={{ fontSize: 11, fontWeight: '700', color: meFree ? theme.green : theme.red }}>{meFree ? 'free' : 'busy'}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </Card>

        {/* per-person summary */}
        <Card>
          <Text style={st.h}>Everyone's day</Text>
          {day.perMember.map((p) => (
            <View key={p.member.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <Avatar name={p.member.nickname} color={p.member.color} size={28} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{p.member.nickname}{p.member.id === me?.id ? ' (you)' : ''}</Text>
                <Muted>{p.hours ? `${p.hours} free hour${p.hours > 1 ? 's' : ''}${p.overridden ? ' · edited for this day' : ''}` : (state.schedules[p.member.id] ? 'Busy all day' : 'No schedule yet')}</Muted>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  h: { fontWeight: '800', fontSize: 15, marginBottom: 8, color: theme.ink },
  win: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.line, borderRadius: 12, padding: 10, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  hour: { width: 52, fontWeight: '700', fontSize: 12.5, color: theme.muted, paddingTop: 1 },
  track: { flexDirection: 'row', height: 8, borderRadius: 4, backgroundColor: '#edf0f6', overflow: 'hidden' },
  cnt: { fontWeight: '800', fontSize: 13, color: theme.ink },
});
