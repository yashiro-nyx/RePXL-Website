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
  const value = await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as MobileSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function saveSession(session: MobileSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
