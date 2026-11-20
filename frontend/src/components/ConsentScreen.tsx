import React, { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from './Logo';
import { PrivacyPolicy } from './PrivacyPolicy';
import { acceptPrivacyPolicy } from '../utils/auth';
import { useT } from '../i18n/useTranslation';

/**
 * Shown to a signed-in account that has not accepted the current privacy
 * policy: people who registered before consent existed, and everyone after the
 * policy changes. The server refuses everything else until they accept, so
 * this is the only way forward besides signing out.
 */
export const ConsentScreen: React.FC<{
  user: UserProfile;
  onAccepted: () => void;
  onSignOut: () => void;
}> = ({ user, onAccepted, onSignOut }) => {
  const t = useT();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      await acceptPrivacyPolicy(user);
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7eedd] flex items-center justify-center p-4 font-sans text-[#2f4026]">
      <div className="w-full max-w-xl bg-[#fdfaf3] border border-[#e9dfc8] rounded-3xl shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-14 w-auto" />
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#4e6b3e]" /> {t('Your privacy')}
          </h1>
          <p className="text-sm text-[#5a6b4f]">
            {t('Hi')} {user.name}.{' '}
            {t('Before you carry on, please read how Back To Eden looks after your information, including your fasting history.')}
          </p>
          <p className="text-xs text-[#7b8370]">{t('The privacy policy is in English.')}
          </p>
        </div>

        <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-[#ece2cc] bg-white p-4">
          <PrivacyPolicy compact />
        </div>

        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[#4e6b3e]"
          />
          <span>
            I am 18 or older, I accept the privacy policy, and I consent to Back To Eden storing my
            fasting history (health information) to show me my progress.
          </span>
        </label>

        {error && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={accept}
            disabled={!agreed || busy}
            className="flex-1 bg-[#4e6b3e] hover:bg-[#3e5531] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('Accept and continue')}
          </button>
          <button
            onClick={onSignOut}
            className="sm:w-40 border border-[#e9dfc8] hover:bg-[#f7eedd] font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
          >
            {t('Sign out')}
          </button>
        </div>
        <p className="text-[11px] text-[#7b8370] text-center">
          {t("Don't agree? Sign out, and ask us at the contact address above to delete your account.")}
        </p>
      </div>
    </div>
  );
};
