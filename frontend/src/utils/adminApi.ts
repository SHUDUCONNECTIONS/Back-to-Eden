import { AdminOverview, CommunityPost, ModerationReport, UserProfile } from '../types';
import { authHeaders, parseResponse } from './auth';

/**
 * Client for the moderation endpoints.
 *
 * Whether someone is an admin is decided by the server from ADMIN_EMAILS, never
 * by this file - a client that could set its own flag would be worthless. What
 * `fetchOverview` returns is the server's answer, and the UI only uses it to
 * decide what to show. Every moderation route is checked again server-side.
 */

function headers(user: UserProfile): HeadersInit {
  return authHeaders(user);
}

const parse = parseResponse;

const NOT_ADMIN: AdminOverview = { isAdmin: false, pendingCount: 0, reportCount: 0 };

/** Safe for anyone to call: it only describes the caller. */
export async function fetchOverview(user: UserProfile): Promise<AdminOverview> {
  try {
    const res = await fetch('/api/community/me', { headers: headers(user) });
    const data = await parse<AdminOverview>(res);
    return {
      isAdmin: Boolean(data.isAdmin),
      pendingCount: data.pendingCount || 0,
      reportCount: data.reportCount || 0,
    };
  } catch {
    // A failed check must not grant anything, so fall back to "not an admin".
    return NOT_ADMIN;
  }
}

export async function fetchPending(user: UserProfile): Promise<CommunityPost[]> {
  const res = await fetch('/api/community/admin/pending', { headers: headers(user) });
  const data = await parse<{ posts: CommunityPost[] }>(res);
  return data.posts || [];
}

export async function approvePost(user: UserProfile, postId: string): Promise<void> {
  const res = await fetch(`/api/community/admin/posts/${postId}/approve`, {
    method: 'POST',
    headers: headers(user),
  });
  await parse(res);
}

export async function rejectPost(user: UserProfile, postId: string): Promise<void> {
  const res = await fetch(`/api/community/admin/posts/${postId}/reject`, {
    method: 'POST',
    headers: headers(user),
  });
  await parse(res);
}

/** Removes a post whoever wrote it. */
export async function removePost(user: UserProfile, postId: string): Promise<void> {
  const res = await fetch(`/api/community/admin/posts/${postId}`, {
    method: 'DELETE',
    headers: headers(user),
  });
  await parse(res);
}

export async function fetchReports(user: UserProfile): Promise<ModerationReport[]> {
  const res = await fetch('/api/community/admin/reports', { headers: headers(user) });
  const data = await parse<{ reports: ModerationReport[] }>(res);
  return data.reports || [];
}

/** Dismisses a report and leaves the reported content alone. */
export async function resolveReport(user: UserProfile, reportId: string): Promise<void> {
  const res = await fetch(`/api/community/admin/reports/${reportId}/resolve`, {
    method: 'POST',
    headers: headers(user),
  });
  await parse(res);
}

export async function removeComment(user: UserProfile, commentId: string): Promise<void> {
  const res = await fetch(`/api/community/admin/comments/${commentId}`, {
    method: 'DELETE',
    headers: headers(user),
  });
  await parse(res);
}
