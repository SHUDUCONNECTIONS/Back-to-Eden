import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { UserProfile } from '../../../shared/types';
import { acceptPrivacyPolicy, register, signIn } from '../lib/api';
import { API_BASE_URL } from '../lib/config';
import { colors, radius, spacing } from '../lib/theme';
import { useT } from '../i18n/I18nContext';
import { errorText } from '../lib/errorText';
import { LanguagePicker } from '../components/LanguagePicker';

/**
 * Sign in or create an account against the same /api/auth routes the web app
 * uses. App.tsx keeps the session in the phone's secure storage. The language
 * chips sit below the card, so someone can switch before reading anything.
 */
export function SignInScreen({
  onSignedIn,
  pendingUser = null,
}: {
  onSignedIn: (user: UserProfile) => void;
  /** A restored session that still has to accept the current privacy policy. */
  pendingUser?: UserProfile | null;
}) {
  const t = useT();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  // An existing account that still has to accept the current policy.
  const [pending, setPending] = useState<UserProfile | null>(pendingUser);

  const submit = async () => {
    setError('');
    if (mode === 'signup' && !name.trim()) return setError(t('Please enter your name.'));
    if (!email.trim() || !password) return setError(t('Please enter your email and password.'));
    if (mode === 'signup' && password.length < 8) return setError(t('Passwords need at least 8 characters.'));
    if (mode === 'signup' && !consent) return setError(t('Please accept the privacy policy to create an account.'));

    setBusy(true);
    try {
      const user =
        mode === 'signin'
          ? await signIn(email.trim(), password)
          : await register(name.trim(), email.trim(), password);
      if (user.needsConsent) setPending(user);
      else onSignedIn(user);
    } catch (err) {
      setError(errorText(err, t, t('Something went wrong.')));
    } finally {
      setBusy(false);
    }
  };

  const acceptPending = async () => {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      await acceptPrivacyPolicy(pending);
      onSignedIn({ ...pending, needsConsent: false });
    } catch (err) {
      setError(errorText(err, t, t('Something went wrong.')));
    } finally {
      setBusy(false);
    }
  };

  const consentToggle = (
    <Pressable style={styles.consentRow} onPress={() => setConsent(!consent)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }}>
      <View style={[styles.box, consent && styles.boxOn]}>{consent ? <Text style={styles.tick}>✓</Text> : null}</View>
      <Text style={styles.consentText}>
        {/* Deliberately English in every language, as on the web: consent must
            be informed, so this needs a checked human translation first. */}
        I am 18 or older, I accept the privacy policy, and I consent to Back To Eden storing my fasting
        history (health information) to show me my progress.
      </Text>
    </Pressable>
  );
  const policyNote = (
    <Text style={styles.policyNote}>
      {t('Read the full policy on the web app: {address} → Account & Privacy.', { address: API_BASE_URL.replace(':3001', '') })}
    </Text>
  );

  if (pending) {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.heading}>{t('Your privacy')}</Text>
          <Text style={styles.consentText}>
            {t('Before you carry on, please accept how Back To Eden looks after your information.')}
          </Text>
          {consentToggle}
          {policyNote}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.button, (!consent || busy) && styles.buttonBusy]} onPress={acceptPending} disabled={!consent || busy}>
            <Text style={styles.buttonText}>{t('Accept and continue')}</Text>
          </Pressable>
          <Pressable onPress={() => { setPending(null); setConsent(false); }}>
            <Text style={styles.switch}>{t('Cancel')}</Text>
          </Pressable>
        </View>
        <View style={styles.languages}>
          <LanguagePicker />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.heading}>{mode === 'signin' ? t('Sign in') : t('Create an account')}</Text>

        {mode === 'signup' && (
          <TextInput
            style={styles.input}
            placeholder={t('Full name')}
            placeholderTextColor={colors.mutedLight}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder={t('Email')}
          placeholderTextColor={colors.mutedLight}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder={t('Password')}
          placeholderTextColor={colors.mutedLight}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signin' ? 'password' : 'password-new'}
          onSubmitEditing={submit}
        />

        {mode === 'signup' && consentToggle}
        {mode === 'signup' && policyNote}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.button, busy && styles.buttonBusy]} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === 'signin' ? t('Sign in') : t('Create account')}</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
          }}
        >
          <Text style={styles.switch}>
            {mode === 'signin' ? t("Don't have an account? Sign up") : t('Already have an account? Sign in')}
          </Text>
        </Pressable>
      </View>
      <View style={styles.languages}>
        <LanguagePicker />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  switch: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  consentRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxOn: { backgroundColor: colors.primary },
  tick: { color: '#fff', fontSize: 13, fontWeight: '700' },
  consentText: { flex: 1, fontSize: 13, color: colors.textBody, lineHeight: 18 },
  policyNote: { fontSize: 11, color: colors.mutedLight },
  languages: { marginTop: spacing.lg },
});
