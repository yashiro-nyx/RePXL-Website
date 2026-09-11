import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from './api';

export async function registerPushNotifications() {
  const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID?.trim();
  if (!projectId || Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Order and account updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.registerPushToken(token, Platform.OS);
}
