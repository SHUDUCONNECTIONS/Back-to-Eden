import { Body, Controller, Get, Headers, HttpCode, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SyncService } from './sync.service';
import { Public } from '../common/auth.guard';
import { AttemptLimiter, clientIp, tooManyAttempts } from '../common/attempt-limiter';

/**
 * Looking up codes that do not exist is how someone would hunt for other
 * people's lists, so misses are limited per IP. A real user misses rarely (a
 * typo, or a brand-new code before its first save), so the cap is generous.
 */
const misses = new AttemptLimiter(60, 15 * 60 * 1000);

/**
 * Routes under /api/sync. Public on purpose: the list is shared by its code,
 * including with a household member who has no account.
 */
@Public()
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /**
   * 'create' is a literal path, so it has to be declared before the ':code'
   * parameter route or Nest would match it as a room called "create".
   */
  @Post('create')
  @HttpCode(200)
  create(@Body() body: any) {
    return this.sync.create(body?.customCode, body?.initialData);
  }

  /** 404 here is normal: the client takes it as "this room does not exist yet". */
  @Get(':code')
  get(@Param('code') code: string, @Req() req: Request) {
    const ip = clientIp(req);
    if (misses.blocked(ip)) throw tooManyAttempts();
    try {
      return this.sync.get(code);
    } catch (err) {
      if (err instanceof NotFoundException) misses.record(ip);
      throw err;
    }
  }

  @Post(':code')
  @HttpCode(200)
  push(
    @Param('code') code: string,
    @Body() body: any,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.sync.upsert(code, body, userAgent);
  }
}
