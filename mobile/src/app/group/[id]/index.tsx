import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Avatar, Button, Muted, Screen } from '../../../components/ui';
import { useGroup } from '../../../lib/hooks';
import { theme } from '../../../lib/colors';
import { WEEKDAYS, addDays, summarizeRange, toKey, todayKey } from '../../../lib/availability';

const MIN_HOURS = 2; // a person "counts" for a day if they have at least this many free hours

export default function MonthScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, me, loading, error, store } = useGroup(id);
  const [view, setView] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const { width } = useWindowDimensions();
  const cell = Math.floor((width - 32 - 6 * 5) / 7);

  // Nudge first-time users to set up their schedule
  useEffect(() => {
    if (me && state && !state.schedules[me.id]) {
      store?.saveSchedule(me.id, { mode: 'weekly', weekly: [[], [], [], [], [], [], []], rotating: { startDate: todayKey(), daysOn: 4, daysOff: 4, shift: { start: 7, end: 19 } }, awake: { start: 8, end: 23 } }).catch(() => {});
    }
  }, [me, state, store]);

  const monthStart = toKey(new Date(view.getFullYear(), view.getMonth(), 1));
  const monthEnd = toKey(new Date(view.getFullYear(), view.getMonth() + 1, 0));
  const summary = useMemo(
    () => (state ? summarizeRange(monthStart, monthEnd, state.members, state.schedules, state.overrides, MIN_HOURS) : {}),
    [state, monthStart, monthEnd],
  );

  if (loading) return <Screen><ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} /></Screen>;
  if (!state) return <Screen><View style={{ padding: 20 }}><Text>{error ?? 'Calendar not found.'}</Text></View></Screen>;

  const { group, members } = state;
  const total = members.length;
  const firstDow = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const cells: (string | null)[] = [...Array(firstDow).fill(null)];
  for (let k = monthStart; k <= monthEnd; k = addDays(k, 1)) cells.push(k);
  while (cells.length % 7) cells.push(null);
  const today = todayKey();
  const hasSchedule = me && state.schedules[me.id] && (state.schedules[me.id].mode === 'rotating' || state.schedules[me.id].weekly.some((d) => d.length));

  return (
    <Screen>
      <Stack.Screen options={{ title: group.name, headerRight: () => (
        <Pressable onPress={() => router.push(`/group/${id}/people`)} hitSlop={10}><Text style={{ color: theme.accent, fontWeight: '700' }}>Invite</Text></Pressable>
      ) }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* people legend */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {members.map((m) => (
            <View key={m.id} style={st.legend}>
              <Avatar name={m.nickname} color={m.color} size={22} />
              <Text style={{ fontWeight: '600', fontSize: 13 }}>{m.nickname}{m.id === me?.id ? ' (you)' : ''}</Text>
            </View>
          ))}
          <Pressable onPress={() => router.push(`/group/${id}/people`)} style={[st.legend, { borderStyle: 'dashed' }]}><Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>+ Invite</Text></Pressable>
        </ScrollView>

        {!hasSchedule ? (
          <Pressable onPress={() => router.push(`/group/${id}/schedule`)} style={st.nudge}>
            <Text style={{ fontWeight: '700', color: '#3730a3' }}>Add your work schedule</Text>
            <Text style={{ color: '#3730a3', fontSize: 13 }}>Takes 20 seconds — then your free time fills in automatically.</Text>
          </Pressable>
        ) : null}

        {/* month nav */}
        <View style={st.nav}>
          <Pressable onPress={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} hitSlop={10} style={st.navBtn}><Text style={st.navTxt}>‹</Text></Pressable>
          <Text style={st.month}>{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
          <Pressable onPress={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} hitSlop={10} style={st.navBtn}><Text style={st.navTxt}>›</Text></Pressable>
        </View>

        {/* grid */}
        <View style={st.grid}>
          {WEEKDAYS.map((d) => <Text key={d} style={[st.dow, { width: cell }]}>{d}</Text>)}
          {cells.map((k, i) => {
            if (!k) return <View key={'e' + i} style={{ width: cell, height: cell + 14 }} />;
            const s = summary[k];
            const everyone = total > 0 && s.everyoneHours >= MIN_HOURS;
            const most = total > 1 && s.bestCount >= Math.ceil(total / 2) && s.bestCount >= 2;
            const past = k < today;
            const dots = s.available.slice(0, 6);
            return (
              <Pressable key={k} onPress={() => router.push(`/group/${id}/day/${k}`)} style={({ pressed }) => [st.day, { width: cell, height: cell + 14 }, everyone && st.gold, !everyone && most && st.green, past && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.96 }] }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[st.num, k === today && st.today]}>{Number(k.slice(-2))}</Text>
                  {everyone ? <Text style={{ fontSize: 10, color: theme.gold }}>★</Text> : null}
                </View>
                <View style={st.dots}>
                  {dots.map((m) => <View key={m.id} style={[st.dot, { backgroundColor: m.color }]} />)}
                  {s.available.length > 6 ? <Text style={st.more}>+{s.available.length - 6}</Text> : null}
                </View>
                <Text style={st.cnt}>{total ? `${s.available.length}/${total}` : ''}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          <View style={st.key}><View style={[st.keyBox, st.gold]} /><Muted>Everyone free ({MIN_HOURS}h+)</Muted></View>
          <View style={st.key}><View style={[st.keyBox, st.green]} /><Muted>Most people</Muted></View>
          <Muted>• dot = a person with {MIN_HOURS}h+ free</Muted>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          <Button title="My work schedule" variant="secondary" onPress={() => router.push(`/group/${id}/schedule`)} style={{ flex: 1 }} />
          <Button title="Share link" onPress={() => router.push(`/group/${id}/people`)} style={{ flex: 1 }} />
        </View>
        {error ? <Text style={{ color: '#b91c1c', marginTop: 10 }}>{error}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingVertical: 4, paddingLeft: 4, paddingRight: 11 },
  nudge: { backgroundColor: theme.accentSoft, borderRadius: 12, padding: 12, marginBottom: 12 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center' },
  navTxt: { fontSize: 22, color: theme.ink, marginTop: -2 },
  month: { fontSize: 18, fontWeight: '800', color: theme.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dow: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: theme.muted, textTransform: 'uppercase', marginBottom: 2 },
  day: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: theme.line, borderRadius: 10, padding: 5, justifyContent: 'space-between' },
  gold: { backgroundColor: theme.goldSoft, borderColor: theme.gold },
  green: { backgroundColor: theme.greenSoft, borderColor: '#86efac' },
  num: { fontWeight: '700', fontSize: 13, color: theme.ink },
  today: { backgroundColor: theme.ink, color: '#fff', borderRadius: 6, paddingHorizontal: 5, overflow: 'hidden' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  more: { fontSize: 9, fontWeight: '700', color: theme.muted },
  cnt: { fontSize: 10, fontWeight: '700', color: theme.muted },
  key: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyBox: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderColor: theme.line },
});
