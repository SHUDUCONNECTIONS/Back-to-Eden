import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { viewerFromRequest } from './viewer.decorator';

/**
 * Refuses anyone who is not on the server's ADMIN_EMAILS list.
 *
 * Applied with @UseGuards(AdminGuard) on the moderation controller, so every
 * route under it is covered by default - a new endpoint is protected unless
 * someone deliberately removes the guard, rather than the other way round.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly admins: AdminService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const viewer = viewerFromRequest(ctx.switchToHttp().getRequest<Request>());
    if (!this.admins.isAdmin(viewer)) {
      throw new ForbiddenException('That area is for moderators.');
    }
    return true;
  }
}
