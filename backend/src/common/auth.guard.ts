import {
  CanActivate,
  ForbiddenException,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { viewerFromRequest } from './viewer.decorator';

const IS_PUBLIC = 'isPublic';

/**
 * Marks a route (or a whole controller) as open to signed-out visitors.
 * Everything else requires a valid session.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Registered globally, so a new route is protected unless someone deliberately
 * marks it @Public() - failing closed rather than open.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const viewer = viewerFromRequest(req);
    if (!viewer.authenticated) {
      throw new UnauthorizedException('Please sign in to do that.');
    }
    // POPIA: nothing is processed for an account until it has accepted the
    // current privacy policy. The account routes stay open so the person can
    // accept, download their data, delete the account or sign out.
    if (viewer.needsConsent && !req.path.startsWith('/api/auth/')) {
      throw new ForbiddenException('Please accept the updated privacy policy to continue.');
    }
    return true;
  }
}
