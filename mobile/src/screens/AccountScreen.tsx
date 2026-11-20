import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { UserProfile } from '../../../shared/types';
import { deleteAccount } from '../lib/api';
import { API_BASE_URL } from '../lib/config';
import { colors, radius, spacing } from '../lib/theme';
import { useT } from '../i18n/I18nContext';
import { errorText } from '../lib/errorText';
import { LanguagePicker } from '../components/LanguagePicker';

/**
 * Account: who is signed in, sign out, and deleting the account from inside
 * the app - which Apple and Google both require of any app that lets people
 * create an account. Downloading your data is on the web app's
 * Account & Privacy page.
 */
export function AccountScreen({
  user,
  onSignOut,
  onDeleted,
}: {
  user: UserProfile;
  onSignOut: () => void;
  onDeleted: () => void;
}) {
  const t = useT();
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canDelete = password.length > 0 && confirm.trim().toUpperCase() === 'DELETE' && !busy;

  const runDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteAccount(user, password);
      onDeleted();
    } catch (err) {
      setError(errorText(err, t, t('Could not delete the account.')));
      setBusy(false);
    }
  };

  const askDelete = () =>
    Alert.alert(
      t('Delete your account?'),
      t('This permanently erases your account, recipes and photos, comments, likes, reports and fasting history. It cannot be undone.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Delete everything'), style: 'destructive', onPress: runDelete },
      ],
    );

  const webAddress = API_BASE_URL.replace(/:3001$/, '');

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Pressable style={styles.secondary} onPress={onSignOut} accessibilityRole="button">
          <Text style={styles.secondaryText}>{t('Sign out')}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>{t('Language')}</Text>
        <LanguagePicker />
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>{t('Your privacy')}</Text>
        <Text style={styles.body}>
          {t("Read the privacy policy, or download a copy of everything we store about you, on the web app's Account & Privacy page: {address}", { address: webAddress })}
        </Text>
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.heading, styles.danger]}>{t('Delete my account')}</Text>
        <Text style={styles.body}>
          {t("Permanently erases your account, recipes and their photos, comments, likes, reports and fasting history. Other people's comments on your recipes go too. This cannot be undone.")}
        </Text>

        {!showDelete ? (
          <Pressable style={styles.dangerOutline} onPress={() => setShowDelete(true)} accessibilityRole="button">
            <Text style={styles.dangerOutlineText}>{t('Delete my account…')}</Text>
          </Pressable>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder={t('Your password')}
              placeholderTextColor={colors.mutedLight}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoComplete="password"
            />
            <TextInput
              style={styles.input}
              placeholder={t('Type DELETE to confirm')}
              placeholderTextColor={colors.mutedLight}
              autoCapitalize="characters"
              value={confirm}
              onChangeText={setConfirm}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.dangerButton, !canDelete && styles.disabled]}
              onPress={askDelete}
              disabled={!canDelete}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerButtonText}>{t('Delete everything')}</Text>}
            </Pressable>
            <Pressable
              onPress={() => {
                setShowDelete(false);
                setPassword('');
                setConfirm('');
                setError('');
              }}
            >
              <Text style={styles.cancel}>{t('Cancel')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dangerCard: { borderColor: '#fecdd3' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  email: { fontSize: 14, color: colors.muted },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text },
  danger: { color: colors.danger },
  body: { fontSize: 13, lineHeight: 19, color: colors.textBody },
  secondary: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { fontWeight: '600', color: colors.text },
  dangerOutline: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#fda4af',
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerOutlineText: { fontWeight: '600', color: colors.danger },
  form: { gap: spacing.sm, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13 },
  dangerButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  cancel: { textAlign: 'center', color: colors.muted, fontSize: 13, paddingVertical: spacing.xs },
});
