import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Article } from '../types';
import NewsCard from './NewsCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const VELOCITY_THRESHOLD = 800;
const STACK_VISIBLE = 3;

// Tight, mechanical motion — decelerate in, accelerate out, no spring overshoot.
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);
const ENTRANCE = FadeIn.duration(160).easing(EASE_OUT);

interface Props {
  articles: Article[];
  onSwipeRight: (article: Article) => void;
  onSwipeLeft: (article: Article) => void;
  onTapOpen: (article: Article) => void;
  renderEmpty: () => React.ReactNode;
}

export default function SwipeCardStack({ articles, onSwipeRight, onSwipeLeft, onTapOpen, renderEmpty }: Props) {
  // FeedScreen also filters saved/skipped IDs out of `articles`. Advancing a
  // numeric index *and* resetting it when that filtered array changes can skip
  // a card for a frame (index=1 against a list that already dropped the
  // swiped item). Track exiting IDs instead and always show remaining[0].
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const prevIdsRef = useRef<Set<string>>(new Set(articles.map((article) => article.id)));

  useEffect(() => {
    const currentIds = new Set(articles.map((article) => article.id));
    const previousIds = prevIdsRef.current;
    setExitingIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        const stillInList = currentIds.has(id);
        // Undo / "show skipped again" re-inserts an id that had left the
        // filtered list. Drop it from exiting so the restored card can show.
        const reentered = stillInList && !previousIds.has(id);
        if (stillInList && !reentered) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      if (!changed && next.size === prev.size) return prev;
      return next;
    });
    prevIdsRef.current = currentIds;
  }, [articles]);

  const remaining = useMemo(
    () => articles.filter((article) => !exitingIds.has(article.id)),
    [articles, exitingIds]
  );
  const visible = remaining.slice(0, STACK_VISIBLE);

  const dismiss = (article: Article, handler: (article: Article) => void) => {
    setExitingIds((prev) => {
      const next = new Set(prev);
      next.add(article.id);
      return next;
    });
    handler(article);
  };

  if (visible.length === 0) {
    return <View style={styles.container}>{renderEmpty()}</View>;
  }

  return (
    <View style={styles.container}>
      {visible
        .map((article, i) => ({ article, i }))
        .reverse()
        .map(({ article, i }) =>
          i === 0 ? (
            <TopCard
              key={article.id}
              article={article}
              onSwipeRight={() => dismiss(article, onSwipeRight)}
              onSwipeLeft={() => dismiss(article, onSwipeLeft)}
              onTapOpen={() => onTapOpen(article)}
            />
          ) : (
            <StackedCard key={article.id} article={article} depth={i} />
          )
        )}
    </View>
  );
}

function StackedCard({ article, depth }: { article: Article; depth: number }) {
  const scale = 1 - depth * 0.04;
  const translateY = depth * 14;
  return (
    <Animated.View entering={ENTRANCE} style={styles.cardSlot}>
      <View style={[styles.stackedInner, { transform: [{ scale }, { translateY }], opacity: 1 - depth * 0.2 }]}>
        <NewsCard article={article} />
      </View>
    </Animated.View>
  );
}

function TopCard({
  article,
  onSwipeRight,
  onSwipeLeft,
  onTapOpen,
}: {
  article: Article;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onTapOpen: () => void;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const shouldSwipeRight = e.translationX > SWIPE_THRESHOLD || e.velocityX > VELOCITY_THRESHOLD;
      const shouldSwipeLeft = e.translationX < -SWIPE_THRESHOLD || e.velocityX < -VELOCITY_THRESHOLD;

      if (shouldSwipeRight) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 220, easing: EASE_IN }, (finished) => {
          if (finished) runOnJS(onSwipeRight)();
        });
      } else if (shouldSwipeLeft) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 220, easing: EASE_IN }, (finished) => {
          if (finished) runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withTiming(0, { duration: 180, easing: EASE_OUT });
        translateY.value = withTiming(0, { duration: 180, easing: EASE_OUT });
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTapOpen)();
  });

  const gesture = Gesture.Race(pan, tap);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { rotate: `${rotate}deg` }],
    };
  });

  const saveLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const skipLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -20], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View entering={ENTRANCE} style={styles.cardSlot}>
        <Animated.View style={[styles.stackedInner, animatedStyle]}>
          <NewsCard article={article} />
          <Animated.View pointerEvents="none" style={[styles.overlayBadge, styles.saveBadge, saveLabelStyle]}>
            <Feather name="bookmark" size={32} color="#22c55e" />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.overlayBadge, styles.skipBadge, skipLabelStyle]}>
            <Feather name="x" size={36} color="#ef4444" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cardSlot: { ...StyleSheet.absoluteFillObject, padding: 16 },
  stackedInner: { flex: 1 },
  overlayBadge: {
    position: 'absolute',
    top: 40,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,12,17,0.55)',
  },
  saveBadge: { right: 32, borderColor: '#22c55e', transform: [{ rotate: '-12deg' }] },
  skipBadge: { left: 32, borderColor: '#ef4444', transform: [{ rotate: '12deg' }] },
});
