import React, { useState } from 'react';
import { Download, Loader2, LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { UserProfile } from '../types';
import { PrivacyPolicy } from './PrivacyPolicy';
import { deleteAccount, downloadMyData } from '../utils/auth';
import { useT } from '../i18n/useTranslation';

/**
 * Account & privacy: who you are signed in as, the privacy policy, and the two
 * POPIA rights the app handles itself - getting a copy of your data and
 * deleting your account.
 */
export const AccountPage: React.FC<{
  user: UserProfile;
  onSignOut: () => void;
  onDeleted: () => void;
}> = ({ user, onSignOut, onDeleted }) => {
  const t = useT();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadMyData(user);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : t('Could not download your data.'));
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount(user, password);
      onDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('Could not delete the account.'));
      setDeleting(false);
    }
  };

  const card = 'bg-[#fdfaf3] border border-[#e9dfc8] rounded-2xl p-5 sm:p-6';
  const button =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-[#5a6b4f] uppercase">{t('Account')}</p>
        <h1 className="text-3xl font-bold text-[#2f4026]">{t('Account & privacy')}</h1>
      </header>

      {user.isGuest ? (
        <section className={card}>
          <p className="text-sm text-[#3e5531]">
            {t('You are browsing as a guest, so nothing about you is stored on our server. Create a free account to post recipes and track your fasts.')}
          </p>
          <button onClick={onSignOut} className={`${button} mt-4 bg-[#4e6b3e] text-white hover:bg-[#3e5531]`}>
            {t('Sign in or create an account')}
          </button>
        </section>
      ) : (
        <>
          <section className={`${card} flex items-center justify-between gap-4 flex-wrap`}>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-[#eef3e3] flex items-center justify-center">
                <UserRound className="w-5 h-5 text-[#4e6b3e]" />
              </span>
              <div>
                <p className="font-bold text-[#2f4026]">{user.name}</p>
                <p className="text-sm text-[#5a6b4f]">{user.email}</p>
              </div>
            </div>
            <button onClick={onSignOut} className={`${button} border border-[#e9dfc8] hover:bg-[#f7eedd]`}>
              <LogOut className="w-4 h-4" /> {t('Sign out')}
            </button>
          </section>

          <section className={`${card} space-y-3`}>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Download className="w-5 h-5 text-[#4e6b3e]" /> {t('Download my data')}
            </h2>
            <p className="text-sm text-[#3e5531]">
              {t('A file with everything we store about you: your account, recipes, comments, likes, reports and fasting history.')}
            </p>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={`${button} bg-[#4e6b3e] text-white hover:bg-[#3e5531]`}
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t('Download (JSON)')}
            </button>
            {downloadError && <p className="text-sm text-rose-700">{downloadError}</p>}
          </section>

          <section className={`${card} space-y-3 border-rose-200`}>
            <h2 className="font-bold text-lg flex items-center gap-2 text-rose-800">
              <Trash2 className="w-5 h-5" /> {t('Delete my account')}
            </h2>
            <p className="text-sm text-[#3e5531]">
              {t("Permanently erases your account, recipes and their photos, comments, likes, reports and fasting history. Other people's comments on your recipes go too. This cannot be undone.")}
            </p>

            {!showDelete ? (
              <button
                onClick={() => setShowDelete(true)}
                className={`${button} border border-rose-300 text-rose-800 hover:bg-rose-50`}
              >
                {t('Delete my account…')}
              </button>
            ) : (
              <form onSubmit={handleDelete} className="space-y-3 max-w-sm">
                <input
                  type="password"
                  placeholder={t('Your password')}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#e9dfc8] rounded-lg px-4 py-2.5 text-sm"
                />
                <input
                  type="text"
                  placeholder={t('Type DELETE to confirm')}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-white border border-[#e9dfc8] rounded-lg px-4 py-2.5 text-sm"
                />
                {deleteError && <p className="text-sm text-rose-700">{deleteError}</p>}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={deleting || !password || confirmText.trim().toUpperCase() !== 'DELETE'}
                    className={`${button} bg-rose-700 text-white hover:bg-rose-800`}
                  >
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />} {t('Delete everything')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDelete(false);
                      setPassword('');
                      setConfirmText('');
                      setDeleteError('');
                    }}
                    className={`${button} border border-[#e9dfc8] hover:bg-[#f7eedd]`}
                  >
                    {t('Cancel')}
                  </button>
                </div>
              </form>
            )}
          </section>
        </>
      )}

      <section className={`${card} space-y-3`}>
        <h2 className="font-bold text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#4e6b3e]" /> {t('Privacy Policy')}
        </h2>
        <p className="text-xs text-[#7b8370]">{t('The privacy policy is in English.')}</p>
        {showPolicy ? (
          <PrivacyPolicy />
        ) : (
          <button
            onClick={() => setShowPolicy(true)}
            className={`${button} border border-[#e9dfc8] hover:bg-[#f7eedd]`}
          >
            {t('Read the privacy policy')}
          </button>
        )}
      </section>
    </div>
  );
};
