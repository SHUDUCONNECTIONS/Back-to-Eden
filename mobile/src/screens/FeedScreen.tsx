import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CommunityPost, ReactionKind, UserProfile } from '../../../shared/types';
import * as api from '../lib/api';
import { absoluteUrl } from '../lib/config';
import { colors, radius, spacing } from '../lib/theme';
import { useT, type Translate } from '../i18n/I18nContext';
import { errorText } from '../lib/errorText';

const PAGE_SIZE = 8;

function relativeTime(ts: number, t: Translate): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return t('just now');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function rand(amount: number): string {
  return `R${amount.toFixed(2)}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

interface CardProps {
  post: CommunityPost;
  onReact: (postId: string, kind: ReactionKind) => void;
}

const PostCard: React.FC<CardProps> = ({ post, onReact }) => {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const photo = absoluteUrl(post.imageUrl);
  const liked = post.viewerReactions.includes('like');
  const cooked = post.viewerReactions.includes('cooked');

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(post.authorName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.authorName}
          </Text>
          <Text style={styles.metaSmall}>
            {relativeTime(post.createdAt, t)}
            {post.status === 'pending' ? `  ·  ${t('waiting for review')}` : ''}
          </Text>
        </View>
      </View>

      {!!post.description && (
        <Text style={styles.caption} numberOfLines={3}>
          {post.description}
        </Text>
      )}

      {photo && <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />}

      <View style={styles.attachment}>
        <Text style={styles.attachmentMeta}>
          {t('{price} PER SERVING · SERVES {count}', { price: rand(post.costPerServingZar), count: post.servings })}
          {post.cookTime ? ` · ${post.cookTime}` : ''}
        </Text>
        <Text style={styles.attachmentTitle} numberOfLines={2}>
          {post.title}
        </Text>
      </View>

      <View style={styles.countsRow}>
        <Text style={styles.countsText}>
          {post.likeCount > 0 ? post.likeCount === 1
            ? t('{count} like', { count: post.likeCount })
            : t('{count} likes', { count: post.likeCount }) : ' '}
        </Text>
        <Text style={styles.countsText}>
          {post.cookedCount > 0 ? t('{count} cooked', { count: post.cookedCount }) : ''}
          {post.commentCount > 0
            ? '   ' + (post.commentCount === 1
                ? t('{count} comment', { count: post.commentCount })
                : t('{count} comments', { count: post.commentCount }))
            : ''}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.action}
          onPress={() => onReact(post.id, 'like')}
          accessibilityRole="button"
        >
          <Text style={[styles.actionText, liked && styles.actionTextOn]}>
            {liked ? `♥  ${t('Liked')}` : `♡  ${t('Like')}`}
          </Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => onReact(post.id, 'cooked')}>
          <Text style={[styles.actionText, cooked && styles.actionTextOn]}>
            {cooked ? `✓  ${t('Cooked')}` : t('Cooked this')}
          </Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => setExpanded((v) => !v)}>
          <Text style={styles.actionText}>{expanded ? t('Hide recipe') : t('Recipe')}</Text>
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.recipe}>
          <Text style={styles.recipeHeading}>{t('Ingredients')}</Text>
          {post.ingredients.map((ing, i) => (
            <Text key={i} style={styles.recipeLine}>
              • {ing.name}
              {ing.amount ? ` — ${ing.amount}` : ''}
              {ing.costZar > 0 ? `  (${rand(ing.costZar)})` : ''}
            </Text>
          ))}

          {post.steps.length > 0 && (
            <>
              <Text style={[styles.recipeHeading, { marginTop: spacing.md }]}>{t('Directions')}</Text>
              {post.steps.map((step, i) => (
                <Text key={i} style={styles.recipeLine}>
                  {i + 1}. {step}
                </Text>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
};

export const FeedScreen: React.FC<{ user: UserProfile }> = ({ user }) => {
  const t = useT();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref as well as state: the FlatList's onEndReached fires from a
  // closure created on an earlier render, which would otherwise read stale
  // values and either spam requests or stop paging early.
  const loadState = useRef({ loading: true, loadingMore: false, hasMore: false, count: 0 });

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setIsRefreshing(true);
      else setIsLoading(true);
      loadState.current.loading = true;

      try {
        const page = await api.fetchFeed(user, 'recent', PAGE_SIZE, 0);
        setPosts(page.posts);
        loadState.current.hasMore = page.hasMore;
        loadState.current.count = page.posts.length;
        setError(null);
      } catch (err: any) {
        setError(errorText(err, t, t('Could not load the feed.')));
      } finally {
        loadState.current.loading = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user, t],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  const loadMore = useCallback(async () => {
    const s = loadState.current;
    if (s.loading || s.loadingMore || !s.hasMore) return;
    s.loadingMore = true;
    try {
      const page = await api.fetchFeed(user, 'recent', PAGE_SIZE, s.count);
      setPosts((existing) => {
        const seen = new Set(existing.map((p) => p.id));
        const merged = [...existing, ...page.posts.filter((p) => !seen.has(p.id))];
        s.count = merged.length;
        return merged;
      });
      s.hasMore = page.hasMore;
    } catch {
      // A failed page is not worth an error screen; the next scroll retries.
      s.hasMore = false;
    } finally {
      s.loadingMore = false;
    }
  }, [user]);

  /**
   * Updates the count and the viewer's own reaction immediately, then asks the
   * server. On a phone the round trip is long enough to feel broken otherwise.
   */
  const react = useCallback(
    async (postId: string, kind: ReactionKind) => {
      let previous: CommunityPost[] = [];
      setPosts((list) => {
        previous = list;
        return list.map((p) => {
          if (p.id !== postId) return p;
          const had = p.viewerReactions.includes(kind);
          const delta = had ? -1 : 1;
          return {
            ...p,
            viewerReactions: had
              ? p.viewerReactions.filter((r) => r !== kind)
              : [...p.viewerReactions, kind],
            likeCount: kind === 'like' ? p.likeCount + delta : p.likeCount,
            cookedCount: kind === 'cooked' ? p.cookedCount + delta : p.cookedCount,
          };
        });
      });

      try {
        await api.toggleReaction(user, postId, kind);
      } catch {
        // Put it back rather than leaving a count that the server disagrees with.
        setPosts(previous);
      }
    },
    [user],
  );

  if (isLoading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centre}>
        <Text style={styles.errorTitle}>{t('Could not load the feed')}</Text>
        <Text style={styles.errorBody}>{error}</Text>
        <Pressable style={styles.retry} onPress={() => load('initial')}>
          <Text style={styles.retryText}>{t('Try again')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PostCard post={item} onReact={react} />}
      contentContainerStyle={styles.listContent}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => load('refresh')}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <View style={styles.centre}>
          <Text style={styles.errorTitle}>{t('No posts yet')}</Text>
          <Text style={styles.errorBody}>
            {t('Recipes shared in the Community Kitchen will appear here.')}
          </Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  listContent: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.tintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  authorName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  metaSmall: { color: colors.mutedLight, fontSize: 11, marginTop: 1 },

  caption: {
    color: colors.textBody,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.borderSoft },

  attachment: {
    backgroundColor: '#f3eee1',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e4dac2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  attachmentMeta: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.mutedLight,
  },
  attachmentTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },

  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  countsText: { fontSize: 12, color: colors.mutedLight },

  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    marginTop: spacing.sm,
  },
  action: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  actionTextOn: { color: colors.primary },

  recipe: {
    borderTopWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  recipeHeading: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  recipeLine: { fontSize: 13, color: colors.textBody, lineHeight: 20 },

  errorTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  errorBody: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  retry: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});
