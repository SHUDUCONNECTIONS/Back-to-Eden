import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { AdminService } from '../common/admin.service';
import { Viewer, ViewerInfo } from '../common/viewer.decorator';
import type { ReactionKind } from '../database/community-db';
import { AttemptLimiter, tooManyAttempts } from '../common/attempt-limiter';

/**
 * Per-person ceilings, generous for real use and low enough that a script
 * cannot flood the feed or the moderation queue. Admins are exempt.
 */
const HOUR = 60 * 60 * 1000;
const LIMITS = {
  post: new AttemptLimiter(10, HOUR),
  comment: new AttemptLimiter(60, HOUR),
  reaction: new AttemptLimiter(300, HOUR),
  report: new AttemptLimiter(20, HOUR),
};
import { Public } from '../common/auth.guard';

/** Routes under /api/community that any signed-in person may call. */
@Controller('community')
export class CommunityController {
  constructor(
    private readonly community: CommunityService,
    private readonly admins: AdminService,
  ) {}

  private limit(kind: keyof typeof LIMITS, viewer: ViewerInfo): void {
    if (this.admins.isAdmin(viewer)) return;
    const key = `user:${viewer.key}`;
    if (LIMITS[kind].blocked(key)) throw tooManyAttempts();
    LIMITS[kind].record(key);
  }

  /**
   * What the client needs to decide whether to offer the admin page at all.
   * Safe for anyone to call: it only describes the caller.
   */
  @Public()
  @Get('me')
  me(@Viewer() viewer: ViewerInfo) {
    const isAdmin = this.admins.isAdmin(viewer);
    return {
      isAdmin,
      // The size of the queue is only meaningful to a moderator, and telling
      // everyone how much is waiting serves no purpose.
      pendingCount: isAdmin ? this.community.pendingCount() : 0,
      reportCount: isAdmin ? this.community.openReportCount() : 0,
    };
  }

  @Public()
  @Get('posts')
  feed(
    @Viewer() viewer: ViewerInfo,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.community.getFeed(
      viewer.key,
      sort === 'popular' ? 'popular' : 'recent',
      Number(limit) || 20,
      Number(offset) || 0,
    );
  }

  @Post('posts')
  @HttpCode(201)
  create(@Viewer() viewer: ViewerInfo, @Body() body: any) {
    this.limit('post', viewer);
    const id = this.community.createPost({
      authorKey: viewer.key,
      authorName: viewer.name,
      title: body?.title,
      description: body?.description,
      servings: body?.servings,
      prepTime: body?.prepTime,
      cookTime: body?.cookTime,
      ingredients: Array.isArray(body?.ingredients) ? body.ingredients : [],
      steps: Array.isArray(body?.steps) ? body.steps : [],
      imageDataUrl: body?.imageDataUrl,
      // Admins publish straight away; everyone else waits for review.
      autoApprove: this.admins.isAdmin(viewer),
    });
    // Express answered with the saved post alongside the id, so the composer
    // could show it without re-fetching. Kept identical.
    const [post] = this.community.getFeed(viewer.key, 'recent', 1, 0).posts;
    return { id, post };
  }

  @Delete('posts/:id')
  remove(@Viewer() viewer: ViewerInfo, @Param('id') id: string) {
    this.community.deleteOwnPost(id, viewer.key);
    return { ok: true };
  }

  @Post('posts/:id/reactions')
  @HttpCode(200)
  react(
    @Viewer() viewer: ViewerInfo,
    @Param('id') id: string,
    @Body('kind') kind: ReactionKind,
  ) {
    this.limit('reaction', viewer);
    const active = this.community.toggleReaction(id, viewer.key, kind);
    return { ok: true, kind, active };
  }

  @Public()
  @Get('posts/:id/comments')
  comments(@Viewer() viewer: ViewerInfo, @Param('id') id: string) {
    return { comments: this.community.listComments(id, viewer.key) };
  }

  @Post('posts/:id/comments')
  @HttpCode(201)
  addComment(
    @Viewer() viewer: ViewerInfo,
    @Param('id') id: string,
    @Body('body') body: string,
  ) {
    this.limit('comment', viewer);
    return {
      comments: this.community.addComment(id, viewer.key, viewer.name, body),
    };
  }

  @Delete('comments/:id')
  removeComment(@Viewer() viewer: ViewerInfo, @Param('id') id: string) {
    this.community.deleteOwnComment(id, viewer.key);
    return { ok: true };
  }

  @Post('report')
  @HttpCode(201)
  report(@Viewer() viewer: ViewerInfo, @Body() body: any) {
    this.limit('report', viewer);
    this.community.report(
      body?.targetType === 'comment' ? 'comment' : 'post',
      String(body?.targetId || ''),
      viewer.key,
      String(body?.reason || ''),
    );
    return { ok: true };
  }
}
