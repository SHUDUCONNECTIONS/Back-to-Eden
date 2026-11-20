import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { CommunityModule } from './community/community.module';
import { FastingModule } from './fasting/fasting.module';
import { SyncModule } from './sync/sync.module';
import { AiModule } from './ai/ai.module';

/**
 * Root module.
 *
 * One module per bounded area, each owning its own controller and service:
 *
 *   community  the recipe feed, reactions, comments, reports, moderation
 *   fasting    the Fasting Journey timer and history
 *   sync       the cross-device shopping list (SQLite, shared by code)
 *   ai         Gemini recipe suggestions and machine translation
 *
 * The SQLite layer lives in src/database and is wrapped by the services rather
 * than reached into from controllers, so swapping SQLite for a real database
 * later touches the services only.
 */
@Module({
  imports: [CommonModule, AuthModule, CommunityModule, FastingModule, SyncModule, AiModule],
})
export class AppModule {}
