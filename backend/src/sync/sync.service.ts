import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { loadRoom, pruneRooms, saveRoom } from '../database/sync-db';

export interface SyncItem {
  id: string;
  name: string;
  category: string;
  priceZar: number;
  quantity: number;
  checked: boolean;
  recipeSource?: string;
  note?: string;
}

export interface SyncData {
  code: string;
  items: SyncItem[];
  budget: number;
  currency: string;
  householdSize: number;
  lastUpdated: number;
  deviceAgent?: string;
}

const MAX_ITEMS = 300;
const CODE_PATTERN = /^[A-Z0-9-]{4,24}$/;
// No I, O, 0 or 1: codes are read aloud and typed across the room.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function num(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * Keeps only the fields the app uses, with sane sizes. A list is stored for
 * months now, so it must not become a place to park arbitrary data.
 */
function cleanItems(raw: unknown): SyncItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_ITEMS).flatMap((item: any): SyncItem[] => {
    const name = text(item?.name, 120);
    if (!name) return [];
    const clean: SyncItem = {
      id: text(item?.id, 64) || `item-${randomInt(1e9)}`,
      name,
      category: text(item?.category, 40) || 'other',
      priceZar: Math.round(num(item?.priceZar, 0, 100_000, 0) * 100) / 100,
      quantity: Math.round(num(item?.quantity, 0, 999, 1)),
      checked: item?.checked === true,
    };
    const recipeSource = text(item?.recipeSource, 120);
    const note = text(item?.note, 300);
    if (recipeSource) clean.recipeSource = recipeSource;
    if (note) clean.note = note;
    return [clean];
  });
}

/**
 * The cross-device shopping list, stored in SQLite (database/sync-db.ts) so it
 * survives restarts. The web client still keeps its own copy in localStorage,
 * so it keeps working offline in a shop with no signal.
 */
@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

  onModuleInit() {
    const removed = pruneRooms();
    if (removed) this.logger.log(`Removed ${removed} grocery list(s) idle for over 90 days.`);
    // Daily thereafter; unref so it never keeps the process alive on shutdown.
    setInterval(() => pruneRooms(), 24 * 60 * 60 * 1000).unref();
  }

  /** Codes are case-insensitive so a code read off a screen cannot miss. */
  normalise(code: string): string {
    const key = String(code || '').toUpperCase().trim();
    if (!CODE_PATTERN.test(key)) {
      throw new BadRequestException('That list code does not look right.');
    }
    return key;
  }

  get(code: string): SyncData {
    const room = loadRoom<SyncData>(this.normalise(code));
    if (!room) {
      throw new NotFoundException('Sync code not found');
    }
    return room;
  }

  /** Creates the room on first write, so a client never has to call create. */
  upsert(code: string, body: Partial<SyncData>, deviceAgent?: string): SyncData {
    const key = this.normalise(code);
    const current = loadRoom<SyncData>(key) || this.blank(key);

    const updated: SyncData = {
      code: key,
      items: Array.isArray(body?.items) ? cleanItems(body.items) : current.items,
      budget: body?.budget !== undefined ? num(body.budget, 0, 1_000_000, current.budget) : current.budget,
      currency: text(body?.currency, 8).toUpperCase() || current.currency,
      householdSize:
        body?.householdSize !== undefined
          ? Math.round(num(body.householdSize, 1, 50, current.householdSize))
          : current.householdSize,
      lastUpdated: Date.now(),
      deviceAgent: text(deviceAgent, 40) || 'Unknown device',
    };

    saveRoom(key, updated);
    return updated;
  }

  /**
   * Makes a new list. With a code that already exists, returns that list
   * unchanged - "create" must never wipe somebody's shopping.
   */
  create(customCode?: string, initialData?: Partial<SyncData>): SyncData {
    let code = customCode ? this.normalise(customCode) : '';
    if (code) {
      const existing = loadRoom<SyncData>(code);
      if (existing) return existing;
    } else {
      do {
        code = `CART-${Array.from({ length: 8 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('')}`;
      } while (loadRoom(code));
    }

    const room: SyncData = {
      ...this.blank(code),
      items: cleanItems(initialData?.items),
      budget: num(initialData?.budget, 0, 1_000_000, 500),
      currency: text(initialData?.currency, 8).toUpperCase() || 'ZAR',
      householdSize: Math.round(num(initialData?.householdSize, 1, 50, 2)),
    };
    saveRoom(code, room);
    return room;
  }

  private blank(code: string): SyncData {
    return { code, items: [], budget: 500, currency: 'ZAR', householdSize: 2, lastUpdated: Date.now() };
  }
}
