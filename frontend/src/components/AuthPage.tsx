/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from './Logo';
import { useT } from '../i18n/useTranslation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { register, signIn, signOut } from '../utils/auth';
import { PrivacyPolicy } from './PrivacyPolicy';

const MIN_PASSWORD_LENGTH = 8;

export type AuthMode = 'signin' | 'signup' | 'forgot' | 'admin' | 'privacy';

interface AuthPageProps {
  initialMode?: AuthMode;
  /**
   * `landing` asks the app to open on a particular section. Moderators go
   * straight to the admin desk rather than the feed.
   */
  onSuccess: (user: UserProfile, options?: { landing?: string }) => void;
}

const INPUT_CLASS =
  'w-full bg-white border border-[#e9dfc8] rounded-lg px-4 py-2.5 text-sm text-[#2f4026] placeholder-[#9c9a89] focus:outline-none focus:border-[#4e6b3e] focus:ring-1 focus:ring-[#4e6b3e] transition-colors';

const BUTTON_CLASS =
  'w-full bg-[#4e6b3e] hover:bg-[#3e5531] text-white font-semibold py-2.5 px-4 rounded-lg transition-colors cursor-pointer text-sm';

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'signin', onSuccess }) => {
  const t = useT();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpConsent, setSignUpConsent] = useState(false);
  // Where "Back" goes from the privacy policy (it is opened from sign-up and sign-in).
  const [policyReturn, setPolicyReturn] = useState<AuthMode>('signup');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Moderator sign in
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const [busy, setBusy] = useState(false);

  /** Shared by every form: one request at a time, server errors shown as-is. */
  const run = async (action: () => Promise<void>) => {
    setErrorMsg('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setErrorMsg(t(err instanceof Error ? err.message : 'Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!signInEmail.trim()) {
      setErrorMsg(t('Please enter your email address'));
      return;
    }
    if (!signInPassword) {
      setErrorMsg(t('Please enter your password'));
      return;
    }

    void run(async () => {
      const { profile, isAdmin } = await signIn(signInEmail.trim(), signInPassword);
      setSuccessMsg(t('Signed in successfully! Welcome back.'));
      setTimeout(() => onSuccess(profile, isAdmin ? { landing: 'admin' } : undefined), 500);
    });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!signUpName.trim()) {
      setErrorMsg(t('Please enter your full name'));
      return;
    }
    if (!signUpEmail.trim()) {
      setErrorMsg(t('Please enter your email address'));
      return;
    }
    if (signUpPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(t('Password should be at least 8 characters'));
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMsg(t('Passwords do not match'));
      return;
    }
    if (!signUpConsent) {
      setErrorMsg(t('Please read and accept the privacy policy to create an account.'));
      return;
    }

    void run(async () => {
      const { profile } = await register(signUpName.trim(), signUpEmail.trim(), signUpPassword, signUpConsent);
      setSuccessMsg(t('Account created successfully! Welcome to Back To Eden.'));
      setTimeout(() => onSuccess(profile), 500);
    });
  };

  // Reset-by-email needs an email-sending service, which is not set up yet.
  // Rather than pretend a message was sent, say plainly what to do instead.
  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setForgotSent(true);
  };

  /**
   * Moderators sign in with an ordinary account; the server decides whether
   * that account may moderate (ADMIN_EMAILS). Checked here only so a wrong
   * address gets a clear message instead of a missing Admin button.
   */
  const handleAdminSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!adminEmail.trim()) {
      setErrorMsg(t('Please enter your moderator email'));
      return;
    }
    if (!adminPassword) {
      setErrorMsg(t('Please enter your password'));
      return;
    }

    void run(async () => {
      const { profile, isAdmin } = await signIn(adminEmail.trim(), adminPassword);
      if (!isAdmin) {
        await signOut(profile);
        setErrorMsg(t('That account is not a moderator. Ask an admin to add it to ADMIN_EMAILS.'));
        return;
      }
      setSuccessMsg(t('Signed in as moderator.'));
      setTimeout(() => onSuccess(profile, { landing: 'admin' }), 500);
    });
  };

  const handleBypassAsGuest = () => {
    onSuccess({
      name: t('Guest Explorer'),
      email: 'guest@nourish.local',
      isGuest: true,
    });
  };

  const headings: Record<AuthMode, string> = {
    signin: t('Sign In'),
    signup: t('Sign Up'),
    forgot: t('Forgot Password'),
    admin: t('Moderator Sign In'),
    privacy: t('Privacy Policy'),
  };

  const openPolicy = () => {
    setPolicyReturn(mode === 'privacy' ? 'signup' : mode);
    switchMode('privacy');
  };

  return (
    <div className="min-h-screen bg-[#f7eedd] flex items-center justify-center p-4 font-sans text-[#2f4026] selection:bg-[#4e6b3e] selection:text-white">
      {/* Soft warm vignette behind the card */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, #fdfaf3 0%, #f7eedd 45%, #f0e4cc 100%)',
        }}
      />

      {/* Phone-styled card */}
      <div className="relative w-full max-w-[360px] bg-[#fdfaf3] rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(61,74,43,0.22)] px-7 py-9 sm:px-8 sm:py-10">
        {/* Language picker — before anything else, so the form itself can be read */}
        <div className="flex justify-end -mt-3 mb-1">
          <LanguageSwitcher />
        </div>

        {/* Brand lockup */}
        <div className="flex justify-center">
          <Logo className="h-24 w-auto" />
        </div>

        {/* Mode heading */}
        <h2 className="mt-6 mb-5 text-center text-[1.35rem] font-semibold text-[#2f4026]">
          {headings[mode]}
        </h2>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ---------------- MODE 1: SIGN IN ---------------- */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              placeholder={t('Email')}
              value={signInEmail}
              autoComplete="email"
              onChange={(e) => setSignInEmail(e.target.value)}
              className={INPUT_CLASS}
            />

            <div>
              <input
                type="password"
                placeholder={t('Password')}
                value={signInPassword}
                autoComplete="current-password"
                onChange={(e) => setSignInPassword(e.target.value)}
                className={INPUT_CLASS}
              />
              <div className="text-right pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-[11px] text-[#5a6b4f] hover:text-[#2f4026] font-medium cursor-pointer"
                >
                  {t('Forgot Password?')}
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy} className={`${BUTTON_CLASS} mt-1 disabled:opacity-60`}>
              {t('Sign In')}
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-[#7b8370]">{t('Don’t have an account?')} </span>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-[11px] font-bold text-[#2f4026] hover:underline cursor-pointer"
              >
                {t('Sign Up')}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- MODE 2: SIGN UP ---------------- */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="text"
              placeholder={t('Full Name')}
              value={signUpName}
              autoComplete="name"
              onChange={(e) => setSignUpName(e.target.value)}
              className={INPUT_CLASS}
            />
            <input
              type="email"
              placeholder={t('Email')}
              value={signUpEmail}
              autoComplete="email"
              onChange={(e) => setSignUpEmail(e.target.value)}
              className={INPUT_CLASS}
            />
            <input
              type="password"
              placeholder={t('Password')}
              value={signUpPassword}
              autoComplete="new-password"
              onChange={(e) => setSignUpPassword(e.target.value)}
              className={INPUT_CLASS}
            />
            <input
              type="password"
              placeholder={t('Confirm Password')}
              value={signUpConfirmPassword}
              autoComplete="new-password"
              onChange={(e) => setSignUpConfirmPassword(e.target.value)}
              className={INPUT_CLASS}
            />

            {/* POPIA: explicit, unticked-by-default consent, covering the health data. */}
            <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#3e5531] cursor-pointer text-left">
              <input
                type="checkbox"
                checked={signUpConsent}
                onChange={(e) => setSignUpConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[#4e6b3e]"
              />
              <span>
                I am 18 or older, I accept the{' '}
                <button type="button" onClick={openPolicy} className="font-bold underline cursor-pointer">
                  privacy policy
                </button>
                , and I consent to Back To Eden storing my fasting history (health information) to show me my progress.
              </span>
            </label>

            <button type="submit" disabled={busy} className={`${BUTTON_CLASS} mt-1 disabled:opacity-60`}>
              {t('Create Account')}
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-[#7b8370]">{t('Already have an account?')} </span>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-[11px] font-bold text-[#2f4026] hover:underline cursor-pointer"
              >
                {t('Sign In')}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- MODE 3: FORGOT PASSWORD ---------------- */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-3">
            <p className="text-[11px] text-[#7b8370] text-center leading-relaxed px-1 -mt-1 pb-1">
              {t('Forgot your password? Enter your email and we’ll tell you how to get back in.')}
            </p>

            {forgotSent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
                <span className="text-xs font-bold text-emerald-800 block">
                  {t('Reset by email is coming soon')}
                </span>
                <p className="text-[11px] text-emerald-700">
                  {t('For now, contact the Back To Eden team from')} <strong>{forgotEmail}</strong>{' '}
                  {t('and we will reset your password for you.')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    switchMode('signin');
                    setForgotSent(false);
                  }}
                  className="mt-2 text-[11px] text-[#4e6b3e] font-bold hover:underline cursor-pointer"
                >
                  {t('Return to Sign In')}
                </button>
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder={t('Email')}
                  value={forgotEmail}
                  autoComplete="email"
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={INPUT_CLASS}
                />

                <button type="submit" className={BUTTON_CLASS}>
                  {t('Continue')}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-[11px] font-semibold text-[#7b8370] hover:text-[#2f4026] cursor-pointer"
                  >
                    {t('Back to Sign In')}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* ---------------- PRIVACY POLICY ---------------- */}
        {mode === 'privacy' && (
          <div className="space-y-4">
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-[#ece2cc] bg-white p-3 text-left">
              <PrivacyPolicy compact />
            </div>
            <button type="button" onClick={() => switchMode(policyReturn)} className={BUTTON_CLASS}>
              {t('Back')}
            </button>
          </div>
        )}

        {/* ---------------- MODERATOR SIGN IN ---------------- */}
        {mode === 'admin' && (
          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg bg-[#eef3e3] border border-[#d4dfc6] px-3 py-2.5">
              <ShieldCheck className="w-4 h-4 text-[#4e6b3e] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-[#3e5531]">
                {t(
                  'Moderators approve posts from members. Only addresses listed in ADMIN_EMAILS on the server can sign in here.',
                )}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#3e5531]">
                {t('Moderator email')}
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder={t('you@example.com')}
                className={INPUT_CLASS}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[#3e5531]">
                {t('Password')}
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder={t('Enter your password')}
                className={INPUT_CLASS}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={busy} className={BUTTON_CLASS}>
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('Checking\u2026')}
                </span>
              ) : (
                t('Sign in as moderator')
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-[11px] font-semibold text-[#7b8370] hover:text-[#2f4026] cursor-pointer"
              >
                {t('Back to Sign In')}
              </button>
            </div>
          </form>
        )}

        {/* ---------------- GUEST BYPASS & MODERATOR ---------------- */}
        {mode !== 'admin' && mode !== 'privacy' && (
          <div className="mt-6 pt-4 border-t border-[#ece2cc] flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={handleBypassAsGuest}
              className="text-[11px] font-semibold text-[#4e6b3e] hover:text-[#2f4026] hover:underline cursor-pointer"
            >
              {t('Continue as Guest')} &rarr;
            </button>

            <button
              type="button"
              onClick={() => switchMode('admin')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#f2e9d6] border border-[#e9dfc8] text-[11px] font-bold text-[#3e5531] hover:bg-[#eef3e3] hover:border-[#d4dfc6] transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#4e6b3e]" />
              {t('Sign in as moderator')}
            </button>

            <button
              type="button"
              onClick={openPolicy}
              className="text-[10px] text-[#7b8370] hover:text-[#2f4026] hover:underline cursor-pointer"
            >
              {t('Privacy Policy')}
            </button>
          </div>
        )}

        {/* Phone-style home indicator */}
        <div className="mt-7 flex justify-center">
          <div className="w-28 h-1 rounded-full bg-[#2f4026]/70" />
        </div>
      </div>
    </div>
  );
};
