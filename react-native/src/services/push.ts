import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { api } from './api';

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

// Configure notification behavior for foreground alerts (avoid running on Android in Expo Go)
if (!(isExpoGo && Platform.OS === 'android')) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerPushNotifications() {
  if (Platform.OS === 'web') return;

  // Remote push notifications are not supported in Expo Go on Android (SDK 53+)
  if (isExpoGo && Platform.OS === 'android') {
    return;
  }

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
