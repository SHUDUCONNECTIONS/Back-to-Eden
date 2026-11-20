import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { FastingService } from './fasting.service';
import { Viewer, ViewerInfo } from '../common/viewer.decorator';

/**
 * Routes under /api/fasting.
 *
 * Fasting history is health data. Every route here requires a signed-in
 * session (see common/auth.guard.ts), and rows are scoped to that account.
 */
@Controller('fasting')
export class FastingController {
  constructor(private readonly fasting: FastingService) {}

  /** Everything the Fasting Journey view needs, in one call. */
  @Get('state')
  state(@Viewer() viewer: ViewerInfo) {
    return this.fasting.getState(viewer.key);
  }

  /**
   * `startedAt` lets someone log the fast from their last real meal rather
   * than from the moment they opened the app. The database clamps it to the
   * last 48 hours, so a wrong device clock cannot invent a month-long fast.
   */
  @Post('start')
  @HttpCode(200)
  start(@Viewer() viewer: ViewerInfo, @Body() body: any) {
    const session = this.fasting.start(
      viewer.key,
      body?.scheduleId,
      body?.targetHours,
      body?.startedAt,
    );
    return { session };
  }

  @Post('stop')
  @HttpCode(200)
  stop(@Viewer() viewer: ViewerInfo, @Body('note') note?: string) {
    return { session: this.fasting.stop(viewer.key, note) };
  }

  /** Discards a fast started by mistake, leaving no record. */
  @Delete('active')
  discard(@Viewer() viewer: ViewerInfo) {
    this.fasting.discard(viewer.key);
    return { ok: true };
  }

  @Delete('sessions/:id')
  removeSession(@Viewer() viewer: ViewerInfo, @Param('id') id: string) {
    this.fasting.deleteSession(viewer.key, id);
    return { ok: true };
  }
}
