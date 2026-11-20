import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { AdminController } from './admin.controller';
import { CommunityService } from './community.service';

@Module({
  controllers: [CommunityController, AdminController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
