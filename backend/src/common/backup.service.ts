import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import { DATA_DIR } from '../database/data-dir';
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DATABASES = ['auth.db', 'community.db', 'fasting.db', 'sync.db', 'translations.db'];
const KEEP_DAYS = Math.max(1, Number(process.env.BACKUP_KEEP_DAYS) || 7);

/**
 * Nightly, consistent copies of every SQLite database into data/backups/<date>.
 *
 * Copying a live SQLite file can catch it mid-write; VACUUM INTO produces a
 * clean, self-contained snapshot instead. The snapshots live on the same
 * volume, so they guard against mistakes and corruption, and the hosting
 * provider's volume backups (Railway: daily/weekly/monthly) carry them
 * off-machine. Photos in data/uploads are covered by those volume backups.
 *
 * Note: deleted accounts remain in snapshots until the snapshot ages out
 * (KEEP_DAYS) - the privacy policy states how long backups are kept.
 */
@Injectable()
export class BackupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BackupService.name);

  onApplicationBootstrap() {
    if (process.env.BACKUPS === 'off') return;
    // First run shortly after start (so a deploy loop cannot hammer the disk),
    // then once a day.
    setTimeout(() => this.runSafely(), 60_000).unref();
    setInterval(() => this.runSafely(), 24 * 60 * 60 * 1000).unref();
  }

  private runSafely() {
    try {
      this.snapshot();
    } catch (err: any) {
      this.logger.error(`Backup failed: ${err?.message || err}`);
    }
  }

  /** Writes today's snapshot (once per day) and prunes old ones. Returns its folder. */
  snapshot(): string {
    const day = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, day);
    if (!fs.existsSync(target)) {
      const tmp = `${target}.partial`;
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.mkdirSync(tmp, { recursive: true });
      for (const name of DATABASES) {
        const source = path.join(DATA_DIR, name);
        if (!fs.existsSync(source)) continue;
        const db = new DatabaseSync(source);
        try {
          db.exec(`VACUUM INTO '${path.join(tmp, name).replace(/'/g, "''")}'`);
        } finally {
          db.close();
        }
      }
      // Rename last, so a half-written snapshot is never mistaken for a good one.
      fs.renameSync(tmp, target);
      this.logger.log(`Database snapshot written: backups/${day}`);
    }
    this.prune();
    return target;
  }

  private prune() {
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
    for (const entry of fs.readdirSync(BACKUP_DIR)) {
      const time = Date.parse(entry.slice(0, 10));
      if (Number.isFinite(time) && time < cutoff) {
        fs.rmSync(path.join(BACKUP_DIR, entry), { recursive: true, force: true });
      }
    }
  }
}
