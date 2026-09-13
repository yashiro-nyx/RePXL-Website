import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'repixl.mobile.session';

export type MobileUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CUSTOMER';
  isSuperAdmin: false;
};

export type MobileTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

export type MobileSession = { user: MobileUser; tokens: MobileTokens };

export async function loadSession(): Promise<MobileSession | null> {
  try {
    const value = await SecureStore.getItemAsync(SESSION_KEY);
    if (!value) return null;
    try {
      return JSON.parse(value) as MobileSession;
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
      return null;
    }
  } catch (error) {
    console.warn('[session] Failed to read session from storage:', error);
    return null;
  }
}

export async function saveSession(session: MobileSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('[session] Failed to persist session to storage:', error);
  }
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (error) {
    console.warn('[session] Failed to remove session from storage:', error);
  }
}
