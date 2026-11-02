import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DayOverride, Group, GroupState, Member, WorkSchedule } from './types';
import { DEFAULT_SCHEDULE, overrideKey } from './availability';
import { nextColor } from './colors';
import { MAX_PEOPLE, SUPABASE_KEY, SUPABASE_URL } from './config';

export interface Store {
  readonly kind: 'supabase' | 'local';
  init(): Promise<void>;
  userId(): string;
  listMyGroups(): Promise<Group[]>;
  createGroup(name: string, nickname: string): Promise<Group>;
  joinGroup(code: string, nickname: string): Promise<Group>;
  subscribeGroup(groupId: string, cb: (s: GroupState | null) => void, onError?: (e: Error) => void): () => void;
  saveSchedule(memberId: string, schedule: WorkSchedule): Promise<void>;
  saveOverride(memberId: string, date: string, mask: number | null): Promise<void>;
  renameMember(memberId: string, nickname: string): Promise<void>;
  removeMember(memberId: string): Promise<void>;
  /** Local mode only: add a person who isn't on their own phone. */
  addLocalMember?(groupId: string, nickname: string): Promise<Member>;
}

const uid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
const genCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// =====================================================================
// Local store — everything on this phone (works with no server at all)
// =====================================================================
interface LocalDB { userId: string; groups: Group[]; members: Member[]; schedules: Record<string, WorkSchedule>; overrides: Record<string, DayOverride> }
const LOCAL_KEY = 'get-together/local/v1';

export class LocalStore implements Store {
  readonly kind = 'local' as const;
  private db: LocalDB = { userId: uid(), groups: [], members: [], schedules: {}, overrides: {} };
  private listeners = new Set<() => void>();

  async init() {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_KEY);
      if (raw) this.db = { ...this.db, ...JSON.parse(raw) };
    } catch {}
  }
  private async flush() {
    try { await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(this.db)); } catch {}
    this.listeners.forEach((l) => l());
  }
  userId() { return this.db.userId; }
  async listMyGroups() { return [...this.db.groups]; }
  async createGroup(name: string, nickname: string) {
    const g: Group = { id: uid(), code: genCode(), name, createdAt: new Date().toISOString() };
    this.db.groups.push(g);
    const m: Member = { id: uid(), groupId: g.id, userId: this.db.userId, nickname, color: nextColor([]), createdAt: g.createdAt };
    this.db.members.push(m);
    this.db.schedules[m.userId] ??= { ...DEFAULT_SCHEDULE };
    await this.flush();
    return g;
  }
  async joinGroup(code: string, nickname: string) {
    const g = this.db.groups.find((x) => x.code === code.toUpperCase().trim());
    if (!g) throw new Error('No calendar with that code on this phone. Set up Supabase to join calendars from other phones.');
    if (!this.db.members.some((m) => m.groupId === g.id && m.userId === this.db.userId)) await this.addLocalMember(g.id, nickname, this.db.userId);
    return g;
  }
  async addLocalMember(groupId: string, nickname: string, userId = 'local-' + uid()) {
    const existing = this.db.members.filter((m) => m.groupId === groupId);
    if (existing.length >= MAX_PEOPLE) throw new Error(`This calendar is full (${MAX_PEOPLE} people)`);
    const m: Member = { id: uid(), groupId, userId, nickname, color: nextColor(existing.map((x) => x.color)), createdAt: new Date().toISOString() };
    this.db.members.push(m);
    this.db.schedules[m.userId] ??= { ...DEFAULT_SCHEDULE };
    await this.flush();
    return m;
  }
  private state(groupId: string): GroupState | null {
    const group = this.db.groups.find((g) => g.id === groupId);
    if (!group) return null;
    const members = this.db.members.filter((m) => m.groupId === groupId);
    // schedules/overrides are stored per USER (so they follow people between calendars); expose them per member
    const schedules: Record<string, WorkSchedule> = {};
    const overrides: Record<string, DayOverride> = {};
    for (const m of members) {
      if (this.db.schedules[m.userId]) schedules[m.id] = this.db.schedules[m.userId];
      for (const o of Object.values(this.db.overrides)) if (o.memberId === m.userId) overrides[overrideKey(m.id, o.date)] = { ...o, memberId: m.id };
    }
    return { group, members, schedules, overrides };
  }
  subscribeGroup(groupId: string, cb: (s: GroupState | null) => void) {
    const l = () => cb(this.state(groupId));
    this.listeners.add(l);
    l();
    return () => { this.listeners.delete(l); };
  }
  private userOf(memberId: string) { return this.db.members.find((m) => m.id === memberId)?.userId ?? memberId; }
  async saveSchedule(memberId: string, schedule: WorkSchedule) { this.db.schedules[this.userOf(memberId)] = schedule; await this.flush(); }
  async saveOverride(memberId: string, date: string, mask: number | null) {
    const u = this.userOf(memberId);
    const k = overrideKey(u, date);
    if (mask === null) delete this.db.overrides[k]; else this.db.overrides[k] = { memberId: u, date, mask };
    await this.flush();
  }
  async renameMember(memberId: string, nickname: string) { const m = this.db.members.find((x) => x.id === memberId); if (m) m.nickname = nickname; await this.flush(); }
  async removeMember(memberId: string) {
    const u = this.userOf(memberId);
    this.db.members = this.db.members.filter((m) => m.id !== memberId);
    if (!this.db.members.some((m) => m.userId === u)) {
      delete this.db.schedules[u];
      for (const k of Object.keys(this.db.overrides)) if (this.db.overrides[k].memberId === u) delete this.db.overrides[k];
    }
    await this.flush();
  }
}

