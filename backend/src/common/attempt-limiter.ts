import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Counts events per key (an email, an IP) inside a sliding window. In memory:
 * it resets on restart, which is fine for slowing down guessing and needs no
 * extra infrastructure.
 */
export class AttemptLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly max: number, private readonly windowMs: number) {}

  private recent(key: string): number[] {
    const cutoff = Date.now() - this.windowMs;
    const list = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  blocked(...keys: string[]): boolean {
    return keys.some((k) => this.recent(k).length >= this.max);
  }

  record(...keys: string[]): void {
    for (const k of keys) this.hits.set(k, [...this.recent(k), Date.now()]);
  }

  clear(key: string): void {
    this.hits.delete(key);
  }
}

export function tooManyAttempts(): HttpException {
  return new HttpException(
    'Too many attempts. Please wait a few minutes and try again.',
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

/** The visitor's IP. Correct behind proxies because main.ts sets 'trust proxy'. */
export function clientIp(req: Request): string {
  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}
