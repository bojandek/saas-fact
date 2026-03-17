# Social Media Integration Block

A powerful, production-ready block for integrating social media platforms into your SaaS application. Handles OAuth authentication and post scheduling across multiple platforms.

## Features

- **Multi-Platform Support**: Twitter, LinkedIn, Instagram, Facebook
- **OAuth Authentication**: Secure OAuth 2.0 integration
- **Post Scheduling**: Schedule posts for future publication
- **Analytics Ready**: Track engagement metrics
- **RLS Secured**: Row-level security for multi-tenant isolation

## Installation

```bash
npm install @saas-factory/social-media-integration
```

## Usage

```typescript
import { SocialMediaIntegration } from '@saas-factory/social-media-integration';

const socialMedia = new SocialMediaIntegration({
  tenantId: 'your-tenant-id',
  platforms: ['twitter', 'linkedin']
});

// Schedule a post
await socialMedia.schedulePost({
  content: 'Your post content',
  platforms: ['twitter', 'linkedin'],
  scheduledFor: new Date('2024-12-31T10:00:00Z')
});
```

## Database Schema

This block requires the following Prisma models:

```prisma
model SocialMediaAccount {
  id String @id @default(cuid())
  tenantId String
  platform String
  accountId String
  accessToken String
  refreshToken String?
  expiresAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([tenantId, platform, accountId])
}

model ScheduledPost {
  id String @id @default(cuid())
  tenantId String
  content String
  platforms String[]
  scheduledFor DateTime
  publishedAt DateTime?
  status String @default("pending")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Best Practices

- Always validate platform credentials before storing
- Implement rate limiting for API calls
- Use environment variables for sensitive data
- Regularly refresh OAuth tokens
- Monitor API quotas per platform

## License

MIT
