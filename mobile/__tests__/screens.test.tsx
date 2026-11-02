import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Stack: Object.assign(({ children }: any) => children ?? null, { Screen: () => null }),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: any) => { const React = require('react'); React.useEffect(() => { cb(); }, []); },
}));
jest.mock('react-native-google-mobile-ads', () => { throw new Error('native module not available in test'); });
let mockParams: any = {};

import RootLayout from '../src/app/_layout';
import Home from '../src/app/index';
import MonthScreen from '../src/app/group/[id]/index';
import DayScreen from '../src/app/group/[id]/day/[date]';
import ScheduleScreen from '../src/app/group/[id]/schedule';
import PeopleScreen from '../src/app/group/[id]/people';
import { getStore } from '../src/lib/store';

describe('startup', () => {
  it('root layout renders without a provider', async () => {
    await render(<RootLayout />);
    expect(screen.toJSON()).toBeTruthy();
  });
  it('home renders and leaves the spinner', async () => {
    await render(<Home />);
    await waitFor(() => screen.getByPlaceholderText('e.g. Marcus'), { timeout: 15000 });
  }, 20000);
});

describe('flow in local store', () => {
  let groupId = '';
  it('create a calendar', async () => {
    const store = await getStore();
    const g = await store.createGroup('Test cal', 'Marcus');
    groupId = g.id;
    expect(g.code).toHaveLength(6);
  });
  it('month screen renders', async () => {
    mockParams = { id: groupId };
    await render(<MonthScreen />);
    await screen.findByText('Marcus (you)', {}, { timeout: 10000 });
  });
  it('schedule screen renders and saves a preset', async () => {
    mockParams = { id: groupId };
    await render(<ScheduleScreen />);
    const btn = await screen.findByText('Mon–Fri 9 to 5', {}, { timeout: 10000 });
    fireEvent.press(btn);
    await new Promise((r) => setTimeout(r, 700));
    const store = await getStore();
    await new Promise<void>((res) => { let done = false; const un = store.subscribeGroup(groupId, (s) => { if (!done && s && Object.keys(s.schedules).length) { done = true; res(); } }); setTimeout(un, 50); });
  });
  it('day screen renders hours', async () => {
    mockParams = { id: groupId, date: '2026-11-04' };
    await render(<DayScreen />);
    await screen.findByText('5 PM', {}, { timeout: 10000 });
  });
  it('people screen renders', async () => {
    mockParams = { id: groupId };
    await render(<PeopleScreen />);
    await screen.findByText('Share invite link', {}, { timeout: 10000 });
  });
});
