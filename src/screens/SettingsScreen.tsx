import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CATEGORIES } from '../data/feeds';
import { CategoryId } from '../types';
import { usePreferences } from '../context/PreferencesContext';
import TimePicker from '../components/TimePicker';
import AnimatedPressable from '../components/AnimatedPressable';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function sameCategories(a: Set<CategoryId>, b: CategoryId[]): boolean {
  if (a.size !== b.length) return false;
  return b.every((id) => a.has(id));
}

export default function SettingsScreen({ navigation }: Props) {
  const { preferences, updatePreferences } = usePreferences();
  // Captured once on open so we can tell whether the topic selection actually
  // changed (and therefore whether the feed needs a real refetch) vs. the
  // user just opening and leaving Settings untouched.
  const [initialCategories] = useState<CategoryId[]>(preferences.categories);
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set(preferences.categories));

  const toggleCategory = (id: CategoryId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasSelection = selected.size > 0;
  const hasChanges = !sameCategories(selected, initialCategories);

  const handleApply = async () => {
    if (!hasSelection) return;
    if (hasChanges) {
      await updatePreferences({ categories: Array.from(selected) });
    }
    navigation.goBack();
  };

  const applyLabel = !hasSelection
    ? 'Select at least one topic'
    : hasChanges
    ? 'Apply & refresh feed'
    : 'Done';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Topics</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => {
            const isSelected = selected.has(cat.id);
            return (
              <AnimatedPressable
                key={cat.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleCategory(cat.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat.label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Daily notification</Text>
          <Switch
            value={preferences.notificationsEnabled}
            onValueChange={(value) => updatePreferences({ notificationsEnabled: value })}
            trackColor={{ true: '#2563eb', false: '#374151' }}
          />
        </View>

        {preferences.notificationsEnabled && (
          <TimePicker
            hour={preferences.notificationHour}
            minute={preferences.notificationMinute}
            onChange={(h, m) => updatePreferences({ notificationHour: h, notificationMinute: m })}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <AnimatedPressable
          style={[styles.applyButton, !hasSelection && styles.applyButtonDisabled]}
          disabled={!hasSelection}
          onPress={handleApply}
        >
          <Text style={styles.applyButtonText}>{applyLabel}</Text>
        </AnimatedPressable>
      </View>
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
  scroll: { padding: 24, paddingBottom: 24, gap: 8 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  chip: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#d1d5db', fontSize: 14, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2937',
  },
  applyButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonDisabled: { backgroundColor: '#1f2937' },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
