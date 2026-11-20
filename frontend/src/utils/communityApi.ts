import { CommunityComment, CommunityPost, ReactionKind, UserProfile } from '../types';
import { authHeaders, parseResponse } from './auth';

/**
 * Client for the community feed endpoints.
 *
 * Calls carry the session token (see auth.ts); the server identifies the
 * caller from it. Browsing is open to guests, writing needs an account.
 */

function headers(user: UserProfile): HeadersInit {
  return authHeaders(user);
}

const parse = parseResponse;

export interface FeedPage {
  posts: CommunityPost[];
  total: number;
  /** True when more posts exist beyond this page. */
  hasMore: boolean;
}

export async function fetchPosts(
  user: UserProfile,
  sort: 'recent' | 'popular' = 'recent',
  limit = 8,
  offset = 0,
): Promise<FeedPage> {
  const res = await fetch(
    `/api/community/posts?sort=${sort}&limit=${limit}&offset=${offset}`,
    { headers: headers(user) },
  );
  const data = await parse<FeedPage>(res);
  return { posts: data.posts || [], total: data.total || 0, hasMore: Boolean(data.hasMore) };
}

export interface NewPostInput {
  title: string;
  description: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  ingredients: { name: string; amount: string; costZar: number }[];
  steps: string[];
  /** JPEG data URL from prepareImage(), or undefined for a post with no photo. */
  imageDataUrl?: string;
}

export async function createPost(user: UserProfile, input: NewPostInput): Promise<void> {
  const res = await fetch('/api/community/posts', {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify(input),
  });
  await parse(res);
}

export async function deletePost(user: UserProfile, postId: string): Promise<void> {
  const res = await fetch(`/api/community/posts/${postId}`, {
    method: 'DELETE',
    headers: headers(user),
  });
  await parse(res);
}

export async function toggleReaction(
  user: UserProfile,
  postId: string,
  kind: ReactionKind,
): Promise<boolean> {
  const res = await fetch(`/api/community/posts/${postId}/reactions`, {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify({ kind }),
  });
  const data = await parse<{ active: boolean }>(res);
  return data.active;
}

export async function fetchComments(
  user: UserProfile,
  postId: string,
): Promise<CommunityComment[]> {
  const res = await fetch(`/api/community/posts/${postId}/comments`, { headers: headers(user) });
  const data = await parse<{ comments: CommunityComment[] }>(res);
  return data.comments || [];
}

export async function addComment(
  user: UserProfile,
  postId: string,
  body: string,
): Promise<CommunityComment[]> {
  const res = await fetch(`/api/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify({ body }),
  });
  const data = await parse<{ comments: CommunityComment[] }>(res);
  return data.comments || [];
}

export async function deleteComment(user: UserProfile, commentId: string): Promise<void> {
  const res = await fetch(`/api/community/comments/${commentId}`, {
    method: 'DELETE',
    headers: headers(user),
  });
  await parse(res);
}

export async function reportContent(
  user: UserProfile,
  targetType: 'post' | 'comment',
  targetId: string,
  reason: string,
): Promise<void> {
  const res = await fetch('/api/community/report', {
    method: 'POST',
    headers: headers(user),
    body: JSON.stringify({ targetType, targetId, reason }),
  });
  await parse(res);
}
