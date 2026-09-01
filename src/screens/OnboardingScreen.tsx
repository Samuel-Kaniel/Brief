import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CATEGORIES } from '../data/feeds';
import { CategoryId } from '../types';
import { usePreferences } from '../context/PreferencesContext';
import TimePicker from '../components/TimePicker';
import AnimatedPressable from '../components/AnimatedPressable';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { preferences, updatePreferences } = usePreferences();
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set(preferences.categories));
  const [hour, setHour] = useState(preferences.notificationHour);
  const [minute, setMinute] = useState(preferences.notificationMinute);

  const toggle = (id: CategoryId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleContinue = async () => {
    await updatePreferences({
      categories: Array.from(selected),
      notificationHour: hour,
      notificationMinute: minute,
      notificationsEnabled: true,
      onboardingComplete: true,
    });
    navigation.replace('Feed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>What do you want to follow?</Text>
        <Text style={styles.subtitle}>Pick as many as you like. You can change these anytime.</Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => {
            const isSelected = selected.has(cat.id);
            return (
              <AnimatedPressable
                key={cat.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggle(cat.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat.label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Daily digest time</Text>
        <Text style={styles.subtitle}>We'll send one notification a day with top stories.</Text>
        <TimePicker hour={hour} minute={minute} onChange={(h, m) => { setHour(h); setMinute(m); }} />
      </ScrollView>

      <View style={styles.footer}>
        <AnimatedPressable
          style={[styles.continueButton, selected.size === 0 && styles.continueButtonDisabled]}
          disabled={selected.size === 0}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>
            {selected.size === 0 ? 'Select at least one topic' : 'Start reading'}
          </Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  scroll: { padding: 24, paddingBottom: 40 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 12 },
  subtitle: { color: '#9ca3af', fontSize: 14, marginTop: 6, marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  footer: { padding: 24 },
  continueButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: { backgroundColor: '#1f2937' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
