import { useEffect, useMemo, useState } from 'react';
import type { GroupState, Member } from './types';
import { getStore, type Store } from './store';

export function useStore() {
  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getStore().then(setStore).catch((e) => setError(e.message)); }, []);
  return { store, error };
}

export function useGroup(groupId: string | undefined) {
  const { store, error: storeError } = useStore();
  const [state, setState] = useState<GroupState | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(storeError);
  useEffect(() => {
    if (!store || !groupId) return;
    return store.subscribeGroup(groupId, setState, (e) => setError(e.message));
  }, [store, groupId]);
  const me: Member | undefined = useMemo(
    () => state?.members.find((m) => m.userId === store?.userId()),
    [state, store],
  );
  return { store, state, me, error: error ?? storeError, loading: state === undefined };
}
