import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Article } from '../types';
import { CATEGORIES } from '../data/feeds';
import ArticleImage from './ArticleImage';
import AnimatedPressable from './AnimatedPressable';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  articles: Article[];
  savedIds: Set<string>;
  refreshing: boolean;
  onRefresh: () => void;
  onOpen: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  renderEmpty: () => React.ReactNode;
}

export default function DailyPackList({
  articles,
  savedIds,
  refreshing,
  onRefresh,
  onOpen,
  onToggleSave,
  renderEmpty,
}: Props) {
  const renderItem = useCallback(
    ({ item, index }: { item: Article; index: number }) => {
      const categoryLabel = CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
      const saved = savedIds.has(item.id);
      return (
        <AnimatedPressable style={styles.row} scaleTo={0.98} onPress={() => onOpen(item)}>
          <Text style={styles.rank}>{index + 1}</Text>
          <ArticleImage article={item} categoryLabel={categoryLabel} style={styles.thumb} />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {item.sourceName} · {timeAgo(item.publishedAt)}
            </Text>
          </View>
          <AnimatedPressable
            onPress={() => onToggleSave(item)}
            hitSlop={12}
            style={styles.saveButton}
          >
            <Feather name="bookmark" size={18} color={saved ? '#22c55e' : '#93c5fd'} />
          </AnimatedPressable>
        </AnimatedPressable>
      );
    },
    [onOpen, onToggleSave, savedIds]
  );

  if (articles.length === 0) {
    return <View style={styles.emptyWrap}>{renderEmpty()}</View>;
  }

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#93c5fd" />
      }
      ListHeaderComponent={
        <Text style={styles.headerHint}>
          Today's pack · {articles.length} {articles.length === 1 ? 'story' : 'stories'} in your
          topics
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  headerHint: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161a21',
    borderRadius: 16,
    padding: 10,
    gap: 10,
    marginBottom: 10,
  },
  rank: {
    width: 22,
    color: '#93c5fd',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  thumb: { width: 64, height: 64, borderRadius: 10, overflow: 'hidden' },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { color: '#fff', fontSize: 14, fontWeight: '600', lineHeight: 18 },
  rowMeta: { color: '#9ca3af', fontSize: 12 },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
