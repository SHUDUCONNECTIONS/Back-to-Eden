import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '../../../shared/types';

/**
 * Keeps the signed-in session between launches.
 *
 * The session token is as good as a password for 30 days, so it goes in the
 * phone's secure storage (iOS Keychain / Android Keystore), never in plain
 * storage. The Expo web preview has no secure storage, so there the session
 * simply lasts until the page is closed.
 */

const KEY = 'back_to_eden_session';
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function loadSession(): Promise<UserProfile | null> {
  if (!supported) return null;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const user = raw ? (JSON.parse(raw) as UserProfile) : null;
    return user?.token ? user : null;
  } catch {
    return null;
  }
}

export async function saveSession(user: UserProfile): Promise<void> {
  if (!supported || !user.token) return;
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(user));
  } catch {
    // Not fatal: the person just signs in again next launch.
  }
}

export async function clearSession(): Promise<void> {
  if (!supported) return;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {}
}
