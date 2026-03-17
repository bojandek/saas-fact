/**
 * Social Media Integration Block
 * Handles OAuth connections and scheduling for social media platforms
 * Based on Postiz-app architecture
 */

import { PrismaClient } from '@prisma/client';

interface SocialMediaIntegration {
  id: string;
  organizationId: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'tiktok' | 'youtube';
  accessToken: string;
  refreshToken?: string;
  tokenExpiration?: Date;
  accountHandle: string;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ScheduledPost {
  id: string;
  organizationId: string;
  integrationId: string;
  content: string;
  mediaIds: string[];
  scheduledFor: Date;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
  postedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SocialMediaIntegrationBlock {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create or update a social media integration
   */
  async upsertIntegration(
    organizationId: string,
    platform: string,
    accessToken: string,
    accountHandle: string,
    accountId: string,
    refreshToken?: string,
    tokenExpiration?: Date
  ): Promise<SocialMediaIntegration> {
    return this.prisma.socialMediaIntegration.upsert({
      where: {
        organizationId_platform_accountId: {
          organizationId,
          platform: platform as any,
          accountId,
        },
      },
      update: {
        accessToken,
        refreshToken,
        tokenExpiration,
        updatedAt: new Date(),
      },
      create: {
        organizationId,
        platform: platform as any,
        accessToken,
        refreshToken,
        tokenExpiration,
        accountHandle,
        accountId,
      },
    });
  }

  /**
   * Schedule a post to be published
   */
  async schedulePost(
    organizationId: string,
    integrationId: string,
    content: string,
    mediaIds: string[],
    scheduledFor: Date
  ): Promise<ScheduledPost> {
    return this.prisma.scheduledPost.create({
      data: {
        organizationId,
        integrationId,
        content,
        mediaIds,
        scheduledFor,
        status: 'scheduled',
      },
    });
  }

  /**
   * Get all integrations for an organization
   */
  async getIntegrations(organizationId: string): Promise<SocialMediaIntegration[]> {
    return this.prisma.socialMediaIntegration.findMany({
      where: { organizationId },
    });
  }

  /**
   * Get scheduled posts for an organization
   */
  async getScheduledPosts(organizationId: string): Promise<ScheduledPost[]> {
    return this.prisma.scheduledPost.findMany({
      where: { organizationId, status: 'scheduled' },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  /**
   * Mark a post as posted
   */
  async markAsPosted(postId: string, externalPostId: string): Promise<ScheduledPost> {
    return this.prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: 'posted',
        postedAt: new Date(),
      },
    });
  }

  /**
   * Mark a post as failed
   */
  async markAsFailed(postId: string, errorMessage: string): Promise<ScheduledPost> {
    return this.prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    await this.prisma.socialMediaIntegration.delete({
      where: { id: integrationId },
    });
  }
}

export type { SocialMediaIntegration, ScheduledPost };
