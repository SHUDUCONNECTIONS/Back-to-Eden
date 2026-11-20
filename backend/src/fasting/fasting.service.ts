import { ConflictException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as db from '../database/fasting-db';

/**
 * The Fasting Journey: one running fast per person, plus the history behind it.
 *
 * Day-boundary work (streaks, "fasts this week") deliberately does not happen
 * here. The server does not know the user's timezone, and a fast that ends at
 * 01:00 in Johannesburg belongs to a different calendar day than it would in
 * UTC. Clients get raw timestamps and do that arithmetic locally.
 */
@Injectable()
export class FastingService {
  getState(userKey: string) {
    return {
      active: db.getActiveSession(userKey),
      sessions: db.listSessions(userKey),
      totals: db.totalsFor(userKey),
      lastSchedule: db.lastScheduleFor(userKey),
    };
  }

  start(userKey: string, scheduleId: unknown, targetHours: unknown, startedAt?: unknown) {
    try {
      return db.startFast(userKey, scheduleId, targetHours, startedAt);
    } catch (err) {
      if (err instanceof db.ActiveFastError) {
        // Not a mistake the user made. Hand back the running fast so the
        // client can simply show it instead of reporting a failure.
        throw new ConflictException({
          error: 'A fast is already running.',
          session: err.session,
        });
      }
      throw err;
    }
  }

  stop(userKey: string, note?: unknown) {
    const session = db.stopFast(userKey, note);
    if (!session) {
      throw new NotFoundException('No fast is running.');
    }
    return session;
  }

  discard(userKey: string): void {
    if (!db.discardActiveFast(userKey)) {
      throw new NotFoundException('No fast is running.');
    }
  }

  deleteSession(userKey: string, sessionId: string): void {
    if (!db.deleteSession(userKey, sessionId)) {
      throw new ForbiddenException('That record is not yours to delete.');
    }
  }
}
