import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from './AnimatedPressable';

export type NewsLane = 'daily' | 'feed';

interface Props {
  value: NewsLane;
  onChange: (lane: NewsLane) => void;
}

const LANES: { id: NewsLane; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'feed', label: 'Feed' },
];

export default function LaneToggle({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {LANES.map((lane) => {
        const selected = value === lane.id;
        return (
          <AnimatedPressable
            key={lane.id}
            style={[styles.seg, selected && styles.segSelected]}
            onPress={() => onChange(lane.id)}
            hitSlop={4}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{lane.label}</Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#1a1f2b',
    borderRadius: 10,
    padding: 3,
  },
  seg: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  segSelected: {
    backgroundColor: '#2563eb',
  },
  label: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '700',
  },
  labelSelected: {
    color: '#fff',
  },
});
