import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePathname, useSegments, useFocusEffect } from 'expo-router';
import { useApp } from '../../context/AppContext';

/**
 * ScreenSyncObserver
 * Global background observer component placed inside AppProvider at root layout.
 * Listens for:
 * 1. Screen / Route transitions (via usePathname & useSegments)
 * 2. AppState changes (returning from background / other apps e.g. web browser to foreground)
 * Automatically triggers background database syncing to keep mobile and web apps seamlessly in sync.
 */
export function ScreenSyncObserver() {
  const pathname = usePathname();
  const segments = useSegments();
  const { syncInBackground } = useApp();
  const prevRouteKeyRef = useRef<string>('');

  const currentRouteKey = `${pathname || ''}:${segments.join('/')}`;

  // Screen change detection
  useEffect(() => {
    if (!prevRouteKeyRef.current) {
      // First mount - AppProvider already performs initial hydration
      prevRouteKeyRef.current = currentRouteKey;
      return;
    }

    if (prevRouteKeyRef.current !== currentRouteKey) {
      prevRouteKeyRef.current = currentRouteKey;
      // Screen changed! Trigger background database sync
      void syncInBackground({ screen: currentRouteKey });
    }
  }, [currentRouteKey, syncInBackground]);

  // App foreground detection (e.g. user toggles between Web app in browser and Mobile app)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void syncInBackground({ force: true, screen: 'app_foreground' });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [syncInBackground]);

  return null;
}

export interface UseScreenSyncOptions {
  onSync?: () => void | Promise<void>;
  force?: boolean;
}

/**
 * useScreenSync
 * Screen-level hook to ensure that whenever a specific screen comes into focus
 * (via tab switch, stack push, back navigation, or modal close), background database
 * syncing is triggered.
 */
export function useScreenSync(options?: UseScreenSyncOptions) {
  const { syncInBackground, isSyncing, lastSyncedAt } = useApp();
  const onSyncRef = useRef(options?.onSync);
  onSyncRef.current = options?.onSync;
  const force = options?.force;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void syncInBackground({ force }).then(() => {
        if (active && onSyncRef.current) {
          void onSyncRef.current();
        }
      });

      return () => {
        active = false;
      };
    }, [syncInBackground, force])
  );

  return { isSyncing, lastSyncedAt, syncInBackground };
}
