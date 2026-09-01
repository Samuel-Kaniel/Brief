import 'react-native-gesture-handler';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { PreferencesProvider } from './src/context/PreferencesContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const [iconsLoaded] = useFonts({
    ...Feather.font,
  });

  if (!iconsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0f1115' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
