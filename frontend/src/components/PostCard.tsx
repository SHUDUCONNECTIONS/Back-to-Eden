import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  Flag,
  Globe,
  Clock,
  MessageCircle,
  MoreHorizontal,
  ShoppingCart,
  ThumbsUp,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { CommunityPost, CurrencyCode, ReactionKind } from '../types';
import { formatPrice } from '../utils/currency';
import { useT } from '../i18n/useTranslation';

/** Initials avatar. There are no profile photos, so names carry the identity. */
export const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' }> = ({ name, size = 'md' }) => {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const dimension = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';

  return (
    <div
      className={`${dimension} rounded-full bg-[#eef3e3] border border-[#d4dfc6] flex items-center justify-center font-bold text-[#4e6b3e] shrink-0`}
      aria-hidden="true"
    >
      {initials || '?'}
    </div>
  );
};

/** Renders #hashtags in the accent colour, leaving the rest as plain text. */
const Caption: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(#[\p{L}\p{N}_]+)/gu).map((part, idx) =>
      part.startsWith('#') ? (
        <span key={idx} className="text-[#4e6b3e] font-medium">
          {part}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      ),
    )}
  </>
);

interface PostCardProps {
  post: CommunityPost;
  currency: CurrencyCode;
  commentsOpen: boolean;
  onReact: (post: CommunityPost, kind: ReactionKind) => void;
  onToggleComments: (postId: string) => void;
  onAddToList: (post: CommunityPost) => void;
  onDelete: (postId: string) => void;
  onReport: (postId: string) => void;
  onHide: (postId: string) => void;
  relativeTime: (ts: number) => string;
  children?: React.ReactNode;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currency,
  commentsOpen,
  onReact,
  onToggleComments,
  onAddToList,
  onDelete,
  onReport,
  onHide,
  relativeTime,
  children,
}) => {
  const t = useT();
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const liked = post.viewerReactions.includes('like');
  const cooked = post.viewerReactions.includes('cooked');
  const totalReactions = post.likeCount + post.cookedCount;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const actionClass = (active: boolean) =>
    `flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 rounded-md text-[13px] font-semibold transition-colors cursor-pointer ${
      active ? 'text-[#3e5531] bg-[#eef3e3]' : 'text-[#65758a] hover:bg-[#f3eee1]'
    }`;

  const menuItem =
    'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left text-[#2f4026] hover:bg-[#f7eedd] transition-colors cursor-pointer';

  return (
    <article
      id={`post-${post.id}`}
      className="bg-white border border-[#e4dac2] rounded-xl shadow-2xs overflow-hidden scroll-mt-20 flex flex-col"
    >
      {/* Author row */}
      <header className="flex items-start gap-2.5 px-3.5 pt-3.5 pb-2">
        <Avatar name={post.authorName} />
        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-[13px] font-bold text-[#2f4026] truncate">{post.authorName}</div>
          <div className="text-[11px] text-[#8a9a7c] flex items-center gap-1">
            <span>{relativeTime(post.createdAt)}</span>
            <span aria-hidden="true">·</span>
            {/* A pending post is only ever in the feed for its own author, so
                this badge tells them why nobody else can see it yet. */}
            {post.status === 'pending' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#fdf4ec] border border-[#e7c9ad] text-[#7a4e32] font-bold text-[9px] uppercase tracking-wider">
                <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                {t('Waiting for review')}
              </span>
            ) : post.status === 'rejected' ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[9px] uppercase tracking-wider">
                {t('Not approved')}
              </span>
            ) : (
              <>
                <Globe className="w-3 h-3" aria-hidden="true" />
                <span className="sr-only">{t('Public post')}</span>
              </>
            )}
          </div>
        </div>

        <div className="relative shrink-0 flex items-center" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('More options')}
            className="p-1.5 text-[#8a9a7c] hover:text-[#2f4026] hover:bg-[#f3eee1] rounded-full transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => onHide(post.id)}
            aria-label={t('Hide this post')}
            title={t('Hide this post')}
            className="p-1.5 text-[#8a9a7c] hover:text-[#2f4026] hover:bg-[#f3eee1] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-[18px] h-[18px]" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 w-52 bg-white border border-[#e4dac2] rounded-xl shadow-lg z-20 py-1.5"
            >
              <button
                role="menuitem"
                className={menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onAddToList(post);
                }}
              >
                <ShoppingCart className="w-4 h-4 text-[#4e6b3e]" />
                {t('Add to grocery list')}
              </button>
              <button
                role="menuitem"
                className={menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  onHide(post.id);
                }}
              >
                <EyeOff className="w-4 h-4 text-[#4e6b3e]" />
                {t('Hide this post')}
              </button>
              {post.isOwn ? (
                <button
                  role="menuitem"
                  className={`${menuItem} text-rose-700`}
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(post.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('Delete post')}
                </button>
              ) : (
                <button
                  role="menuitem"
                  className={`${menuItem} text-rose-700`}
                  onClick={() => {
                    setMenuOpen(false);
                    onReport(post.id);
                  }}
                >
                  <Flag className="w-4 h-4" />
                  {t('Report post')}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Caption */}
      {post.description && (
        <p className="px-3.5 pb-2.5 text-[13.5px] text-[#2f4026] leading-relaxed line-clamp-3">
          <Caption text={post.description} />
        </p>
      )}

      {/* Full-bleed photo */}
      {post.imageUrl && (
        <div className="bg-[#e9efe0] aspect-[4/3]">
          <img
            src={post.imageUrl}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Attachment band, in the slot a link preview occupies on a social post */}
      <div className="bg-[#f3eee1] border-y border-[#e4dac2] px-3.5 py-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a7c] font-numeric tabular-nums">
          {formatPrice(post.costPerServingZar, currency)} {t('per serving')} · {t('Serves')}{' '}
          {post.servings}
          {post.cookTime && ` · ${post.cookTime}`}
        </div>
        <h3 className="text-[15px] font-bold text-[#2f4026] leading-snug line-clamp-2 mt-0.5">
          {post.title}
        </h3>
      </div>

      {/* Counts */}
      {(totalReactions > 0 || post.commentCount > 0) && (
        <div className="px-3.5 py-2 flex items-center justify-between text-[12px] text-[#8a9a7c]">
          <div className="flex items-center gap-1.5 min-w-0">
            {totalReactions > 0 && (
              <>
                <span className="flex -space-x-1 shrink-0" aria-hidden="true">
                  {post.likeCount > 0 && (
                    <span className="w-[18px] h-[18px] rounded-full bg-[#4e6b3e] border-2 border-white flex items-center justify-center">
                      <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                    </span>
                  )}
                  {post.cookedCount > 0 && (
                    <span className="w-[18px] h-[18px] rounded-full bg-[#b07d3a] border-2 border-white flex items-center justify-center">
                      <UtensilsCrossed className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </span>
                <span className="font-numeric tabular-nums truncate">{totalReactions}</span>
              </>
            )}
          </div>
          {post.commentCount > 0 && (
            <button
              onClick={() => onToggleComments(post.id)}
              className="hover:underline cursor-pointer shrink-0"
            >
              <span className="font-numeric tabular-nums">{post.commentCount}</span>{' '}
              {post.commentCount === 1 ? t('comment') : t('comments')}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mx-3.5 border-t border-[#f2e9d6] flex items-center gap-1 py-1">
        <button onClick={() => onReact(post, 'like')} aria-pressed={liked} className={actionClass(liked)}>
          <ThumbsUp className={`w-[17px] h-[17px] ${liked ? 'fill-[#4e6b3e] text-[#4e6b3e]' : ''}`} />
          <span className="truncate">{t('Like')}</span>
        </button>
        <button
          onClick={() => onReact(post, 'cooked')}
          aria-pressed={cooked}
          className={actionClass(cooked)}
        >
          <UtensilsCrossed className="w-[17px] h-[17px]" />
          <span className="truncate">{t('Cooked this')}</span>
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          aria-expanded={commentsOpen}
          className={actionClass(commentsOpen)}
        >
          <MessageCircle className="w-[17px] h-[17px]" />
          <span className="truncate">{t('Comment')}</span>
        </button>
      </div>

      {/* Recipe, collapsed so the card reads as a post first */}
      <div className="mx-3.5 border-t border-[#f2e9d6]">
        <button
          onClick={() => setRecipeOpen((v) => !v)}
          aria-expanded={recipeOpen}
          className="w-full flex items-center justify-between py-2 text-[12px] font-semibold text-[#4e6b3e] hover:text-[#2f4026] cursor-pointer gap-2"
        >
          <span className="truncate">
            {recipeOpen ? t('Hide the recipe') : t('View the recipe')}
            <span className="text-[#9bab8c] font-normal">
              {' '}
              · {post.ingredients.length} {t('ingredients')}
            </span>
          </span>
          {recipeOpen ? (
            <ChevronUp className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" />
          )}
        </button>

        {recipeOpen && (
          <div className="pb-3 space-y-3">
            <div className="bg-[#fdfaf3] border border-[#f2e9d6] rounded-xl p-3 space-y-3">
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a7c]">
                  {t('Ingredients')}
                </h4>
                <ul className="space-y-1">
                  {post.ingredients.map((ing, idx) => (
                    <li
                      key={idx}
                      className="text-[11.5px] text-[#3e5531] leading-relaxed flex justify-between gap-2"
                    >
                      <span>
                        {ing.name}
                        {ing.amount && <span className="text-[#8a9a7c]"> · {ing.amount}</span>}
                      </span>
                      {ing.costZar > 0 && (
                        <span className="font-numeric tabular-nums text-[#4e6b3e] shrink-0">
                          {formatPrice(ing.costZar, currency)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8a9a7c]">
                  {t('Directions')}
                </h4>
                <ol className="space-y-1.5">
                  {post.steps.map((step, idx) => (
                    <li key={idx} className="text-[11.5px] text-[#3e5531] leading-relaxed flex gap-2">
                      <span className="shrink-0 mt-px w-4 h-4 rounded-full bg-[#eef3e3] border border-[#d4dfc6] text-[9px] font-bold text-[#4e6b3e] flex items-center justify-center font-numeric tabular-nums">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <button
              onClick={() => onAddToList(post)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-[#4e6b3e] bg-[#eef3e3] hover:bg-[#d4dfc6] border border-[#d4dfc6] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t('Add these ingredients to my grocery list')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Comments */}
      {commentsOpen && <div className="px-3.5 pb-3.5">{children}</div>}
    </article>
  );
};
