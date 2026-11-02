// Supabase project settings. The publishable key is safe to ship in the app —
// row-level security in supabase/schema.sql is what protects the data.
// Override with EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY in a .env file if needed.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://imvtvncyuayreuoppfvh.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_Ar_2z0r-7tES6JMvXIS_xw_xx4N6u59';

/** Base URL for invite links. Until you own a domain, links use the app scheme (gettogether://join/CODE). */
export const INVITE_WEB_BASE = process.env.EXPO_PUBLIC_INVITE_BASE ?? '';

export const MAX_PEOPLE = 20;
