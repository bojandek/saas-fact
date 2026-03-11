# Security Patterns for SaaS

## OWASP Top 10 Mitigation

### 1. Injection Attacks
**Mitigation:**
```typescript
// ✓ GOOD: Parameterized queries
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput) // Safe: parameter binding

// ✗ BAD: String concatenation
const result = `SELECT * FROM users WHERE email = '${userInput}'`
```

### 2. Broken Authentication
**Mitigation:**
```typescript
// Use verified auth providers
import { supabaseAuth } from '@supabase/auth-helpers'

// Enable MFA with TOTP
await supabaseAuth.mfa.enroll({
  issuer: 'SaaS Factory',
  authenticatorType: 'totp'
})

// Session security
- httpOnly cookies
- SameSite=Strict
- Secure flag enabled
- 15-min inactivity timeout
```

### 3. Sensitive Data Exposure
**Mitigation:**
```typescript
// Encrypt at rest
const encrypted = await encrypt(sensitiveData, encryptionKey)

// Encrypt in transit (HTTPS only)
// Never log sensitive data
console.log({ userId, action }) // OK
console.log({ password, token }) // NEVER
```

### 4. Cross-Site Scripting (XSS)
**Mitigation:**
```typescript
// React escapes by default
<div>{userInput}</div> // Safe

// Use DOMPurify for HTML content
import DOMPurify from 'dompurify'
const clean = DOMPurify.sanitize(userHtml)
```

### 5. Broken Access Control
**Mitigation:**
```typescript
// RLS enforcement
CREATE POLICY auth_check ON documents
USING (tenant_id = current_user_tenant_id());

// Never trust client permissions
if (!hasAccess(user, resource)) {
  throw new UnauthorizedError()
}
```

### 6. Cross-Site Request Forgery (CSRF)
**Mitigation:**
```typescript
// Next.js with CSRF middleware
import csrf from 'csrf'
const token = csrf()

// Include in forms
<input type="hidden" name="_csrf" value={token} />
```

### 7. Using Components with Known Vulnerabilities
**Mitigation:**
```bash
# Regular audits
pnpm audit
snyk test

# Automated updates
dependabot

# CI/CD checks
pnpm run build && pnpm run test
```

### 8. Insufficient Logging & Monitoring
**Mitigation:**
```typescript
// Log security events
logger.warn({
  event: 'failed_login_attempt',
  userId,
  ipAddress,
  timestamp: new Date()
})

// Alert on anomalies
if (failedAttempts > 5) {
  alertSecurityTeam('Brute force attempt detected')
}
```

### 9. Broken Function Level Access Control
**Mitigation:**
```typescript
// Middleware checks roles
export async function withRole(role: string) {
  return async (req, res, next) => {
    const user = await getUser(req)
    if (user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
```

### 10. Broken Object Level Authorization
**Mitigation:**
```typescript
// Verify object ownership
async function getDocument(docId, userId) {
  const doc = await db.documents.findById(docId)
  if (doc.owner_id !== userId) {
    throw new ForbiddenError()
  }
  return doc
}
```

## API Security

```typescript
// Rate limiting
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // 100 requests
})

// API versioning
GET /api/v1/users
GET /api/v2/users

// Content Security Policy
response.setHeader(
  'Content-Security-Policy',
  "default-src 'self'; script-src 'self' cdn.example.com"
)
```

## Environment & Secrets

```bash
# .env variables (never committed)
STRIPE_SECRET_KEY=sk_live_xxx
DATABASE_URL=postgresql://user:pass@host/db
ANTHROPIC_API_KEY=sk-xxx

# GitHub Secrets for CI/CD
- Name: PROD_DB_URL
- Value: (production database)
```

## Compliance

- **GDPR**: Right to be forgotten, data portability
- **CCPA**: Opt-out, data sale disclosure
- **SOC 2**: Access logs, encryption, incident response
- **HIPAA**: Data protection for health apps
