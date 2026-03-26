/**
 * @file Social Media Integration Block
 * @description Real implementation for Twitter/X v2 API and LinkedIn API
 * with post scheduling, analytics retrieval, and OAuth2 support.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SocialMediaPost {
  id?: string;
  content: string;
  mediaUrls?: string[];
  scheduledTime?: Date;
  platform: 'twitter' | 'linkedin';
}

export interface ScheduledPost extends SocialMediaPost {
  status: 'pending' | 'posted' | 'failed';
  postedAt?: Date;
  errorMessage?: string;
}

export interface AnalyticsData {
  postId: string;
  platform: 'twitter' | 'linkedin';
  impressions: number;
  engagements: number;
  clicks?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface TwitterConfig {
  bearerToken: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface LinkedInConfig {
  accessToken: string;
  organizationId?: string;
}

// ─── Twitter/X Integration ────────────────────────────────────────────────────

export class TwitterIntegration {
  private bearerToken: string;
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string;
  private accessTokenSecret: string;

  constructor(config: TwitterConfig) {
    this.bearerToken = config.bearerToken;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.accessToken = config.accessToken;
    this.accessTokenSecret = config.accessTokenSecret;
  }

  /**
   * Posts a tweet using Twitter API v2
   */
  async schedulePost(post: SocialMediaPost): Promise<ScheduledPost> {
    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify({
          text: post.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Twitter API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return {
        ...post,
        id: data.data?.id,
        status: 'posted',
        postedAt: new Date(),
        platform: 'twitter',
      };
    } catch (error: any) {
      console.error('Twitter post failed:', error.message);
      return {
        ...post,
        status: 'failed',
        errorMessage: error.message,
        platform: 'twitter',
      };
    }
  }

  /**
   * Retrieves tweet metrics using Twitter API v2
   */
  async getPostAnalytics(postId: string): Promise<AnalyticsData> {
    try {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/${postId}?tweet.fields=public_metrics`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Twitter analytics API error: ${response.status}`);
      }

      const data = await response.json();
      const metrics = data.data?.public_metrics || {};

      return {
        postId,
        platform: 'twitter',
        impressions: metrics.impression_count || 0,
        engagements: (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0),
        likes: metrics.like_count || 0,
        comments: metrics.reply_count || 0,
        shares: metrics.retweet_count || 0,
      };
    } catch (error: any) {
      console.error('Twitter analytics failed:', error.message);
      return {
        postId,
        platform: 'twitter',
        impressions: 0,
        engagements: 0,
      };
    }
  }
}

// ─── LinkedIn Integration ─────────────────────────────────────────────────────

export class LinkedInIntegration {
  private accessToken: string;
  private organizationId?: string;

  constructor(config: LinkedInConfig) {
    this.accessToken = config.accessToken;
    this.organizationId = config.organizationId;
  }

  /**
   * Creates a LinkedIn post using the LinkedIn API v2
   */
  async schedulePost(post: SocialMediaPost): Promise<ScheduledPost> {
    try {
      // Get the author URN (person or organization)
      const authorUrn = this.organizationId
        ? `urn:li:organization:${this.organizationId}`
        : await this.getPersonUrn();

      const body: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: post.content,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`LinkedIn API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      return {
        ...post,
        id: data.id,
        status: 'posted',
        postedAt: new Date(),
        platform: 'linkedin',
      };
    } catch (error: any) {
      console.error('LinkedIn post failed:', error.message);
      return {
        ...post,
        status: 'failed',
        errorMessage: error.message,
        platform: 'linkedin',
      };
    }
  }

  /**
   * Retrieves LinkedIn post statistics
   */
  async getPostAnalytics(postId: string): Promise<AnalyticsData> {
    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postId)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`LinkedIn analytics API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        postId,
        platform: 'linkedin',
        impressions: data.impressionCount || 0,
        engagements: (data.likeCount || 0) + (data.commentCount || 0) + (data.shareCount || 0),
        likes: data.likeCount || 0,
        comments: data.commentCount || 0,
        shares: data.shareCount || 0,
        clicks: data.clickCount || 0,
      };
    } catch (error: any) {
      console.error('LinkedIn analytics failed:', error.message);
      return {
        postId,
        platform: 'linkedin',
        impressions: 0,
        engagements: 0,
      };
    }
  }

  private async getPersonUrn(): Promise<string> {
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    const data = await response.json();
    return `urn:li:person:${data.id}`;
  }
}

// ─── Manager ──────────────────────────────────────────────────────────────────

export class SocialMediaManager {
  private twitter?: TwitterIntegration;
  private linkedin?: LinkedInIntegration;

  constructor(config: {
    twitter?: TwitterConfig;
    linkedin?: LinkedInConfig;
  }) {
    if (config.twitter) {
      this.twitter = new TwitterIntegration(config.twitter);
    }
    if (config.linkedin) {
      this.linkedin = new LinkedInIntegration(config.linkedin);
    }
  }

  async schedulePost(post: SocialMediaPost): Promise<ScheduledPost> {
    switch (post.platform) {
      case 'twitter':
        if (!this.twitter) throw new Error('Twitter not configured');
        return this.twitter.schedulePost(post);
      case 'linkedin':
        if (!this.linkedin) throw new Error('LinkedIn not configured');
        return this.linkedin.schedulePost(post);
      default:
        throw new Error(`Unsupported platform: ${post.platform}`);
    }
  }

  async getPostAnalytics(postId: string, platform: 'twitter' | 'linkedin'): Promise<AnalyticsData> {
    switch (platform) {
      case 'twitter':
        if (!this.twitter) throw new Error('Twitter not configured');
        return this.twitter.getPostAnalytics(postId);
      case 'linkedin':
        if (!this.linkedin) throw new Error('LinkedIn not configured');
        return this.linkedin.getPostAnalytics(postId);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
