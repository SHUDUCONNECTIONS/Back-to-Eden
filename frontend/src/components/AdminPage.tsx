import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck,
  Clock,
  Flag,
  PenLine,
  Check,
  X,
  Trash2,
  AlertCircle,
  Inbox,
  Utensils,
  RefreshCw,
} from 'lucide-react';
import { AdminOverview, CommunityPost, CurrencyCode, ModerationReport, UserProfile } from '../types';
import * as admin from '../utils/adminApi';
import { PostComposer } from './PostComposer';
import { formatPrice } from '../utils/currency';
import { useT } from '../i18n/useTranslation';

interface AdminPageProps {
  user: UserProfile;
  currency: CurrencyCode;
  /** Lets the page refresh the sidebar's pending badge after a decision. */
  onOverviewChange: (overview: AdminOverview) => void;
}

type Tab = 'queue' | 'reports' | 'post';

function relativeTime(ts: number, t: (s: string) => string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return t('just now');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${t('ago')}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${t('ago')}`;
  const days = Math.floor(hours / 24);
  return `${days}d ${t('ago')}`;
}

/**
 * The moderator's desk: review what people have submitted, deal with reports,
 * and post as an admin.
 *
 * App only renders this when the server says the signed-in user is an admin,
 * and every action here is checked again on the server. Hiding the page is
 * presentation, not protection.
 */
export const AdminPage: React.FC<AdminPageProps> = ({ user, currency, onOverviewChange }) => {
  const t = useT();

  const [tab, setTab] = useState<Tab>('queue');
  const [pending, setPending] = useState<CommunityPost[]>([]);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [queue, openReports, overview] = await Promise.all([
        admin.fetchPending(user),
        admin.fetchReports(user),
        admin.fetchOverview(user),
      ]);
      setPending(queue);
      setReports(openReports);
      onOverviewChange(overview);
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('Could not load the moderation queue.'));
    } finally {
      setIsLoading(false);
    }
    // onOverviewChange is stable from App; t only affects the fallback message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Runs a moderation action, then drops the row it acted on. */
  const act = async (
    id: string,
    action: () => Promise<void>,
    removeFrom: 'pending' | 'reports',
    message: string,
  ) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      if (removeFrom === 'pending') {
        setPending((list) => list.filter((p) => p.id !== id));
      } else {
        setReports((list) => list.filter((r) => r.id !== id));
      }
      setNotice(message);
      // The counts in the sidebar come from the server, so re-read rather than
      // guessing at them locally.
      admin.fetchOverview(user).then(onOverviewChange);
    } catch (err: any) {
      setError(err?.message || t('That did not work. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'queue', label: 'Review queue', icon: Clock, count: pending.length },
    { id: 'reports', label: 'Reports', icon: Flag, count: reports.length },
    { id: 'post', label: 'Write a post', icon: PenLine },
  ];

  return (
    <section id="admin" className="py-10 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef3e3] border border-[#d4dfc6] text-[10px] font-bold uppercase tracking-wider text-[#4e6b3e] mb-2">
              <ShieldCheck className="w-3 h-3" />
              {t('Moderator')}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2f4026] leading-tight">
              {t('Community Kitchen admin')}
            </h2>
            <p className="text-sm text-[#4e6b3e] max-w-xl mt-1.5">
              {t(
                'Posts from members wait here until you approve them. Your own posts go straight to the feed.',
              )}
            </p>
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#e9dfc8] text-[#3e5531] text-xs font-semibold hover:bg-[#eef3e3] disabled:opacity-60 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </button>
        </div>

        {/* Standing caveat. This page looks like an admin console, so it should
            say plainly that it is not yet backed by real authentication. */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-[#fdf4ec] border border-[#e7c9ad] px-4 py-3">
          <AlertCircle className="w-4 h-4 text-[#b4642e] shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-[#7a4e32]">
            {t(
              'You are signed in as a moderator because your account email is listed in ADMIN_EMAILS on the server. Every approval, rejection and removal is checked again on the server.',
            )}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-800 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-[#eef3e3] border border-[#d4dfc6] px-4 py-3">
            <Check className="w-4 h-4 text-[#4e6b3e] shrink-0 mt-0.5" />
            <p className="text-xs text-[#3e5531] flex-1">{notice}</p>
            <button onClick={() => setNotice(null)} className="text-[#627f50] hover:text-[#2f4026] cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                  isActive
                    ? 'bg-[#4e6b3e] border-[#4e6b3e] text-white'
                    : 'bg-white border-[#e9dfc8] text-[#3e5531] hover:bg-[#eef3e3]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(item.label)}
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`font-numeric tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-[#4e6b3e]' : 'bg-[#b4642e] text-white'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- Review queue --- */}
        {tab === 'queue' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-[3px] border-[#e9dfc8] border-t-[#4e6b3e] animate-spin" />
              </div>
            ) : pending.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e9dfc8] py-14 text-center">
                <Inbox className="w-10 h-10 text-[#d4dfc6] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#2f4026]">{t('Nothing waiting')}</p>
                <p className="text-xs text-[#5a6b4f] mt-1">
                  {t('New posts from members will appear here for review.')}
                </p>
              </div>
            ) : (
              pending.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-[#e9dfc8] overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row">
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="w-full sm:w-48 h-40 sm:h-auto object-cover shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-center gap-2 text-[11px] text-[#5a6b4f] mb-1">
                        <span className="font-bold text-[#3e5531]">{post.authorName}</span>
                        <span>·</span>
                        <span>{relativeTime(post.createdAt, t)}</span>
                      </div>

                      <h3 className="text-base font-bold text-[#2f4026] leading-snug">
                        {post.title}
                      </h3>

                      {post.description && (
                        <p className="text-[13px] text-[#3e5531] leading-relaxed mt-1 line-clamp-3">
                          {post.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-[#8a9a7c] font-numeric tabular-nums mt-2">
                        <span className="flex items-center gap-1">
                          <Utensils className="w-3 h-3" />
                          {t('Serves')} {post.servings}
                        </span>
                        <span>
                          {formatPrice(post.costPerServingZar, currency)} {t('per serving')}
                        </span>
                        <span>
                          {post.ingredients.length} {t('ingredients')}
                        </span>
                        <span>
                          {post.steps.length} {t('steps')}
                        </span>
                      </div>

                      {post.ingredients.length > 0 && (
                        <p className="text-[11px] text-[#5a6b4f] mt-2 line-clamp-2">
                          {post.ingredients.map((i) => i.name).join(', ')}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3.5">
                        <button
                          onClick={() =>
                            act(
                              post.id,
                              () => admin.approvePost(user, post.id),
                              'pending',
                              `${t('Approved')}: ${post.title}`,
                            )
                          }
                          disabled={busyId === post.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4e6b3e] text-white text-xs font-bold hover:bg-[#3e5531] disabled:opacity-60 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t('Approve')}
                        </button>
                        <button
                          onClick={() =>
                            act(
                              post.id,
                              () => admin.rejectPost(user, post.id),
                              'pending',
                              `${t('Rejected')}: ${post.title}`,
                            )
                          }
                          disabled={busyId === post.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#e9dfc8] text-[#7a4e32] text-xs font-bold hover:bg-[#fdf4ec] hover:border-[#e7c9ad] disabled:opacity-60 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          {t('Reject')}
                        </button>
                        <button
                          onClick={() =>
                            act(
                              post.id,
                              () => admin.removePost(user, post.id),
                              'pending',
                              `${t('Deleted')}: ${post.title}`,
                            )
                          }
                          disabled={busyId === post.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#a8b89a] text-xs font-bold hover:text-rose-600 hover:bg-rose-50 disabled:opacity-60 transition-colors cursor-pointer ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t('Delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {pending.length > 0 && (
              <p className="text-[11px] text-[#5a6b4f] px-1">
                {t(
                  'Rejecting keeps the post on record so you can approve it later if you change your mind. Deleting removes it from the feed for good.',
                )}
              </p>
            )}
          </div>
        )}

        {/* --- Reports --- */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-[3px] border-[#e9dfc8] border-t-[#4e6b3e] animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e9dfc8] py-14 text-center">
                <Flag className="w-10 h-10 text-[#d4dfc6] mx-auto mb-3" />
                <p className="text-sm font-bold text-[#2f4026]">{t('No open reports')}</p>
                <p className="text-xs text-[#5a6b4f] mt-1">
                  {t('When someone reports a post or a comment it lands here.')}
                </p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="bg-white rounded-2xl border border-[#e9dfc8] p-4">
                  <div className="flex items-center gap-2 text-[11px] text-[#5a6b4f] mb-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-[#fdf4ec] border border-[#e7c9ad] text-[#7a4e32] font-bold uppercase tracking-wider text-[9px]">
                      {report.targetType === 'post' ? t('Post') : t('Comment')}
                    </span>
                    <span>{relativeTime(report.createdAt, t)}</span>
                  </div>

                  <p className="text-sm font-bold text-[#2f4026] leading-snug">
                    {report.targetSummary || t('(the content is already gone)')}
                  </p>
                  {report.targetAuthor && (
                    <p className="text-[11px] text-[#5a6b4f] mt-0.5">
                      {t('by')} {report.targetAuthor}
                    </p>
                  )}

                  <p className="text-[13px] text-[#3e5531] mt-2 bg-[#f7eedd] rounded-xl px-3 py-2">
                    <span className="font-bold">{t('Reason')}: </span>
                    {report.reason}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3.5">
                    <button
                      onClick={() =>
                        act(
                          report.id,
                          () => admin.resolveReport(user, report.id),
                          'reports',
                          t('Report dismissed.'),
                        )
                      }
                      disabled={busyId === report.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#e9dfc8] text-[#3e5531] text-xs font-bold hover:bg-[#eef3e3] disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t('Looks fine, dismiss')}
                    </button>

                    <button
                      onClick={() =>
                        act(
                          report.id,
                          async () => {
                            if (report.targetType === 'post') {
                              await admin.removePost(user, report.targetId);
                            } else {
                              await admin.removeComment(user, report.targetId);
                            }
                            // Close the report too, so it does not come back.
                            await admin.resolveReport(user, report.id);
                          },
                          'reports',
                          t('Content removed and the report closed.'),
                        )
                      }
                      disabled={busyId === report.id}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {report.targetType === 'post' ? t('Remove post') : t('Remove comment')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- Write a post --- */}
        {tab === 'post' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 rounded-2xl bg-[#eef3e3] border border-[#d4dfc6] px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-[#4e6b3e] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-[#3e5531]">
                {t(
                  'As a moderator your post skips the queue and appears on the feed immediately.',
                )}
              </p>
            </div>

            <PostComposer
              user={user}
              currency={currency}
              onPosted={() => {
                setNotice(t('Posted to the feed.'));
                setTab('queue');
                refresh();
              }}
              onCancel={() => setTab('queue')}
            />
          </div>
        )}
      </div>
    </section>
  );
};
