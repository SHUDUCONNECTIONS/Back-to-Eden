import { Injectable, Logger } from '@nestjs/common';
import { deleteUser, exportAccount, PRIVACY_POLICY_VERSION } from '../database/auth-db';
import { exportUserData, purgeUserData } from '../database/community-db';
import { exportFastingData, purgeFastingData } from '../database/fasting-db';

/**
 * A person's data across every store, for POPIA's rights of access and
 * deletion. When a new kind of personal data is added anywhere, it must be
 * added here too - otherwise "delete my account" quietly leaves it behind.
 *
 * Not included, by design: shared grocery lists. They belong to whoever holds
 * the code (often a whole household), are not linked to any account, and are
 * removed automatically after 90 days without use.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  exportAll(userKey: string) {
    return {
      exportedAt: new Date().toISOString(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      note:
        'Everything Back To Eden stores about your account. Times are milliseconds since 1970 (UTC). ' +
        'Shared grocery lists are not linked to accounts, so they are not included.',
      account: exportAccount(userKey),
      community: exportUserData(userKey),
      fasting: exportFastingData(userKey),
    };
  }

  /** Erases everything. Data first, the account (and its sessions) last. */
  deleteAll(userKey: string) {
    const community = purgeUserData(userKey);
    const fastingSessions = purgeFastingData(userKey);
    deleteUser(userKey);
    // No email in the log: the point of this call is that it is forgotten.
    this.logger.log(
      `Account deleted: ${community.posts} recipe(s), ${community.photos} photo(s), ${fastingSessions} fast(s).`,
    );
    return { recipes: community.posts, photos: community.photos, fastingSessions };
  }
}
