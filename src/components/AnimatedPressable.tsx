import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

// Tight, mechanical timing curves — no spring overshoot. Press-down is near-
// instant (machine registering input), release eases out briskly.
const PRESS_IN_MS = 90;
const PRESS_OUT_MS = 140;
const EASE_OUT = Easing.out(Easing.cubic);

interface Props {
  onPress?: () => void;
  disabled?: boolean;
  hitSlop?: number;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Pressable with a quick, precise scale-down on press — used in place of
 * plain Pressable wherever tactile feedback matters (CTAs, chips, rows).
 */
export default function AnimatedPressable({
  onPress,
  disabled,
  hitSlop,
  scaleTo = 0.95,
  style,
  children,
}: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: PRESS_IN_MS, easing: EASE_OUT });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: PRESS_OUT_MS, easing: EASE_OUT });
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
