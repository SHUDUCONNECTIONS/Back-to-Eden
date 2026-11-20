import { Injectable, Logger } from '@nestjs/common';
import type { ViewerInfo } from './viewer.decorator';

/**
 * Who may moderate.
 *
 * Read once from ADMIN_EMAILS (comma separated) in .env. A caller is an admin
 * only when they are signed in with a verified session whose account email is
 * on that list. Admin accounts cannot be registered from the web; their
 * password is set on the server with src/cli/set-password.ts.
 *
 * With ADMIN_EMAILS unset there are no admins: the admin page stays hidden and
 * every moderation route answers 403. That is the safe default - it fails
 * closed, not open.
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly adminKeys: Set<string>;

  constructor() {
    this.adminKeys = new Set(
      String(process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    );

    if (this.adminKeys.size === 0) {
      this.logger.warn(
        'No ADMIN_EMAILS set - the admin page is hidden and moderation routes will refuse. ' +
          'Add ADMIN_EMAILS=you@example.com to backend/.env to enable it.',
      );
    } else {
      this.logger.log(`Moderation enabled for ${this.adminKeys.size} admin address(es).`);
    }
  }

  isAdmin(viewer: ViewerInfo): boolean {
    return viewer.authenticated && this.adminKeys.has(viewer.key);
  }

  isAdminEmail(email: string): boolean {
    return this.adminKeys.has(String(email).trim().toLowerCase());
  }
}
