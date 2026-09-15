import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { UserPreferences } from '../types';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '../services/storage';
import { scheduleDailyDigest, cancelDailyDigest } from '../services/notifications';

interface PreferencesContextValue {
  preferences: UserPreferences;
  loading: boolean;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

function categoriesChanged(prev: UserPreferences, next: UserPreferences): boolean {
  if (prev.categories.length !== next.categories.length) return true;
  const prevSet = new Set(prev.categories);
  return next.categories.some((id) => !prevSet.has(id));
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const preferencesRef = useRef(preferences);
  const writeGen = useRef(0);

  useEffect(() => {
    loadPreferences().then((prefs) => {
      preferencesRef.current = prefs;
      setPreferences(prefs);
      setLoading(false);
    });
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const prev = preferencesRef.current;
    const next = { ...prev, ...patch };
    preferencesRef.current = next;
    setPreferences(next);

    const writeId = ++writeGen.current;
    await savePreferences(next);
    if (writeId !== writeGen.current) return;

    if (next.notificationsEnabled) {
      await scheduleDailyDigest(next, { refreshBody: categoriesChanged(prev, next) });
    } else {
      await cancelDailyDigest();
    }
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, loading, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider');
  return ctx;
}
