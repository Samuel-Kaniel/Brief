import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import SwipeCardStack from '../components/SwipeCardStack';
import AnimatedPressable from '../components/AnimatedPressable';
import { Article } from '../types';
import { FEED_SOURCES } from '../data/feeds';
import { fetchArticlesForCategories } from '../services/rss';
import {
  clearPendingUndo,
  loadPendingUndo,
  loadSavedIds,
  loadSkippedIds,
  markSaved,
  markSkipped,
  resetSkipped,
  savePendingUndo,
  unmarkSkipped,
} from '../services/storage';
import { usePreferences } from '../context/PreferencesContext';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

const UNDO_BAR_MS = 4000;

export default function FeedScreen({ navigation }: Props) {
  const { preferences } = usePreferences();
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<Article[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [lastSkipped, setLastSkipped] = useState<Article | null>(null);
  const [restoredFront, setRestoredFront] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A content-based key (not the array reference) so a re-render that leaves
  // the actual category selection untouched never triggers a pointless refetch.
  const categoriesKey = useMemo(
    () => preferences.categories.slice().sort().join(','),
    [preferences.categories]
  );

  const hideUndoBar = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setLastSkipped(null);
  }, []);

  const presentUndoBar = useCallback((article: Article) => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    setLastSkipped(article);
    undoTimerRef.current = setTimeout(() => {
      // Auto-dismiss hides the bar only — persisted pending undo stays until TTL,
      // explicit Undo, or a newer skip.
      setLastSkipped(null);
      undoTimerRef.current = null;
    }, UNDO_BAR_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    setRestoredFront(null);
    if (preferences.categories.length === 0) {
      setArticles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [{ articles: fetched, failedSources }, saved, skipped, pending] = await Promise.all([
        fetchArticlesForCategories(FEED_SOURCES, preferences.categories),
        loadSavedIds(),
        loadSkippedIds(),
        loadPendingUndo(),
      ]);
      setSavedIds(saved);
      setSkippedIds(skipped);
      setArticles(fetched);
      if (pending) {
        presentUndoBar(pending.article);
      } else {
        hideUndoBar();
      }
      if (fetched.length === 0 && failedSources.length > 0) {
        setError('Could not reach any news sources. Try refreshing.');
      }
    } catch (err) {
      setError('Something went wrong loading your feed. Try refreshing.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesKey, presentUndoBar, hideUndoBar]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleArticles = useMemo(
    () => articles.filter((a) => !savedIds.has(a.id) && !skippedIds.has(a.id)),
    [articles, savedIds, skippedIds]
  );

  const deck = useMemo(() => {
    if (!restoredFront) return visibleArticles;
    return [restoredFront, ...visibleArticles.filter((a) => a.id !== restoredFront.id)];
  }, [visibleArticles, restoredFront]);

  const handleSwipeRight = useCallback(async (article: Article) => {
    setRestoredFront(null);
    const updated = await markSaved(article);
    setSavedIds(new Set(Object.keys(updated)));
  }, []);

  const handleSwipeLeft = useCallback(
    async (article: Article) => {
      setRestoredFront(null);
      const updated = await markSkipped(article.id);
      await savePendingUndo(article);
      setSkippedIds(new Set(updated));
      presentUndoBar(article);
    },
    [presentUndoBar]
  );

  const handleUndo = useCallback(async () => {
    if (!lastSkipped) return;
    const article = lastSkipped;
    hideUndoBar();
    const updated = await unmarkSkipped(article.id);
    await clearPendingUndo();
    setSkippedIds(new Set(updated));
    setRestoredFront(article);
  }, [lastSkipped, hideUndoBar]);

  const handleResetSkipped = useCallback(async () => {
    await resetSkipped();
    setSkippedIds(new Set());
    hideUndoBar();
    setRestoredFront(null);
  }, [hideUndoBar]);

  const handleTapOpen = useCallback((article: Article) => {
    Linking.openURL(article.link).catch(() => {});
  }, []);

  if (preferences.categories.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>No categories selected</Text>
        <Text style={styles.emptyBody}>Pick topics you care about to build your feed.</Text>
        <AnimatedPressable style={styles.actionButton} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.actionButtonText}>Choose categories</Text>
        </AnimatedPressable>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Fetching your news…</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerBar} edges={['top']}>
        <Text style={styles.headerTitle}>Brief</Text>
        <View style={styles.headerActions}>
          <AnimatedPressable style={styles.headerIconButton} onPress={() => load()} hitSlop={8}>
            <Feather name="refresh-cw" size={18} color="#93c5fd" />
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Saved')}
            hitSlop={8}
          >
            <Feather name="bookmark" size={18} color="#93c5fd" />
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('Settings')}
            hitSlop={8}
          >
            <Feather name="settings" size={18} color="#93c5fd" />
          </AnimatedPressable>
        </View>
      </SafeAreaView>

      {error && deck.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyBody}>{error}</Text>
          <AnimatedPressable style={styles.actionButton} onPress={() => load()}>
            <Text style={styles.actionButtonText}>Retry</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <View style={[styles.deckArea, lastSkipped ? styles.deckAreaWithUndo : null]}>
          <SwipeCardStack
            articles={deck}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onTapOpen={handleTapOpen}
            renderEmpty={() => (
              <View style={styles.centered}>
                <Text style={styles.emptyTitle}>You're all caught up</Text>
                <Text style={styles.emptyBody}>
                  No new stories in your topics right now — publishers haven't posted anything
                  since your last visit. Check back later, or pull up stories you skipped.
                </Text>
                <AnimatedPressable style={styles.actionButton} onPress={() => load()}>
                  <Text style={styles.actionButtonText}>Check for new stories</Text>
                </AnimatedPressable>
                {skippedIds.size > 0 && (
                  <AnimatedPressable style={styles.secondaryButton} onPress={handleResetSkipped}>
                    <Text style={styles.secondaryButtonText}>
                      Show {skippedIds.size} skipped {skippedIds.size === 1 ? 'story' : 'stories'} again
                    </Text>
                  </AnimatedPressable>
                )}
              </View>
            )}
          />
        </View>
      )}

      {lastSkipped && (
        <View pointerEvents="auto" style={[styles.undoBar, { marginBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.undoBarLabel}>Skipped</Text>
          <Text style={styles.undoBarDot}>·</Text>
          <AnimatedPressable onPress={handleUndo} hitSlop={8}>
            <Text style={styles.undoBarAction}>Undo</Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  centered: {
    flex: 1,
    backgroundColor: '#0f1115',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: { color: '#9ca3af', marginTop: 12 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: '#9ca3af', textAlign: 'center', fontSize: 15 },
  actionButton: {
    marginTop: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: { color: '#93c5fd', fontWeight: '600', fontSize: 14 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1a1f2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckArea: { flex: 1, paddingBottom: 24 },
  deckAreaWithUndo: { paddingBottom: 8 },
  undoBar: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1a1f2b',
  },
  undoBarLabel: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },
  undoBarDot: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  undoBarAction: { color: '#93c5fd', fontWeight: '600', fontSize: 14 },
});
