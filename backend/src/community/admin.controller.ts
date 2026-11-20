import { Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { AdminGuard } from '../common/admin.guard';
import { Viewer, ViewerInfo } from '../common/viewer.decorator';

/**
 * Moderation routes, all under /api/community/admin.
 *
 * The guard sits on the controller rather than on each method, so a route
 * added here is protected unless someone deliberately removes it - the safer
 * direction for a mistake to fall in.
 *
 * Read the note on AdminService before trusting this: the identity it matches
 * is still supplied by the client.
 */
@Controller('community/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly community: CommunityService) {}

  /** The review queue, oldest first. */
  @Get('pending')
  pending(@Viewer() viewer: ViewerInfo) {
    return { posts: this.community.listPending(viewer.key) };
  }

  @Post('posts/:id/approve')
  @HttpCode(200)
  approve(@Viewer() viewer: ViewerInfo, @Param('id') id: string) {
    this.community.setStatus(id, 'approved', viewer.key);
    return { ok: true, status: 'approved' };
  }

  /**
   * Rejection is reversible on purpose: the post stays in the table with a
   * status, so a mistake can be undone by approving it afterwards.
   */
  @Post('posts/:id/reject')
  @HttpCode(200)
  reject(@Viewer() viewer: ViewerInfo, @Param('id') id: string) {
    this.community.setStatus(id, 'rejected', viewer.key);
    return { ok: true, status: 'rejected' };
  }

  /** Removes a post whoever wrote it. */
  @Delete('posts/:id')
  removePost(@Param('id') id: string) {
    this.community.removePost(id);
    return { ok: true };
  }

  @Get('reports')
  reports() {
    return { reports: this.community.listOpenReports() };
  }

  /** Dismisses a report and leaves the reported content alone. */
  @Post('reports/:id/resolve')
  @HttpCode(200)
  resolve(@Param('id') id: string) {
    this.community.resolveReport(id);
    return { ok: true };
  }

  /** Removes a comment whoever wrote it. */
  @Delete('comments/:id')
  removeComment(@Param('id') id: string) {
    this.community.removeComment(id);
    return { ok: true };
  }
}
