# Authentication & Authorization: Secure User Identity Management

## Authentication vs Authorization

```typescript
interface AuthVsAuthz {
  authentication: {
    definition: "Verifying WHO you are",
    question: "Are you who you claim to be?",
    methods: ["Password", "Biometric", "Physical key", "Email code"],
    example: "Let me check if you're Alice",
  },

  authorization: {
    definition: "Verifying WHAT you're allowed to do",
    question: "What can this user access?",
    elements: ["Roles", "Permissions", "Resource access"],
    example: "Alice is allowed to view reports, but not delete users",
  },

  both_needed: "Auth without authz: authenticated but uncontrolled",
  example: "User logs in (auth), but can access all files (no authz)",
}
```

---

## Authentication Methods

### Strategy 1: Username & Password

```typescript
interface BasicAuth {
  // Storing passwords
  registration: {
    bad: `
// NEVER DO THIS
user.password = plaintext;
await db.users.create(user);
    `,

    good: `
// Hash password with bcrypt
import bcrypt from 'bcrypt';

const password_hash = await bcrypt.hash(password, 10);
await db.users.create({
  email: email,
  password_hash: password_hash, // Store hash only
});
    `,
  },

  // Verifying password
  login: `
const user = await db.users.findOne({ email });

if (!user) {
  return { error: 'Invalid credentials' };
}

const isValid = await bcrypt.compare(password, user.password_hash);

if (!isValid) {
  return { error: 'Invalid credentials' };
}

// Create session
const sessionToken = generateToken();
await sessions.set(sessionToken, { userId: user.id });

return { success: true, token: sessionToken };
  `,

  issues: [
    "Passwords weak/reused",
    "Phishing (user types in fake site)",
    "Password database breach (hashes cracked)",
  ],
}
```

### Strategy 2: Multi-Factor Authentication (MFA)

```typescript
interface MFA {
  // Factor types
  factors: {
    something_you_know: "Password",
    something_you_have: "Phone (SMS/Authenticator app)",
    something_you_are: "Fingerprint, Face recognition",
  },

  // 2FA Flow
  flow: `
1. User enters email + password
2. Password verified ✓
3. System sends code to phone (SMS or app)
4. User enters code from phone
5. Code verified ✓ → Access granted

Attacker can't gain access with just password (lacks phone)
  `,

  implementation: `
