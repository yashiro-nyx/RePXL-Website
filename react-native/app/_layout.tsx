import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { View, ActivityIndicator, Platform, StatusBar as RNStatusBar } from 'react-native';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBarStyle('light-content');
      RNStatusBar.setBackgroundColor('#0d0d0d');
      RNStatusBar.setTranslucent(true);
    }
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#c62828" />
      </View>
    );
  }

  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0d0d0d' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product" />
        <Stack.Screen name="compare" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-confirm" />
        <Stack.Screen name="order" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="support" />
      </Stack>
    </AppProvider>
  );
}
