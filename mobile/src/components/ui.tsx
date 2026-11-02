import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type TextInputProps, type ViewStyle } from 'react-native';
import { initials, theme } from '../lib/colors';

export function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

export function Chip({ name, color, small }: { name: string; color: string; small?: boolean }) {
  return (
    <View style={[s.chip, small && { paddingVertical: 2, paddingRight: 7 }]}>
      <Avatar name={name} color={color} size={small ? 18 : 22} />
      <Text style={[s.chipText, small && { fontSize: 12 }]} numberOfLines={1}>{name}</Text>
    </View>
  );
}

export function Button({ title, variant = 'primary', loading, style, ...rest }: PressableProps & { title: string; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; style?: ViewStyle }) {
  const bg = variant === 'primary' ? theme.accent : variant === 'danger' ? '#fee2e2' : variant === 'secondary' ? '#fff' : 'transparent';
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? '#b91c1c' : variant === 'ghost' ? theme.muted : theme.ink;
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: variant === 'secondary' ? theme.line : bg, opacity: pressed || rest.disabled ? 0.6 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor="#9aa0b8" {...props} style={[s.input, props.style]} />;
}

export function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={s.h}>{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Muted({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[s.sub, style]}>{children}</Text>;
}

export function Pill({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const c = color ?? theme.ink;
  return (
    <Pressable onPress={onPress} style={[s.pill, active && { backgroundColor: c, borderColor: c }]}>
      <Text style={{ fontWeight: '700', fontSize: 13, color: active ? '#fff' : theme.ink }}>{label}</Text>
    </Pressable>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: theme.bg }}>{children}</View>;
}

const s = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f3f9', borderRadius: 999, paddingVertical: 3, paddingLeft: 3, paddingRight: 10 },
  chipText: { fontWeight: '600', fontSize: 13, color: theme.ink, maxWidth: 120 },
  btn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  card: { backgroundColor: theme.card, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.line, padding: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff', color: theme.ink },
  h: { fontSize: 20, fontWeight: '800', color: theme.ink, letterSpacing: -0.3 },
  sub: { color: theme.muted, fontSize: 13.5, marginTop: 2 },
  pill: { borderWidth: 1.5, borderColor: theme.line, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13, backgroundColor: '#fff' },
});