export async function setupMFA(userId: string) {
  // Generate secret for authenticator app
  const secret = speakeasy.generateSecret({
    name: \`MyApp (\${user.email})\`,
    issuer: 'MyApp',
  });

  // Return QR code to user
  const qr = qrcode.toDataURL(secret.otpauth_url);

  // User scans QR with authenticator app
  // Stores secret locally
  
  // User enters backup codes
  const backupCodes = generateBackupCodes();
  
  return { qr, backupCodes };
}

export async function verifyMFA(userId: string, token: string) {
  const user = await db.users.findById(userId);
  
  // Verify TOTP token from authenticator app
  const verified = speakeasy.totp.verify({
    secret: user.mfa_secret,
    encoding: 'base32',
    token: token,
  });

  if (!verified) {
    return { success: false };
  }

  return { success: true };
}

export async function loginWithMFA(email: string, password: string) {
  const user = await db.users.findOne({ email });
  
  // Step 1: Verify password
  if (!bcrypt.compareSync(password, user.password_hash)) {
    return { error: 'Invalid credentials' };
  }

  if (!user.mfa_enabled) {
    // Create session directly
    return { success: true, token: createSession(user.id) };
  }

  // Step 2: User must provide MFA code
  // Return temporary token (valid for 5 min)
  const tempToken = createTempToken(user.id, '5m');
  return { success: false, requires_mfa: true, temp_token: tempToken };
}

app.post('/mfa/verify', async (req, res) => {
  const { temp_token, mfa_code } = req.body;

  // Decode temp token
  const userId = verifyTempToken(temp_token);

  // Verify MFA code
  const mfaValid = await verifyMFA(userId, mfa_code);

  if (!mfaValid) {
    return res.status(401).json({ error: 'Invalid MFA code' });
  }

  // Create real session
  const session_token = createSession(userId);
  
  res.json({ success: true, token: session_token });
});
  `,

  types: {
    sms: "Code sent via SMS (vulnerable, prone to SIM swap)",
    authenticator_app: "TOTP in Google Authenticator (recommended)",
    hardware_key: "YubiKey (most secure)",
    biomet: "Fingerprint/Face (iOS/Android)",
  },
}
```

### Strategy 3: OAuth 2.0 / Social Login

```typescript
interface OAuth2 {
  what: "Let user log in with Google/GitHub/etc account",
  
  flow: `
1. User clicks 'Login with Google'
2. Redirect to Google authorization page
3. User grants permission
4. Google redirects back with authorization code
5. App exchanges code for access token
6. App gets user info from Google
7. Create session in your app

User never types password into your app (types into Google)
  `,

  implementation: `
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://myapp.com/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      // Find or create user
      let user = await db.users.findOne({
        oauth_provider: 'google',
        oauth_id: profile.id,
      });

      if (!user) {
        // Create new user
        user = await db.users.create({
          email: profile.emails[0].value,
          name: profile.displayName,
          oauth_provider: 'google',
          oauth_id: profile.id,
        });
      }

      done(null, user);
    }
  )
);

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

app.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Create session
    req.session.userId = req.user.id;
    res.redirect('/dashboard');
  }
);
  `,

  advantages: [
    "User doesn't trust you with password",
    "Simpler login (if user already logged into Google)",
    "Google handles security",
  ],

  disadvantages: [
    "Dependent on Google/GitHub (what if down?)",
    "Privacy concerns (Google knows users logged in)",
  ],
}
```

### Strategy 4: JWT (JSON Web Token)

```typescript
interface JWT {
  what: "Token-based authentication (stateless)",
  
  structure: "Header.Payload.Signature",
  
  example: `
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.  // Header
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IndheW5lIiwiaWF0IjoxNTE2MjM5MDIyfQ. // Payload (user info)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  // Signature
  `,

  payload: `
{
  "sub": "user123",           // Subject (user ID)
  "email": "user@example.com",
  "role": "admin",
  "iat": 1516239022,          // Issued at (timestamp)
  "exp": 1516242622,          // Expires at (1 hour later)
}
  `,

  implementation: `
import jwt from 'jsonwebtoken';

// Create JWT after login
function createJWT(userId: string) {
  const payload = {
    sub: userId,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET);
  return token;
}

// Verify JWT on each request
export function verifyJWT(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// Middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const user = verifyJWT(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
});
  `,

  advantages: [
    "Stateless (no session DB needed)",
    "Can work across multiple servers",
    "Good for mobile apps/APIs",
  ],

  disadvantages: [
    "Can't revoke token early (except blacklist)",
    "Token size larger than session ID",
  ],
}
```

---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

```typescript
interface RBAC {
  // Define roles with permissions
  roles: {
    admin: {
      permissions: [
        "users:create",
        "users:read",
        "users:update",
        "users:delete",
        "settings:manage",
      ],
    },
    manager: {
      permissions: [
        "users:read",
        "users:update",
        "reports:read",
        "reports:create",
      ],
    },
    user: {
      permissions: [
        "users:read_self",
        "reports:read_own",
      ],
    },
  },

  // Check permissions
  middleware: `
export function requirePermission(permission: string) {
  return (req, res, next) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const role = roles[user.role];

    if (!role?.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

// Usage
app.delete('/users/:id', requirePermission('users:delete'), deleteUser);
  `,

  // Resource ownership check
  resource_ownership: `
export async function deleteUser(req, res) {
  const user = req.user;
  const userId = req.params.id;

  // 1. Check role permission (can ANY admin delete users?)
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Not admin' });
  }

  // 2. Check resource ownership (can THIS admin delete THIS user?)
  const target = await db.users.findById(userId);

  if (target.created_by !== user.id && user.role !== 'super_admin') {
    // Admin can only delete users they created
    return res.status(403).json({ error: 'Can only delete your own users' });
  }

  await db.users.delete({ id: userId });

  res.json({ success: true });
}
  `,
}
```

### Attribute-Based Access Control (ABAC)

```typescript
interface ABAC {
  what: "Fine-grained control based on multiple factors",
  
  factors: [
    "User role (admin, manager)",
    "Time (9am-5pm only)",
    "Location (internal network only)",
    "Device (company laptop only)",
    "Resource attributes (document classification)",
  ],

  example: `
// User can access report if:
// 1. Has 'reports:read' permission
// 2. AND report.department == user.department
// 3. AND report.classification != 'confidential' OR user.role == 'admin'
// 4. AND current_time between 9am-5pm

export async function canAccessReport(user: User, report: Report) {
  // Permission check
  if (!user.permissions.includes('reports:read')) {
    return false;
  }

  // Department check
  if (report.department !== user.department) {
    return false;
  }

  // Classification check
  if (report.classification === 'confidential' && user.role !== 'admin') {
    return false;
  }

  // Time check
  const hour = new Date().getHours();
  if (hour < 9 || hour > 17) {
    return false;
  }

  return true;
}
  `,
}
```

---

## Session Management

```typescript
interface SessionManagement {
  // Strategy 1: Server-side sessions (traditional)
  server_side: {
    what: "Session stored on server",
    storage: "Redis or database",
    flow: `
1. User logs in
2. Server creates session object
3. Server stores session in Redis
4. Server sends session ID in cookie
5. On next request, cookie sent automatically
6. Server looks up session in Redis
7. Session valid if found and not expired
    `,

    implementation: `
import session from 'express-session';
import RedisStore from 'connect-redis';

const redisClient = redis.createClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: true,           // HTTPS only
    httpOnly: true,         // JS can't access
    sameSite: 'strict',     // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// User logged in if session exists
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).redirect('/login');
  }

  res.json({ message: 'Welcome to dashboard' });
});
    `,

    advantages: ["Can revoke immediately", "Smaller cookie size"],
    disadvantages: ["Requires session storage", "Doesn't scale across servers easily"],
  },

  // Strategy 2: Client-side sessions (JWT)
  client_side: {
    what: "Session stored in JWT token (client)",
    flow: `
1. User logs in
2. Server creates JWT
3. Server sends JWT to client
4. Client stores JWT (localStorage or sesStorage)
5. On each request, client sends JWT in header
6. Server verifies JWT signature
7. No session DB needed
    `,

    advantages: ["Stateless", "Scales across servers"],
    disadvantages: ["Can't revoke immediately", "Larger token size"],
  },

  // Logout/Revocation
  revocation: `
// Server-side sessions: Easy (just delete from Redis)
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// JWT: Need blacklist for immediate revocation
const tokenBlacklist = new Set();

app.post('/logout', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  tokenBlacklist.add(token); // Add to blacklist

  res.json({ success: true });
});

// Middleware: Check blacklist
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  next();
});
  `,
}
```

---

## Common Authentication Pitfalls

```typescript
interface AuthPitfalls {
  // Pitfall 1: Storing password in localStorage
  pitfall1: {
    bad: `
localStorage.setItem('password', password); // NEVER
    `,
    good: `
// Store JWT token (not password)
localStorage.setItem('auth_token', jwt_token);
    `,
  },

  // Pitfall 2: No CSRF protection
  pitfall2: {
    problem: "Attacker tricks user into submitting form to your site",
    fix: "Use CSRF tokens for state-changing operations",
  },

  // Pitfall 3: No rate limiting on login
  pitfall3: {
    problem: "Attacker brute-forces password",
    fix: "Rate limit login attempts (e.g., 5 per minute)",
  },

  // Pitfall 4: Session fixation
  pitfall4: {
    problem: "Attacker creates session, forces user to use it",
    fix: "Regenerate session ID after login",
  },

  // Pitfall 5: Weak session timeout
  pitfall5: {
    problem: "Sessions live forever (or very long)",
    fix: "Short timeout (30 min) with refresh option",
  },
}
```

---

## Best Practices

```typescript
interface AuthBestPractices {
  // 1. Enforce HTTPS everywhere
  https: "No plain HTTP (sessions sent unencrypted)",

  // 2. Use secure cookies
  cookies: {
    httpOnly: "JS can't access (prevents XSS)",
    secure: "HTTPS only (prevents MITM)",
    sameSite: "strict/lax (prevents CSRF)",
  },

  // 3. Implement password requirements
  passwords: {
    min_length: 12,
    require_uppercase: true,
    require_numbers: true,
    require_symbols: true,
  },

  // 4. Add account recovery securely
  recovery: [
    "Email verification (send link, not password)",
    "Security questions (with backups)",
    "Backup codes (for MFA)",
  ],

  // 5. Monitor suspicious activity
  monitoring: [
    "Unusual login locations",
    "Multiple failed attempts",
    "Impossible travel (logged in 2 continents at once)",
  ],

  // 6. Educate users
  training: [
    "Don't share passwords",
    "Use unique passwords per service",
    "Enable MFA",
    "Don't click suspicious links",
  ],
}
```

---

## Resources

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Auth0 Best Practices](https://auth0.com/blog/)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
