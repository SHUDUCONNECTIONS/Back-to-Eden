import { Module } from '@nestjs/common';
import { AiController, TranslateController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController, TranslateController],
  providers: [AiService],
})
export class AiModule {}
