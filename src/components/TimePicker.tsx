import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from './AnimatedPressable';

interface Props {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

export default function TimePicker({ hour, minute, onChange }: Props) {
  const step = (deltaHour: number, deltaMinute: number) => {
    let totalMinutes = hour * 60 + minute + deltaHour * 60 + deltaMinute;
    totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    onChange(Math.floor(totalMinutes / 60), totalMinutes % 60);
  };

  return (
    <View style={styles.row}>
      <View style={styles.unit}>
        <AnimatedPressable style={styles.stepButton} scaleTo={0.9} onPress={() => step(1, 0)}>
          <Text style={styles.stepText}>▲</Text>
        </AnimatedPressable>
        <Text style={styles.value}>{formatHour(hour)}</Text>
        <AnimatedPressable style={styles.stepButton} scaleTo={0.9} onPress={() => step(-1, 0)}>
          <Text style={styles.stepText}>▼</Text>
        </AnimatedPressable>
      </View>
      <View style={styles.unit}>
        <AnimatedPressable style={styles.stepButton} scaleTo={0.9} onPress={() => step(0, 15)}>
          <Text style={styles.stepText}>▲</Text>
        </AnimatedPressable>
        <Text style={styles.value}>:{minute.toString().padStart(2, '0')}</Text>
        <AnimatedPressable style={styles.stepButton} scaleTo={0.9} onPress={() => step(0, -15)}>
          <Text style={styles.stepText}>▼</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 24, alignItems: 'center', justifyContent: 'center' },
  unit: { alignItems: 'center', gap: 6 },
  stepButton: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#93c5fd', fontSize: 14 },
  value: { color: '#fff', fontSize: 22, fontWeight: '700', minWidth: 70, textAlign: 'center' },
});
