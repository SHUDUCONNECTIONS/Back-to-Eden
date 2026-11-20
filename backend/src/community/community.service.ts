import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import * as db from '../database/community-db';
import type { CommunityPost, CommunityComment, ReactionKind } from '../database/community-db';

export interface FeedPage {
  posts: CommunityPost[];
  total: number;
  hasMore: boolean;
}

/**
 * The recipe feed, reactions, comments, reports and moderation.
 *
 * Everything the controllers need goes through here rather than reaching into
 * the SQLite module directly, so replacing SQLite later is a change to this
 * file and not to the HTTP layer.
 */
@Injectable()
export class CommunityService {
  private readonly logger = new Logger(CommunityService.name);

  getFeed(
    viewerKey: string,
    sort: 'recent' | 'popular',
    limit: number,
    offset: number,
  ): FeedPage {
    const posts = db.listPosts(viewerKey, sort, limit, offset);
    // Counted with the same visibility rule as the feed query. If these two
    // disagree the infinite scroll never stops asking for a page that is not
    // there.
    const total = db.postCount(viewerKey);
    return { posts, total, hasMore: offset + posts.length < total };
  }

  createPost(input: db.CreatePostInput): string {
    try {
      return db.createPost(input);
    } catch (err: any) {
      // validatePost throws plain Errors for bad input; anything else is ours.
      if (err?.name === 'Error' && typeof err.message === 'string') {
        throw new BadRequestException(err.message);
      }
      this.logger.error(`Post create failed: ${err?.message || err}`);
      throw err;
    }
  }

  deleteOwnPost(postId: string, viewerKey: string): void {
    if (!db.deletePost(postId, viewerKey)) {
      throw new ForbiddenException('That post is not yours to delete.');
    }
  }

  toggleReaction(postId: string, viewerKey: string, kind: ReactionKind): boolean {
    return db.toggleReaction(postId, viewerKey, kind);
  }

  listComments(postId: string, viewerKey: string): CommunityComment[] {
    return db.listComments(postId, viewerKey);
  }

  addComment(
    postId: string,
    viewerKey: string,
    viewerName: string,
    body: string,
  ): CommunityComment[] {
    db.addComment(postId, viewerKey, viewerName, body);
    return db.listComments(postId, viewerKey);
  }

  deleteOwnComment(commentId: string, viewerKey: string): void {
    if (!db.deleteComment(commentId, viewerKey)) {
      throw new ForbiddenException('That comment is not yours to delete.');
    }
  }

  report(
    targetType: 'post' | 'comment',
    targetId: string,
    reporterKey: string,
    reason: string,
  ): void {
    db.reportContent(targetType, targetId, reporterKey, reason);
  }

  // --- Moderation ----------------------------------------------------------

  pendingCount(): number {
    return db.pendingCount();
  }

  openReportCount(): number {
    return db.openReportCount();
  }

  listPending(viewerKey: string): CommunityPost[] {
    return db.listPendingPosts(viewerKey);
  }

  setStatus(postId: string, status: db.PostStatus, reviewerKey: string): void {
    if (!db.setPostStatus(postId, status, reviewerKey)) {
      throw new NotFoundException('That post is no longer there.');
    }
  }

  removePost(postId: string): void {
    if (!db.removePostAsAdmin(postId)) {
      throw new NotFoundException('That post is no longer there.');
    }
  }

  removeComment(commentId: string): void {
    if (!db.removeCommentAsAdmin(commentId)) {
      throw new NotFoundException('That comment is no longer there.');
    }
  }

  listOpenReports(): db.ReportRow[] {
    return db.listOpenReports();
  }

  resolveReport(reportId: string): void {
    if (!db.resolveReport(reportId)) {
      throw new NotFoundException('That report is already closed.');
    }
  }
}
