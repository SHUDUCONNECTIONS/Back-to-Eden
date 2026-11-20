import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { UserProfile } from '../shared/types';
import { FeedScreen } from './src/screens/FeedScreen';
import { FastingScreen } from './src/screens/FastingScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { fetchMe, setOnSessionExpired, signOut } from './src/lib/api';
import { clearSession, loadSession, saveSession } from './src/lib/session';
import { API_BASE_URL } from './src/lib/config';
import { colors, radius, spacing } from './src/lib/theme';
import { I18nProvider } from './src/i18n/I18nProvider';
import { useT } from './src/i18n/I18nContext';

/**
 * Back To Eden, on the phone.
 *
 * The Community Kitchen feed, the Fasting Journey timer and the account, all
 * against the same NestJS backend the web app uses. Budgeting, the ingredient
 * shelf and the grocery list stay on the web for now - those are planning
 * tasks people do sitting down, while the feed and the timer are what you
 * reach for standing in a shop or waiting to eat.
 *
 * The session is kept in the phone's secure storage (src/lib/session.ts) and
 * checked with the server on every launch.
 */

type Tab = 'feed' | 'fasting' | 'account';

const TABS: { id: Tab; label: string; title: string }[] = [
  { id: 'feed', label: 'Feed', title: 'Community Kitchen' },
  { id: 'fasting', label: 'Fasting', title: 'Fasting Journey' },
  { id: 'account', label: 'Account', title: 'Account' },
];

export default function App() {
  return (
    <I18nProvider>
      <Main />
    </I18nProvider>
  );
}

function Main() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('feed');
  const [user, setUser] = useState<UserProfile | null>(null);
  // A restored session that must accept the current privacy policy first.
  const [pendingConsent, setPendingConsent] = useState<UserProfile | null>(null);
  const [restoring, setRestoring] = useState(true);

  const signedIn = useCallback((next: UserProfile) => {
    setPendingConsent(null);
    setUser(next);
    setTab('feed');
    void saveSession(next);
  }, []);

  const signedOut = useCallback(() => {
    setUser(null);
    setPendingConsent(null);
    void clearSession();
  }, []);

  // Restore the saved session, and ask the server whether it is still good.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSession();
      if (saved) {
        const me = await fetchMe(saved);
        if (cancelled) return;
        if (!me) await clearSession();
        else if (me.needsConsent) setPendingConsent(saved);
        else setUser(saved);
      }
      if (!cancelled) setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The server can end a session at any time (expiry, password change).
  useEffect(() => {
    setOnSessionExpired(signedOut);
  }, [signedOut]);

  const current = TABS.find((item) => item.id === tab)!;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        <View style={styles.header}>
          <Text style={styles.brand}>{t('BACK TO EDEN')}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{!user ? t('Welcome') : t(current.title)}</Text>
            {user && tab !== 'account' && (
              <Pressable
                onPress={() => {
                  void signOut(user);
                  signedOut();
                }}
                accessibilityRole="button"
              >
                <Text style={styles.signOut}>{t('Sign out')}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {restoring ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : !user ? (
            <SignInScreen onSignedIn={signedIn} pendingUser={pendingConsent} />
          ) : tab === 'feed' ? (
            <FeedScreen user={user} />
          ) : tab === 'fasting' ? (
            <FastingScreen user={user} />
          ) : (
            <AccountScreen
              user={user}
              onSignOut={() => {
                void signOut(user);
                signedOut();
              }}
              onDeleted={signedOut}
            />
          )}
        </View>

        {user && (
          <View style={styles.tabBar}>
            {TABS.map((item) => (
              <Pressable
                key={item.id}
                style={styles.tab}
                onPress={() => setTab(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === item.id }}
              >
                <Text style={[styles.tabText, tab === item.id && styles.tabTextOn]}>{t(item.label)}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Which backend this build is talking to. Invaluable on a real device,
            where a wrong API address is the single most common failure. */}
        <Text style={styles.apiNote}>{API_BASE_URL}</Text>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  brand: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.primary,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signOut: { fontSize: 13, fontWeight: '600', color: colors.muted, paddingBottom: 3 },
  body: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.mutedLight },
  tabTextOn: { color: colors.primary },
  apiNote: {
    fontSize: 9,
    color: colors.mutedLight,
    textAlign: 'center',
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
});
