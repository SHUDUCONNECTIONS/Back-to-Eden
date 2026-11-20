import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './auth.guard';
import { postCount } from '../database/community-db';

/**
 * GET /api/health - for the hosting platform's health check. Touches the
 * database so "up" means "can actually serve", not just "process running".
 */
@Public()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    try {
      postCount('health-check');
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException({ ok: false });
    }
  }
}
