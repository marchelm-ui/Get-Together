/** 20 distinct, friendly colors — one per person. Order chosen so neighbors contrast. */
export const PERSON_COLORS = [
  '#4f46e5', '#16a34a', '#ea580c', '#0891b2', '#db2777',
  '#ca8a04', '#7c3aed', '#0d9488', '#dc2626', '#2563eb',
  '#65a30d', '#c026d3', '#b45309', '#047857', '#be123c',
  '#1d4ed8', '#9333ea', '#15803d', '#0e7490', '#b91c1c',
];

export function nextColor(used: string[]): string {
  const taken = new Set(used);
  return PERSON_COLORS.find((c) => !taken.has(c)) ?? PERSON_COLORS[used.length % PERSON_COLORS.length];
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0] ?? '').join('').toUpperCase() || '?';
}

export const theme = {
  bg: '#f6f7fb',
  card: '#ffffff',
  ink: '#15192b',
  muted: '#6b7190',
  line: '#e5e8f0',
  accent: '#4f46e5',
  accentSoft: '#eef0ff',
  gold: '#f5b400',
  goldSoft: '#fff4c7',
  green: '#16a34a',
  greenSoft: '#f0fdf4',
  red: '#ef4444',
  radius: 14,
};
