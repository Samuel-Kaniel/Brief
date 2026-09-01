import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Article } from '../types';
import { CATEGORIES } from '../data/feeds';
import ArticleImage from './ArticleImage';

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
  article: Article;
}

export default function NewsCard({ article }: Props) {
  const categoryLabel = CATEGORIES.find((c) => c.id === article.category)?.label ?? article.category;

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <ArticleImage article={article} categoryLabel={categoryLabel} style={styles.image} />
        <LinearGradient
          colors={['transparent', 'rgba(10,12,17,0.5)', '#12151c']}
          locations={[0, 0.65, 1]}
          style={styles.imageGradient}
          pointerEvents="none"
        />
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{categoryLabel}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={3}>
          {article.title}
        </Text>
        <Text style={styles.summary} numberOfLines={4}>
          {article.summary}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.source} numberOfLines={1}>
            {article.sourceName}
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.timestamp}>{timeAgo(article.publishedAt)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#12151c',
  },
  imageWrap: {
    height: '50%',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(10,12,17,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryPillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
    letterSpacing: -0.3,
  },
  summary: {
    color: '#9aa1ad',
    fontSize: 15,
    lineHeight: 22,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto',
    paddingTop: 6,
  },
  source: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    color: '#6b7280',
    fontSize: 13,
  },
  timestamp: {
    color: '#6b7280',
    fontSize: 13,
  },
});
