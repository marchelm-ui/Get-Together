# Get-Together (SyncDays)

Shared availability calendar: up to 20 people mark the days they're free, and the days where everyone lines up light up.

Live version: https://claude.ai/artifact/1eBSZMpmmAySnUd85QL37n

## What it does

- **Overlap heatmap** — each day shows how many people are free (Maybe counts ½). Days where everyone is free are highlighted gold; days meeting a configurable threshold turn green.
- **Three-state marking** — Free / Maybe / Busy, click-or-drag painting, keyboard shortcuts (F/M/B/X, ←/→ for months).
- **Quick fills** — weekends free, weekdays free, all free, clear month.
- **Best days** — ranked list of top dates with who's missing on each.
- **Day detail** — who is free / maybe / busy / hasn't answered.
- **Required people** — star someone; days without them aren't highlighted.
- **Date window** — scope the search to a range.
- **Guests** — the owner can add people without accounts and mark days for them.
- **Choose a date** — pin the winner; everyone sees it.
- **Copy summary** — paste-ready text for group chats.

## Structure

`index.html` is the whole web app (vanilla JS, no build step). It runs in two modes:

- **Shared mode** — when hosted as a claude.ai artifact, it uses the `db` + `user` capabilities for a live multi-user store.
- **Local mode** — anywhere else (open the file directly), data stays in `localStorage`.

### Data model

```
members/<userId>   { name, color, proxy, updatedAt, days: { "YYYY-MM-DD": "f" | "m" | "b" } }
settings/main      { title, threshold, rangeStart, rangeEnd, required: [ids], picked: [dates], unmarkedIs }
```

`f` = free, `m` = maybe, `b` = busy; an absent key means "not answered" (configurable via `unmarkedIs`).

## Mobile app — next steps

The data model and scoring logic (`scoreDay`, `inRange`, `mark`) are self-contained and port directly. Suggested plan:

1. Pick a stack (React Native / Expo is the quickest path from this codebase).
2. Stand up a backend with auth + realtime sync (Supabase or Firebase map 1:1 onto the document model above).
3. Port the calendar grid, best-days list and day detail as native components.
4. Add mobile-specific wins: push nudges for "no response" people, device calendar import to auto-mark busy days, share sheet for invites.
