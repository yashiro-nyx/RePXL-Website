import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from './api';

// Configure notification behavior for foreground alerts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerPushNotifications() {
  if (Platform.OS === 'web') return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Order and account updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c62828',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return;

    const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync().catch(() => null);

    if (tokenResponse?.data) {
      await api.registerPushToken(tokenResponse.data, Platform.OS);
    }
  } catch (err) {
    // Non-fatal on simulators or unconfigured EAS project
    console.log('[push] Push token registration skipped:', err);
  }
}
