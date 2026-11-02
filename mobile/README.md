# Get-Together — mobile app

Expo / React Native app. Up to 20 people share a calendar; everyone's free time is computed from their **work schedule** (set once, follows them into every calendar), and the month view shows at a glance who's free which day. Tap a day for an hour-by-hour breakdown.

## Run it on your phone (Pixel)

1. Install **Expo Go** from the Play Store.
2. On your computer:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Scan the QR code with Expo Go. The app reloads live as you edit.

Works immediately in **offline mode** (data stays on the phone). For real sharing between phones, do the one-time server setup below.

## One-time server setup (Supabase, free)

The project URL and publishable key are already in `src/lib/config.ts`. Two things remain in the Supabase dashboard:

1. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**.
   This creates the tables, the invite-code / join functions, row-level security, and realtime.
2. **Authentication → Sign In / Providers → Anonymous sign-ins → Enable.**
   People join from a link with no account or password; each phone gets an anonymous identity.

That's it. Restart the app and the "Offline mode" note disappears.

Optional: **Database → Replication** (or Publications) — confirm `members`, `schedules`, `day_overrides` are in `supabase_realtime`. The SQL does this; the app also polls every 20 s as a fallback.

## How it works

| Screen | What it does |
|---|---|
| Home | Your name, create a calendar, join by 6-letter code, list of your calendars |
| Month | Color dot per person who has 2+ free hours that day · gold ★ = everyone free · green = most people |
| Day | 24 hourly rows, each showing who's free (colored bar + name chips) · "Best times" windows at top · **Edit my hours** to override just that day |
| My work schedule | Same-every-week (Mon–Fri presets like 9-5, 7-3, night 11-7, or custom per day) **or** rotating (4 on / 4 off etc.) · "Up for plans" hours |
| People & invite | Invite code, shareable link, share sheet, rename, leave |

### Schedules follow the person
`schedules` and `day_overrides` are keyed by **user**, not by calendar. Join a second calendar and your busy days are already there. Edit your schedule anywhere and every calendar updates.

### Data model
```
groups(id, code, name, created_by)
members(id, group_id, user_id, nickname, color)        -- one row per person per calendar, max 20
schedules(user_id, data jsonb)                         -- WorkSchedule (see src/lib/types.ts)
day_overrides(user_id, date, mask int)                 -- 24-bit mask, bit h = free at hour h
```
Free hours for a day = override if present, else `awake − work`. Night shifts crossing midnight spill into the next day correctly. Logic lives in `src/lib/availability.ts` (pure, unit-tested: `npm test`).

## Invite links

Right now links use the app scheme: `gettogether://join/CODE` (in Expo Go: `exp://…/--/join/CODE`). They open the app's Join screen directly. To get normal `https://` links that also work for people who don't have the app yet, point `EXPO_PUBLIC_INVITE_BASE` at a domain you own and set up [universal/app links](https://docs.expo.dev/linking/into-your-app/) — a later step once you have a domain.

## Commands
```bash
npx expo start        # dev server
npx tsc --noEmit      # type-check
npm test              # logic tests
npx expo-doctor       # dependency health
```

## Next ideas
- Push nudge to people who haven't set a schedule
- Import busy times from the phone calendar
- Pick a date and send everyone an event
- Time-zone support for far-flung groups
