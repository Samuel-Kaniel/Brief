import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UserPreferences } from '../types';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from '../services/storage';
import { scheduleDailyDigest, cancelDailyDigest } from '../services/notifications';

interface PreferencesContextValue {
  preferences: UserPreferences;
  loading: boolean;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences().then((prefs) => {
      setPreferences(prefs);
      setLoading(false);
    });
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      savePreferences(next).then(() => {
        if (next.notificationsEnabled) {
          scheduleDailyDigest(next);
        } else {
          cancelDailyDigest();
        }
      });
      return next;
    });
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
