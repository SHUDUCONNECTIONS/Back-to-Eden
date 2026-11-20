import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PRIVACY_POLICY_VERSION, userForToken } from '../database/auth-db';

/**
 * Who is calling, as established by the server.
 *
 * Identity comes only from a session token in `Authorization: Bearer <token>`,
 * issued by /api/auth/login or /api/auth/register and looked up in auth.db.
 * Nothing the client says about itself (name, email) is trusted. Without a
 * valid token the caller is anonymous; AuthGuard refuses anonymous callers on
 * every route not marked @Public().
 */
export interface ViewerInfo {
  /** Lower-cased email for a signed-in user, 'anonymous' otherwise. */
  key: string;
  name: string;
  authenticated: boolean;
  /** Signed in, but has not accepted the current privacy policy yet. */
  needsConsent: boolean;
}

const ANONYMOUS: ViewerInfo = {
  key: 'anonymous',
  name: 'Anonymous cook',
  authenticated: false,
  needsConsent: false,
};

export function bearerToken(req: Request): string {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export function viewerFromRequest(req: Request): ViewerInfo {
  // Looked up once per request, then reused by the guard and the handler.
  const cached = (req as any).__viewer as ViewerInfo | undefined;
  if (cached) return cached;

  const user = userForToken(bearerToken(req));
  const viewer: ViewerInfo = user
    ? {
        key: user.email,
        name: user.name,
        authenticated: true,
        needsConsent: user.policyVersion !== PRIVACY_POLICY_VERSION,
      }
    : ANONYMOUS;
  (req as any).__viewer = viewer;
  return viewer;
}

/** Injects the signed-in caller: `handler(@Viewer() viewer: ViewerInfo)`. */
export const Viewer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ViewerInfo =>
    viewerFromRequest(ctx.switchToHttp().getRequest<Request>()),
);
