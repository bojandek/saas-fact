# Advanced Multi-Tenant Block

A comprehensive block for managing complex multi-tenant architectures with role-based access control (RBAC), organization hierarchies, and team management.

## Features

- **Role-Based Access Control (RBAC)**: Owner, Admin, User, Viewer roles
- **Organization Hierarchy**: Support for nested organizations and departments
- **Team Management**: Invite, manage, and remove team members
- **Audit Logging**: Track all user actions for compliance
- **Row-Level Security (RLS)**: Automatic data isolation between tenants
- **Permission Management**: Granular control over user permissions

## Installation

```bash
npm install @saas-factory/advanced-multi-tenant
```

## Usage

```typescript
import { MultiTenantManager } from '@saas-factory/advanced-multi-tenant';

const tenantManager = new MultiTenantManager();

// Create a new organization
const org = await tenantManager.createOrganization({
  name: 'Acme Corp',
  slug: 'acme-corp',
  ownerUserId: 'user-123'
});

// Add a team member
await tenantManager.addTeamMember({
  organizationId: org.id,
  userId: 'user-456',
  role: 'admin'
});

// Check permissions
const hasAccess = await tenantManager.checkPermission({
  userId: 'user-456',
  organizationId: org.id,
  action: 'edit_settings'
});
```

## Database Schema

This block requires the following Prisma models:

```prisma
model Organization {
  id String @id @default(cuid())
  name String
  slug String @unique
  ownerId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  members OrganizationMember[]
  roles OrganizationRole[]
}

model OrganizationMember {
  id String @id @default(cuid())
  organizationId String
  userId String
  role String
  joinedAt DateTime @default(now())
  
  @@unique([organizationId, userId])
}

model OrganizationRole {
  id String @id @default(cuid())
  organizationId String
  name String
  permissions String[]
  createdAt DateTime @default(now())
  
  @@unique([organizationId, name])
}
```

## Best Practices

- Always validate user permissions before allowing actions
- Use RLS policies for automatic data filtering
- Implement audit logging for compliance
- Regularly review and update role definitions
- Test permission boundaries thoroughly

## License

MIT
