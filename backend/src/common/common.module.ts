import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';
import { AuthGuard } from './auth.guard';
import { BackupService } from './backup.service';
import { HealthController } from './health.controller';

/**
 * Global so the admin list is constructed once and shared. Reading the
 * environment in several places risks two modules disagreeing about who is a
 * moderator after a config change.
 *
 * AuthGuard is registered as an app-wide guard: every route needs a signed-in
 * session unless it is marked @Public().
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [AdminService, AdminGuard, BackupService, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [AdminService, AdminGuard],
})
export class CommonModule {}
