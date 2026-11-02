import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
// compile TS to a temp JS module
mkdirSync('/tmp/avtest', { recursive: true });
execSync('npx tsc src/lib/availability.ts src/lib/types.ts --outDir /tmp/avtest --module esnext --target es2020 --moduleResolution bundler --skipLibCheck --ignoreConfig', { stdio: 'inherit' });
writeFileSync('/tmp/avtest/package.json', '{"type":"module"}');
const A = await import('/tmp/avtest/availability.js');

const sched = (weekly, awake = { start: 8, end: 23 }) => ({ mode: 'weekly', weekly, rotating: { startDate: '2026-11-02', daysOn: 4, daysOff: 4, shift: { start: 7, end: 19 } }, awake });
const nineToFive = [[], [{start:9,end:17}], [{start:9,end:17}], [{start:9,end:17}], [{start:9,end:17}], [{start:9,end:17}], []];

test('9-5 weekday: free before 9 and after 5 within awake hours', () => {
  const m = A.freeMask(sched(nineToFive), '2026-11-02'); // Monday
  assert.deepEqual(A.hoursOf(m), [8, 17, 18, 19, 20, 21, 22]);
});
test('weekend: all awake hours free', () => {
  const m = A.freeMask(sched(nineToFive), '2026-11-07'); // Saturday
  assert.equal(A.popcount(m), 15);
});
test('night shift spills into next day', () => {
  const night = [[], [{start:23,end:7}], [], [], [], [], []]; // Monday night
  assert.deepEqual(A.hoursOf(A.workMask(sched(night), '2026-11-02')), [23]);
  assert.deepEqual(A.hoursOf(A.workMask(sched(night), '2026-11-03')), [0,1,2,3,4,5,6]);
});
test('rotating 4 on / 4 off', () => {
  const r = { startDate: '2026-11-02', daysOn: 4, daysOff: 4, shift: { start: 7, end: 19 } };
  assert.equal(A.isRotatingWorkDay(r, '2026-11-02'), true);
  assert.equal(A.isRotatingWorkDay(r, '2026-11-05'), true);
  assert.equal(A.isRotatingWorkDay(r, '2026-11-06'), false);
  assert.equal(A.isRotatingWorkDay(r, '2026-11-10'), true);
  assert.equal(A.isRotatingWorkDay(r, '2026-10-30'), false);
});
test('override wins', () => {
  const m = A.freeMask(sched(nineToFive), '2026-11-02', { memberId: 'a', date: '2026-11-02', mask: A.bit(12) });
  assert.deepEqual(A.hoursOf(m), [12]);
});
test('summarizeDay finds shared windows', () => {
  const members = [{id:'a',nickname:'A',color:'#000',groupId:'g',userId:'u',createdAt:''},{id:'b',nickname:'B',color:'#111',groupId:'g',userId:'v',createdAt:''}];
  const schedules = { a: sched(nineToFive), b: sched([[],[],[],[],[],[],[]], {start: 18, end: 22}) };
  const s = A.summarizeDay('2026-11-02', members, schedules, {});
  assert.deepEqual(A.hoursOf(s.everyoneMask), [18,19,20,21]);
  assert.equal(s.windows[0].count, 2);
  assert.equal(s.windows[0].start, 18);
  assert.equal(s.windows[0].end, 22);
  assert.equal(s.available.length, 2);
});
test('formatHour', () => { assert.equal(A.formatHour(0),'12 AM'); assert.equal(A.formatHour(13),'1 PM'); });
