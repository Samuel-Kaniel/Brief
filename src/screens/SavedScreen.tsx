import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Article } from '../types';
import { CATEGORIES } from '../data/feeds';
import { loadSavedArticles, unmarkSaved } from '../services/storage';
import ArticleImage from '../components/ArticleImage';
import AnimatedPressable from '../components/AnimatedPressable';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Saved'>;

export default function SavedScreen({ navigation }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const saved = await loadSavedArticles();
    const list = Object.values(saved).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    setArticles(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemove = useCallback(async (id: string) => {
    await unmarkSaved(id);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleOpen = useCallback((article: Article) => {
    Linking.openURL(article.link).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={{ width: 50 }} />
      </View>

      {!loading && articles.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No saved stories yet</Text>
          <Text style={styles.emptyBody}>Swipe right on a story in the feed to save it here.</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const categoryLabel = CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
            return (
              <AnimatedPressable style={styles.row} scaleTo={0.98} onPress={() => handleOpen(item)}>
                <ArticleImage article={item} categoryLabel={categoryLabel} style={styles.thumb} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.sourceName}
                  </Text>
                </View>
                <AnimatedPressable onPress={() => handleRemove(item.id)} hitSlop={12} style={styles.removeButton}>
                  <Text style={styles.removeText}>Remove</Text>
                </AnimatedPressable>
              </AnimatedPressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  back: { color: '#93c5fd', fontSize: 15, fontWeight: '600', width: 50 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptyBody: { color: '#9ca3af', fontSize: 14, textAlign: 'center' },
  listContent: { padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161a21',
    borderRadius: 16,
    padding: 10,
    gap: 12,
    marginBottom: 4,
  },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 18 },
  rowMeta: { color: '#9ca3af', fontSize: 12 },
  removeButton: { paddingHorizontal: 8, paddingVertical: 6 },
  removeText: { color: '#f87171', fontSize: 12, fontWeight: '600' },
});
