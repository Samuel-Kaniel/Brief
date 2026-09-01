import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
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
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [articles]);

  const visible = articles.slice(index, index + STACK_VISIBLE);

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
              onSwipeRight={() => {
                onSwipeRight(article);
                setIndex((idx) => idx + 1);
              }}
              onSwipeLeft={() => {
                onSwipeLeft(article);
                setIndex((idx) => idx + 1);
              }}
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
          <Animated.View pointerEvents="none" style={[styles.overlayLabel, styles.saveLabel, saveLabelStyle]}>
            <Text style={[styles.overlayText, styles.saveText]}>SAVED</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.overlayLabel, styles.skipLabel, skipLabelStyle]}>
            <Text style={[styles.overlayText, styles.skipText]}>SKIP</Text>
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
  overlayLabel: {
    position: 'absolute',
    top: 40,
    borderWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  saveLabel: { right: 32, borderColor: '#22c55e', transform: [{ rotate: '-12deg' }] },
  skipLabel: { left: 32, borderColor: '#ef4444', transform: [{ rotate: '12deg' }] },
  overlayText: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  saveText: { color: '#22c55e' },
  skipText: { color: '#ef4444' },
});
