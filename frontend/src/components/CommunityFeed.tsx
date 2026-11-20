import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChefHat, ImagePlus, Loader2, Send } from 'lucide-react';
import {
  CommunityComment,
  CommunityPost,
  CurrencyCode,
  ReactionKind,
  RecipeIngredient,
  UserProfile,
} from '../types';
import {
  addComment,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPosts,
  reportContent,
  toggleReaction,
} from '../utils/communityApi';
import { useT } from '../i18n/useTranslation';
import { PostComposer } from './PostComposer';
import { Avatar, PostCard } from './PostCard';

interface CommunityFeedProps {
  user: UserProfile;
  currency: CurrencyCode;
  onAddRecipeIngredientsToCart: (ingredients: RecipeIngredient[], recipeTitle: string) => void;
}

const CommentThread: React.FC<{
  post: CommunityPost;
  user: UserProfile;
  onCountChange: (postId: string, count: number) => void;
  relativeTime: (ts: number) => string;
}> = ({ post, user, onCountChange, relativeTime }) => {
  const t = useT();
  const [comments, setComments] = useState<CommunityComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchComments(user, post.id)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch(() => {
        if (!cancelled) setError(t('Could not load comments.'));
      });
    return () => {
      cancelled = true;
    };
  }, [post.id, user, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setIsSending(true);
    setError('');
    try {
      const list = await addComment(user, post.id, draft);
      setComments(list);
      onCountChange(post.id, list.length);
      setDraft('');
    } catch (err: any) {
      setError(err?.message || t('Could not post that comment.'));
    } finally {
      setIsSending(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await deleteComment(user, commentId);
      const list = await fetchComments(user, post.id);
      setComments(list);
      onCountChange(post.id, list.length);
    } catch (err: any) {
      setError(err?.message || t('Could not delete that comment.'));
    }
  };

  return (
    <div className="pt-3 border-t border-[#f2e9d6] space-y-3">
      {error && <p className="text-[11px] text-rose-700">{error}</p>}

      {comments === null ? (
        <p className="text-[11px] text-[#7b8370] flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> {t('Loading…')}
        </p>
      ) : comments.length === 0 ? (
        <p className="text-[11px] text-[#7b8370]">{t('No comments yet. Be the first.')}</p>
      ) : (
        <ul className="space-y-2.5">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              <Avatar name={comment.authorName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="bg-[#f3eee1] rounded-2xl px-3.5 py-2 inline-block max-w-full">
                  <div className="text-[12px] font-bold text-[#2f4026]">{comment.authorName}</div>
                  <p className="text-[13px] text-[#3e5531] leading-relaxed break-words">
                    {comment.body}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-0.5 ml-1">
                  <span className="text-[10px] text-[#9bab8c]">
                    {relativeTime(comment.createdAt)}
                  </span>
                  {comment.isOwn && (
                    <button
                      onClick={() => remove(comment.id)}
                      className="text-[10px] font-semibold text-[#9bab8c] hover:text-rose-600 cursor-pointer"
                    >
                      {t('Delete')}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <Avatar name={user.name} size="sm" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('Add a comment…')}
          maxLength={1000}
          aria-label={t('Add a comment…')}
          className="flex-1 text-[13px] bg-[#f3eee1] border border-transparent focus:border-[#ddd3ba] rounded-full px-4 py-2 text-[#2f4026] focus:outline-none"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          aria-label={t('Post comment')}
          className="p-2 rounded-full bg-[#4e6b3e] text-white hover:bg-[#3e5531] disabled:opacity-40 transition-colors cursor-pointer shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>
    </div>
  );
};

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  user,
  currency,
  onAddRecipeIngredientsToCart,
}) => {
  const t = useT();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Read inside the observer callback, which would otherwise close over stale
  // values and fire a second request for a page already in flight.
  const loadStateRef = useRef({ isLoading: true, isLoadingMore: false, hasMore: false, count: 0 });
  const [isComposing, setIsComposing] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  // Posts the viewer dismissed with the X. Session-only: nothing is sent to the
  // server, so a reload brings them back.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');

  const relativeTime = useCallback(
    (ts: number): string => {
      const seconds = Math.round((Date.now() - ts) / 1000);
      if (seconds < 60) return t('just now');
      const minutes = Math.round(seconds / 60);
      if (minutes < 60) return `${minutes}${t('m ago')}`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours}${t('h ago')}`;
      const days = Math.round(hours / 24);
      return `${days}${t('d ago')}`;
    },
    [t],
  );

  const PAGE_SIZE = 8;

  /** Loads the first page, replacing whatever is on screen. */
  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const page = await fetchPosts(user, sort, PAGE_SIZE, 0);
      setPosts(page.posts);
      setHasMore(page.hasMore);
      setTotal(page.total);
    } catch (err: any) {
      setError(err?.message || t('Could not load the community feed.'));
    } finally {
      setIsLoading(false);
    }
  }, [user, sort, t]);

  /** Appends the next page. Called by the sentinel as it scrolls into view. */
  const loadMore = useCallback(async () => {
    const state = loadStateRef.current;
    if (state.isLoading || state.isLoadingMore || !state.hasMore) return;

    setIsLoadingMore(true);
    try {
      const page = await fetchPosts(user, sort, PAGE_SIZE, state.count);
      setPosts((existing) => {
        // The feed can shift between requests (a new post, a deletion), so drop
        // anything already on screen rather than rendering duplicate keys.
        const seen = new Set(existing.map((p) => p.id));
        return [...existing, ...page.posts.filter((p) => !seen.has(p.id))];
      });
      setHasMore(page.hasMore);
      setTotal(page.total);
    } catch (err: any) {
      setError(err?.message || t('Could not load more posts.'));
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, sort, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Mirror load state into the ref the observer reads.
  useEffect(() => {
    loadStateRef.current = { isLoading, isLoadingMore, hasMore, count: posts.length };
  }, [isLoading, isLoadingMore, hasMore, posts.length]);

  // Infinite scroll: fetch the next page once the sentinel below the last post
  // comes within 600px of the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const react = async (post: CommunityPost, kind: ReactionKind) => {
    // Optimistic: flip the count and the viewer's own state straight away, then
    // reconcile with whatever the server says.
    const had = post.viewerReactions.includes(kind);
    setPosts((all) =>
      all.map((p) =>
        p.id === post.id
          ? {
              ...p,
              viewerReactions: had
                ? p.viewerReactions.filter((k) => k !== kind)
                : [...p.viewerReactions, kind],
              likeCount: kind === 'like' ? p.likeCount + (had ? -1 : 1) : p.likeCount,
              cookedCount: kind === 'cooked' ? p.cookedCount + (had ? -1 : 1) : p.cookedCount,
            }
          : p,
      ),
    );

    try {
      await toggleReaction(user, post.id, kind);
    } catch {
      load();
    }
  };

  const remove = async (postId: string) => {
    try {
      await deletePost(user, postId);
      setPosts((all) => all.filter((p) => p.id !== postId));
    } catch (err: any) {
      setError(err?.message || t('Could not delete that post.'));
    }
  };

  const report = async (postId: string) => {
    const reason = window.prompt(
      t('What is wrong with this post? A moderator will review it.') || '',
    );
    if (reason === null) return;
    try {
      await reportContent(user, 'post', postId, reason);
      setNotice(t('Thanks — this has been sent for review.'));
      setTimeout(() => setNotice(''), 4000);
    } catch (err: any) {
      setError(err?.message || t('Could not send that report.'));
    }
  };

  const addToList = (post: CommunityPost) => {
    const ingredients: RecipeIngredient[] = post.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      portionCostZar: ing.costZar,
      packCostZar: ing.costZar,
      packSize: t('As posted'),
      category: 'pantry',
      nutrition: t('Community recipe'),
    }));
    onAddRecipeIngredientsToCart(ingredients, post.title);
    setNotice(t('Added to your grocery list.'));
    setTimeout(() => setNotice(''), 3000);
  };

  const hide = (postId: string) => {
    setHiddenIds((ids) => new Set(ids).add(postId));
  };

  const visiblePosts = posts.filter((p) => !hiddenIds.has(p.id));

  const toggleComments = (postId: string) => {
    setOpenComments((open) => {
      const next = new Set(open);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const setCommentCount = (postId: string, count: number) => {
    setPosts((all) => all.map((p) => (p.id === postId ? { ...p, commentCount: count } : p)));
  };



  return (
    <section id="community" className="py-12 px-4 sm:px-8 bg-[#f7eedd] border-b border-[#ece2cc]">
      {/* Full width: the cards tile across the whole content area rather than
          sitting in a narrow centred column with dead space either side. */}
      <div className="w-full">
        <div className="space-y-5 min-w-0">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#5f7250] uppercase">
            <span className="w-5 h-px bg-[#5f7250]"></span>
            <span>{t('Community Kitchen')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2f4026]">
            {t('What your neighbours are cooking.')}
          </h2>
          <p className="text-sm text-[#4e6b3e]">
            {t('Share a recipe that worked for your household, and see what others cook on a budget.')}
          </p>
        </div>

        {notice && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {notice}
          </div>
        )}
        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Composer: a prompt row that opens the full form, as a feed does */}
        {isComposing ? (
          <PostComposer
            user={user}
            currency={currency}
            onPosted={() => {
              setIsComposing(false);
              load();
            }}
            onCancel={() => setIsComposing(false)}
          />
        ) : (
          <div className="bg-white border border-[#e4dac2] rounded-2xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} />
              <button
                onClick={() => setIsComposing(true)}
                className="flex-1 text-left px-4 py-2.5 rounded-full bg-[#f3eee1] hover:bg-[#ece2cc] text-[13px] text-[#7b8370] transition-colors cursor-pointer"
              >
                {t('What did you cook today,')} {user.name.split(' ')[0]}?
              </button>
            </div>
            <div className="pt-2.5 border-t border-[#f2e9d6]">
              <button
                onClick={() => setIsComposing(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold text-[#4e6b3e] hover:bg-[#eef3e3] transition-colors cursor-pointer"
              >
                <ImagePlus className="w-[18px] h-[18px]" />
                <span>{t('Photo & recipe')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2">
          {(['recent', 'popular'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSort(option)}
              aria-pressed={sort === option}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                sort === option
                  ? 'bg-[#4e6b3e] text-white'
                  : 'text-[#4e6b3e] bg-white border border-[#e9dfc8] hover:bg-[#eef3e3]'
              }`}
            >
              {option === 'recent' ? t('Most recent') : t('Most loved')}
            </button>
          ))}
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="py-12 text-center text-sm text-[#5a6b4f] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('Loading…')}
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="text-center py-14 px-4 bg-white border border-dashed border-[#e9dfc8] rounded-2xl space-y-2">
            <ChefHat className="w-7 h-7 text-[#627f50] mx-auto" />
            <p className="text-sm font-semibold text-[#2f4026]">{t('No recipes shared yet.')}</p>
            <p className="text-xs text-[#5a6b4f] max-w-sm mx-auto">
              {t('Be the first to post something your household actually cooks.')}
            </p>
          </div>
        ) : (
          <>
          {/* Cards tile into as many columns as the width allows. items-start
              keeps each card at its natural height: stretching a row would mean
              that opening comments on one card left dead space inside the three
              beside it. Clamped captions keep heights close anyway. */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currency={currency}
                commentsOpen={openComments.has(post.id)}
                onReact={react}
                onToggleComments={toggleComments}
                onAddToList={addToList}
                onDelete={remove}
                onReport={report}
                onHide={hide}
                relativeTime={relativeTime}
              >
                <CommentThread
                  post={post}
                  user={user}
                  onCountChange={setCommentCount}
                  relativeTime={relativeTime}
                />
              </PostCard>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />

          {isLoadingMore && (
            <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#5a6b4f]">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('Loading more recipes…')}
            </div>
          )}

          {!hasMore && !isLoadingMore && posts.length > 0 && (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs font-semibold text-[#5a6b4f]">
                {t('That is everything for now.')}
              </p>
              <p className="text-[11px] text-[#9bab8c]">
                {total} {total === 1 ? t('recipe shared') : t('recipes shared')} ·{' '}
                <button
                  onClick={() => setIsComposing(true)}
                  className="font-semibold text-[#4e6b3e] hover:underline cursor-pointer"
                >
                  {t('add yours')}
                </button>
              </p>
            </div>
          )}
          </>
        )}

          <p className="text-[10px] text-[#7b8370] leading-relaxed text-center">
            {t('Recipes here are shared by other people using the app, not checked by a nutritionist. Use your own judgement, especially with food safety.')}
          </p>
        </div>
      </div>
    </section>
  );
};
