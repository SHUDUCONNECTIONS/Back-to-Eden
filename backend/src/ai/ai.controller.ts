import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AiService, RecipeRequest, TranslateRequest } from './ai.service';
import { Public } from '../common/auth.guard';
import { AttemptLimiter, clientIp, tooManyAttempts } from '../common/attempt-limiter';
import { Viewer, ViewerInfo } from '../common/viewer.decorator';

const HOUR = 60 * 60 * 1000;
/** Recipe ideas per signed-in person. */
const suggestions = new AttemptLimiter(20, HOUR);
/** Translation batches that need the model, per visitor IP. */
const translations = new AttemptLimiter(60, HOUR);

/** POST /api/ai/recipe-suggest - signed-in only (it costs money per call). */
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('recipe-suggest')
  @HttpCode(200)
  suggest(@Viewer() viewer: ViewerInfo, @Body() body: RecipeRequest) {
    const key = `user:${viewer.key}`;
    if (suggestions.blocked(key)) throw tooManyAttempts();
    suggestions.record(key);
    return this.ai.suggestRecipe(body || {});
  }
}

/**
 * Translation sits at /api/translate rather than /api/ai/translate.
 *
 * That is where the web client has always called it, and the point of this
 * migration was that no client had to change. An empty @Controller() puts the
 * route directly under the global /api prefix. Public, because the sign-in
 * page is translated too; stored translations are free, and only batches that
 * need the model count towards the per-IP limit.
 */
@Public()
@Controller()
export class TranslateController {
  constructor(private readonly ai: AiService) {}

  @Post('translate')
  @HttpCode(200)
  translate(@Req() req: Request, @Body() body: TranslateRequest) {
    const ip = clientIp(req);
    return this.ai.translate(body || {}, () => {
      if (translations.blocked(ip)) return false;
      translations.record(ip);
      return true;
    });
  }
}