// =====================================================================
// Supabase store — shared across phones, realtime
// =====================================================================
type Row = Record<string, any>;
const toGroup = (r: Row): Group => ({ id: r.id, code: r.code, name: r.name, createdAt: r.created_at });
const toMember = (r: Row): Member => ({ id: r.id, groupId: r.group_id, userId: r.user_id, nickname: r.nickname, color: r.color, createdAt: r.created_at });

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;
  private uidValue = '';
  constructor() {
    this.sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  async init() {
    const { data } = await this.sb.auth.getSession();
    let session = data.session;
    if (!session) {
      const res = await this.sb.auth.signInAnonymously();
      if (res.error) throw new Error(res.error.message + ' — enable Anonymous sign-ins in Supabase Auth settings.');
      session = res.data.session;
    }
    this.uidValue = session?.user.id ?? '';
  }
  userId() { return this.uidValue; }
  private async rpc<T>(fn: string, args: Row): Promise<T> {
    const { data, error } = await this.sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  }
  async listMyGroups() {
    const { data, error } = await this.sb.from('groups').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(toGroup);
  }
  private async colorFor(groupId?: string) {
    if (!groupId) return nextColor([]);
    const { data } = await this.sb.from('members').select('color').eq('group_id', groupId);
    return nextColor((data ?? []).map((r: Row) => r.color));
  }
  async createGroup(name: string, nickname: string) {
    const g = toGroup(await this.rpc<Row>('create_group', { p_name: name, p_nickname: nickname, p_color: nextColor([]) }));
    await this.ensureSchedule();
    return g;
  }
  async joinGroup(code: string, nickname: string) {
    // color is chosen server-side-agnostic: pick one not used by current members (best effort)
    const { data: peek } = await this.sb.from('groups').select('id').eq('code', code.toUpperCase().trim()).maybeSingle();
    const color = await this.colorFor(peek?.id);
    const g = toGroup(await this.rpc<Row>('join_group', { p_code: code.toUpperCase().trim(), p_nickname: nickname, p_color: color }));
    await this.ensureSchedule();
    return g;
  }
  /** A person's schedule is stored once per user, so joining a new calendar brings it along automatically. */
  private async ensureSchedule() {
    const { data: s } = await this.sb.from('schedules').select('user_id').eq('user_id', this.uidValue).maybeSingle();
    if (!s) await this.sb.from('schedules').insert({ user_id: this.uidValue, data: DEFAULT_SCHEDULE });
  }
  private memberUser = new Map<string, string>();
  private userOf(memberId: string) { return this.memberUser.get(memberId) ?? this.uidValue; }
  private async fetchState(groupId: string): Promise<GroupState | null> {
    const { data: g, error } = await this.sb.from('groups').select('*').eq('id', groupId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!g) return null;
    const { data: ms } = await this.sb.from('members').select('*').eq('group_id', groupId).order('created_at');
    const members = (ms ?? []).map(toMember);
    for (const m of members) this.memberUser.set(m.id, m.userId);
    const userIds = members.map((m) => m.userId);
    const byUser = new Map(members.map((m) => [m.userId, m.id]));
    const schedules: Record<string, WorkSchedule> = {};
    const overrides: Record<string, DayOverride> = {};
    if (userIds.length) {
      const [{ data: ss }, { data: os }] = await Promise.all([
        this.sb.from('schedules').select('*').in('user_id', userIds),
        this.sb.from('day_overrides').select('*').in('user_id', userIds),
      ]);
      for (const r of ss ?? []) { const mid = byUser.get(r.user_id); if (mid) schedules[mid] = r.data as WorkSchedule; }
      for (const r of os ?? []) { const mid = byUser.get(r.user_id); if (mid) overrides[overrideKey(mid, r.date)] = { memberId: mid, date: r.date, mask: r.mask }; }
    }
    return { group: toGroup(g), members, schedules, overrides };
  }
  subscribeGroup(groupId: string, cb: (s: GroupState | null) => void, onError?: (e: Error) => void) {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try { const s = await this.fetchState(groupId); if (alive) cb(s); }
        catch (e) { onError?.(e as Error); }
      }, 150);
    };
    refresh();
    const ch = this.sb.channel('group-' + groupId + '-' + uid())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `group_id=eq.${groupId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_overrides' }, refresh)
      .subscribe();
    // Fallback polling in case realtime isn't enabled on the project
    const poll = setInterval(refresh, 20000);
    return () => { alive = false; clearInterval(poll); if (timer) clearTimeout(timer); this.sb.removeChannel(ch); };
  }
  async saveSchedule(memberId: string, schedule: WorkSchedule) {
    const { error } = await this.sb.from('schedules').upsert({ user_id: this.userOf(memberId), data: schedule, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
  async saveOverride(memberId: string, date: string, mask: number | null) {
    const user_id = this.userOf(memberId);
    const q = mask === null
      ? this.sb.from('day_overrides').delete().eq('user_id', user_id).eq('date', date)
      : this.sb.from('day_overrides').upsert({ user_id, date, mask, updated_at: new Date().toISOString() });
    const { error } = await q;
    if (error) throw new Error(error.message);
  }
  async renameMember(memberId: string, nickname: string) {
    const { error } = await this.sb.from('members').update({ nickname }).eq('id', memberId);
    if (error) throw new Error(error.message);
  }
  async removeMember(memberId: string) {
    const { error } = await this.sb.from('members').delete().eq('id', memberId);
    if (error) throw new Error(error.message);
  }
}

// =====================================================================
let storePromise: Promise<Store> | null = null;
/** Why the shared store wasn't used (shown on the home screen in offline mode). */
export let lastStoreError: string | null = null;
/** Tries Supabase first; falls back to the on-device store if the server can't be reached. */
export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = (async () => {
      if (SUPABASE_URL && SUPABASE_KEY) {
        try {
          const s = new SupabaseStore();
          await Promise.race([
            s.init(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out reaching the server')), 8000)),
          ]);
          return s;
        } catch (e) {
          lastStoreError = (e as Error)?.message || String(e);
          console.warn('Supabase unavailable, using local store:', lastStoreError);
        }
      }
      const l = new LocalStore();
      await l.init();
      return l;
    })();
  }
  return storePromise;
}
