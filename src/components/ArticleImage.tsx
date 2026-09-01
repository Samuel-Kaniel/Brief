import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image, ImageStyle } from 'expo-image';
import { Article, CategoryId } from '../types';
import { useArticleImage } from '../hooks/useArticleImage';

const CATEGORY_COLORS: Record<CategoryId, string> = {
  technology: '#1d4ed8',
  ai_ml: '#7c3aed',
  system_design: '#0f766e',
  politics: '#b91c1c',
  finance: '#15803d',
  science: '#0369a1',
  health: '#be185d',
  education: '#a16207',
};

interface Props {
  article: Article;
  categoryLabel: string;
  style?: StyleProp<ViewStyle>;
}

export default function ArticleImage({ article, categoryLabel, style }: Props) {
  const { uri, status } = useArticleImage(article);
  const tint = CATEGORY_COLORS[article.category] ?? '#374151';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, style as StyleProp<ImageStyle>]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={250}
        recyclingKey={article.id}
      />
    );
  }

  return (
    <View style={[styles.placeholder, style, { backgroundColor: tint }]}>
      <Text style={styles.placeholderCategory}>{categoryLabel}</Text>
      <Text style={styles.placeholderSource}>{article.sourceName}</Text>
      {status === 'loading' && (
        <ActivityIndicator style={styles.spinner} color="rgba(255,255,255,0.6)" size="small" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', backgroundColor: '#1f2937' },
  placeholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholderCategory: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  placeholderSource: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  spinner: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
});
