import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, H, Muted, Pill, Screen } from '../../../components/ui';
import { useGroup } from '../../../lib/hooks';
import { theme } from '../../../lib/colors';
import { DEFAULT_SCHEDULE, SHIFT_PRESETS, WEEKDAYS, addDays, formatDateShort, formatHour, formatSpan, todayKey } from '../../../lib/availability';
import type { HourSpan, WorkSchedule } from '../../../lib/types';

const sameSpan = (a?: HourSpan, b?: HourSpan) => !!a && !!b && a.start === b.start && a.end === b.end;

function HourStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Muted>{label}</Muted>
      <View style={st.stepper}>
        <Pressable onPress={() => onChange((value + 23) % 24)} style={st.stepBtn} hitSlop={6}><Text style={st.stepTxt}>−</Text></Pressable>
        <Text style={{ fontWeight: '800', fontSize: 15, minWidth: 56, textAlign: 'center' }}>{formatHour(value)}</Text>
        <Pressable onPress={() => onChange((value + 1) % 24)} style={st.stepBtn} hitSlop={6}><Text style={st.stepTxt}>+</Text></Pressable>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, me, loading, store } = useGroup(id);
  const [s, setS] = useState<WorkSchedule | null>(null);
  const [customDay, setCustomDay] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (s === null && state && me) setS(state.schedules[me.id] ?? { ...DEFAULT_SCHEDULE, weekly: [[], [], [], [], [], [], []] });
  }, [state, me, s]);

  const update = (patch: Partial<WorkSchedule>) => {
    if (!s || !me || !store) return;
    const next = { ...s, ...patch };
    setS(next);
    setStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => store.saveSchedule(me.id, next).then(() => setStatus('saved')).catch(() => setStatus('error')), 500);
  };
  const setDay = (d: number, spans: HourSpan[]) => { if (!s) return; const weekly = s.weekly.map((x, i) => (i === d ? spans : x)); update({ weekly }); };

  if (loading || !s) return <Screen><ActivityIndicator style={{ marginTop: 60 }} color={theme.accent} /></Screen>;
  if (!me) return <Screen><View style={{ padding: 20 }}><Text>Join this calendar first.</Text></View></Screen>;

  const weekdayShift = s.weekly[1]?.[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Muted style={{ marginBottom: 12 }}>Work hours are busy. Everything else inside your "up for plans" hours shows as free — automatically, every week. You can still tweak any single day from the calendar.</Muted>

        <Card>
          <H>My schedule type</H>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pill label="Same every week" active={s.mode === 'weekly'} onPress={() => update({ mode: 'weekly' })} color={theme.accent} />
            <Pill label="Rotating (e.g. 4 on / 4 off)" active={s.mode === 'rotating'} onPress={() => update({ mode: 'rotating' })} color={theme.accent} />
          </View>
        </Card>

        {s.mode === 'weekly' ? (
          <Card>
            <H sub="Pick a shift for all weekdays, then adjust any day.">Weekly hours</H>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {SHIFT_PRESETS.map((p) => (
                <Pill key={p.label} label={`Mon–Fri ${p.label}`} active={sameSpan(weekdayShift, p.span) && [1, 2, 3, 4, 5].every((d) => sameSpan(s.weekly[d]?.[0], p.span))}
                  onPress={() => update({ weekly: s.weekly.map((x, i) => (i >= 1 && i <= 5 ? [p.span] : x)) })} />
              ))}
              <Pill label="Clear all" onPress={() => update({ weekly: [[], [], [], [], [], [], []] })} />
            </View>
            {WEEKDAYS.map((name, d) => {
              const spans = s.weekly[d] ?? [];
              const cur = spans[0];
              return (
                <View key={d} style={st.dayRow}>
                  <Text style={st.dayName}>{name}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    <Pill label="Off" active={!cur} onPress={() => { setDay(d, []); setCustomDay(null); }} color={theme.green} />
                    {SHIFT_PRESETS.map((p) => <Pill key={p.label} label={p.label} active={sameSpan(cur, p.span)} onPress={() => { setDay(d, [p.span]); setCustomDay(null); }} />)}
                    <Pill label={cur && !SHIFT_PRESETS.some((p) => sameSpan(p.span, cur)) ? `Custom ${formatSpan(cur)}` : 'Custom…'} active={customDay === d} onPress={() => { setCustomDay(customDay === d ? null : d); if (!cur) setDay(d, [{ start: 9, end: 17 }]); }} color={theme.accent} />
                  </ScrollView>
                  {customDay === d && cur ? (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <HourStepper label="Start" value={cur.start} onChange={(v) => setDay(d, [{ ...cur, start: v }])} />
                      <HourStepper label="End" value={cur.end % 24} onChange={(v) => setDay(d, [{ ...cur, end: v === 0 ? 24 : v }])} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        ) : (
          <Card>
            <H sub="Common for nurses, firefighters, plant and warehouse shifts.">Rotating pattern</H>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <Counter label="Days on" value={s.rotating.daysOn} onChange={(v) => update({ rotating: { ...s.rotating, daysOn: v } })} />
              <Counter label="Days off" value={s.rotating.daysOff} onChange={(v) => update({ rotating: { ...s.rotating, daysOff: v } })} />
            </View>
            <Muted style={{ marginBottom: 6 }}>Shift hours on work days</Muted>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {SHIFT_PRESETS.map((p) => <Pill key={p.label} label={p.label} active={sameSpan(s.rotating.shift, p.span)} onPress={() => update({ rotating: { ...s.rotating, shift: p.span } })} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <HourStepper label="Start" value={s.rotating.shift.start} onChange={(v) => update({ rotating: { ...s.rotating, shift: { ...s.rotating.shift, start: v } } })} />
              <HourStepper label="End" value={s.rotating.shift.end % 24} onChange={(v) => update({ rotating: { ...s.rotating, shift: { ...s.rotating.shift, end: v === 0 ? 24 : v } } })} />
            </View>
            <Muted style={{ marginBottom: 6 }}>First day of your next "on" stretch</Muted>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {Array.from({ length: 14 }, (_, i) => addDays(todayKey(), i - 3)).map((k) => (
                <Pill key={k} label={formatDateShort(k)} active={s.rotating.startDate === k} onPress={() => update({ rotating: { ...s.rotating, startDate: k } })} color={theme.accent} />
              ))}
            </ScrollView>
          </Card>
        )}

        <Card>
          <H sub="Outside these hours you're never shown as free.">I'm up for plans</H>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <HourStepper label="From" value={s.awake.start} onChange={(v) => update({ awake: { ...s.awake, start: v } })} />
            <HourStepper label="Until" value={s.awake.end % 24} onChange={(v) => update({ awake: { ...s.awake, end: v === 0 ? 24 : v } })} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Button title="Done" onPress={() => router.back()} style={{ flex: 1 }} />
          <Muted>{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : status === 'error' ? 'Could not save' : ''}</Muted>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Muted>{label}</Muted>
      <View style={st.stepper}>
        <Pressable onPress={() => onChange(Math.max(1, value - 1))} style={st.stepBtn} hitSlop={6}><Text style={st.stepTxt}>−</Text></Pressable>
        <Text style={{ fontWeight: '800', fontSize: 16, minWidth: 40, textAlign: 'center' }}>{value}</Text>
        <Pressable onPress={() => onChange(Math.min(14, value + 1))} style={st.stepBtn} hitSlop={6}><Text style={st.stepTxt}>+</Text></Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dayRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.line },
  dayName: { fontWeight: '800', fontSize: 13, color: theme.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.line, borderRadius: 12, backgroundColor: '#fff', padding: 4, marginTop: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 20, fontWeight: '700', color: theme.ink, marginTop: -2 },
});
