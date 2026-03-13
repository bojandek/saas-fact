# Data Encryption: At-Rest & In-Transit for SaaS

## Encryption Fundamentals

### Encryption vs Hashing vs Encoding

```typescript
interface CryptographyMethods {
  // Method 1: Encryption (reversible, keeps data)
  encryption: {
    definition: "Transform data so only authorized party can read",
    reversible: true,
    use_case: "Customer data, credit cards, secrets",
    process: "plaintext + key = ciphertext (decrypt to recover plaintext)",
    example: "AES-256 encryption",
  },

  // Method 2: Hashing (non-reversible, one-way)
  hashing: {
    definition: "Transform data to fixed-length fingerprint",
    reversible: false,
    use_case: "Passwords, integrity verification",
    property: "Same input always produces same hash",
    example: "bcrypt for passwords, SHA-256 for integrity",
  },

  // Method 3: Encoding (not security, just format)
  encoding: {
    definition: "Convert data to different format",
    purpose: "Transport/storage compatibility",
    examples: ["Base64", "URL encoding", "UTF-8"],
    security_note: "NOT cryptographic (anyone can decode)",
  },

  // Mixing them up = security disaster
  horror_example: {
    wrong: "Storing passwords in Base64 (encoding, not hashing)",
    right: "Storing passwords hashed with bcrypt",
  },
}
```

---

## Encryption at Rest

### Database Encryption

```typescript
interface DatabaseEncryption {
  // Method 1: Transparent Data Encryption (TDE)
  tde: {
    what: "Database encrypts data automatically",
    when: "Data written to disk",
    how: "Database handles key management",
    where_supported: [
      "PostgreSQL (pgcrypto)",
      "MySQL (with encryption)",
      "AWS RDS (AWS-managed keys)",
      "Google Cloud SQL",
    ],
  },

  // Method 2: Field-Level Encryption
  fieldLevel: {
    what: "Application encrypts specific columns",
    why: "Granular control over sensitive data",
    example: `
// Before storage
user.ssn = "123-45-6789"
user.encrypted_ssn = encrypt(user.ssn, encryptionKey)

// Save to DB (encrypted)
await db.users.create(user)

// On retrieval
const user = await db.users.findById(id)
user.ssn = decrypt(user.encrypted_ssn, decryptionKey)
    `,

    implementation: `
import { encrypt, decrypt } from 'crypto-js';

const encryptionKey = process.env.ENCRYPTION_KEY; // From KMS

export class User {
  @Column()
  email: string; // Not sensitive

  @Column()
  encrypted_ssn: string; // Encrypted

  setSsn(ssn: string) {
    this.encrypted_ssn = encrypt(ssn, encryptionKey);
  }

  getSsn(): string {
    return decrypt(this.encrypted_ssn, encryptionKey);
  }
}
    `,
  },

  // Method 3: Full-Disk Encryption
  fullDisk: {
    what: "OS-level encryption (entire disk encrypted)",
    server: "Linux: LUKS, macOS: FileVault, Windows: BitLocker",
    benefit: "Protects against stolen hard drives",
  },
}
```

### AWS Key Management Service (KMS)

```typescript
// Best practice: Never store keys in code/env vars
// Use AWS KMS for key management

import AWS from 'aws-sdk';

const kms = new AWS.KMS({ region: 'us-east-1' });
const s3 = new AWS.S3();

export async function encryptWithKMS(
  plaintext: string,
  keyId: string
): Promise<string> {
  const params = {
    KeyId: keyId,
    Plaintext: Buffer.from(plaintext),
  };

  const encrypted = await kms.encrypt(params).promise();

  // Store encrypted data
  return encrypted.CiphertextBlob.toString('base64');
}

export async function decryptWithKMS(ciphertext: string): Promise<string> {
  const params = {
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
  };

  const decrypted = await kms.decrypt(params).promise();
  return decrypted.Plaintext.toString('utf-8');
}

// Usage: S3 with server-side encryption
const uploadParams = {
  Bucket: 'my-bucket',
  Key: 'sensitive-file.txt',
  Body: fileContent,
  ServerSideEncryption: 'aws:kms',
  SSEKMSKeyId: 'arn:aws:kms:...',
};

await s3.upload(uploadParams).promise();
```

---

## Encryption in Transit

### TLS/SSL Certificate Management

```typescript
interface TLSSetup {
  // Always use HTTPS
  http_disabled: "Mandatory in production",

  certificate_sources: {
    traditional: "Buy from Certificate Authority",
    free: "Let's Encrypt (automated, free)",
    managed: "AWS ACM (automatic renewal)",
  },

  // Express setup
  implementation: `
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('./private-key.pem'),
  cert: fs.readFileSync('./certificate.pem'),
};

https.createServer(options, app).listen(443);
  `,

  // Next.js on Vercel (automatic)
  next_js: "Vercel handles HTTPS automatically",

  // Force HTTPS
  middleware: `
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(301, 'https://' + req.header('host') + req.url);
  } else {
    next();
  }
});
  `,

  // HSTS Header (Force browser to use HTTPS)
  hsts: {
    header: "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    effect: "Browser will only use HTTPS for next year",
  },
}
```

### API Key Transmission

```typescript
interface APIKeyTransmission {
  // WRONG: Sending in URL
  wrong: "GET /api/data?api_key=sk_live_...",
  problem: "API key logged in URLs, browser history, proxy logs",

  // RIGHT: Send in header
  right: {
    header: "Authorization: Bearer sk_live_...",
    benefit: "Headers not logged by default",
  },

  // Implementation
  example: `
// Client sends API key in header
const response = await fetch('https://api.example.com/data', {
  headers: {
    'Authorization': 'Bearer ' + apiKey,
  },
});

// Server validates
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const apiKey = auth.slice(7); // Remove 'Bearer '
  
  if (!isValidAPIKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
});
  `,
}
```

### Certificate Pinning

```typescript
// Prevent MITM attacks (attacker uses different valid certificate)

interface CertificatePinning {
  what: "Client pins expected certificate or public key",
  when: "High-security applications (banking, payment)",

  levels: {
    certificate_pinning: "Pin exact certificate",
    public_key_pinning: "Pin certificate's public key (survives renewal)",
  },

  // Implementation: Nodejs
  implementation: `
import tls from 'tls';

const expectedCertFingerprint = 'abc123...'; // SHA-256 of cert

const options = {
  hostname: 'api.example.com',
  port: 443,
  checkServerIdentity: (servername, cert) => {
    const certFingerprint = crypto
      .createHash('sha256')
      .update(cert.raw)
      .digest('hex');
    
    if (certFingerprint !== expectedCertFingerprint) {
      throw new Error('Certificate pinning failed');
    }
  },
};

https.request(options, (res) => {
  // Safe to use response only if pinning passed
});
  `,
}
```

---

## Password Hashing

### bcrypt for Passwords

```typescript
// NEVER store plaintext passwords
// Use bcrypt for one-way hashing

import bcrypt from 'bcrypt';

interface PasswordHashing {
  // Storing password
  register: {
    implementation: `
export async function registerUser(email: string, password: string) {
  // Hash password with salt (10 rounds)
  const hashed = await bcrypt.hash(password, 10);

  // Store hashed password (not plaintext!)
  await db.users.create({
    email: email,
    password_hash: hashed,
  });
}
    `,
  },

  // Verifying password
  login: {
    implementation: `
export async function loginUser(email: string, password: string) {
  const user = await db.users.findOne({ email });

  if (!user) {
    return { success: false };
  }

  // Compare plaintext with hash
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return { success: false };
  }

  return { success: true, user };
}
    `,
  },

  // Rounds parameter
  rounds: {
    lower: "5 = fast but less secure",
    typical: "10 = good balance",
    higher: "12+ = slower but more secure (resistant to GPU cracking)",
  },
}
```

### Comparing bcrypt vs Other Methods

```typescript
interface PasswordHashingComparison {
  bcrypt: {
    pros: ["Slow by design (resists brute-force)", "Built-in salt"],
    cons: ["Slower than SHA", "Max 72 characters"],
    use: "Recommended for passwords",
  },

  argon2: {
    pros: ["Winner of Password Hashing Competition 2015", "GPU resistant"],
    cons: ["Newer (less battle-tested)"],
    use: "Modern alternative to bcrypt",
  },

  pbkdf2: {
    pros: ["NIST approved", "Customizable"],
    cons: ["Needs many iterations"],
  },

  scrypt: {
    pros: ["Memory-hard (GPU resistant)"],
    cons: ["Slower"],
  },

  // WRONG
  sha256: {
    problem: "Fast to crack (use with GPU)",
    why_wrong: "Not designed for passwords",
  },

  plaintext: {
    security: "Security nightmare",
    use: "Never",
  },
}
```

---

## Secrets Management

### Environment Variables (Basic)

```typescript
// .env file
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=super_secret_key

// Load in code
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
```

### AWS Secrets Manager (Production)

```typescript
// Rotate secrets automatically without restarting

import AWS from 'aws-sdk';

const secretsManager = new AWS.SecretsManager();

export async function getSecret(secretName: string): Promise<string> {
  try {
    const response = await secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();

    if ('SecretString' in response) {
      return response.SecretString!;
    } else {
      // Binary secret
      return Buffer.from(response.SecretBinary as Buffer).toString('ascii');
    }
  } catch (error) {
    throw new Error(`Failed to get secret: ${secretName}`);
  }
}

// Usage
const stripeKey = await getSecret('prod/stripe/secret-key');
```

### Vault by HashiCorp (Advanced)

```typescript
// Enterprise secret management with auditing

// Never commit to Git
// .env added to .gitignore
// Secrets in Vault, rotated automatically
```

---

## GDPR & Data Privacy (Encryption Context)

### Right to Erasure

```typescript
// GDPR: Users can request data deletion

export async function deleteUserData(userId: string) {
  // Delete user record
  await db.users.delete({ id: userId });

  // Delete encrypted data
  await db.orders.deleteMany({ user_id: userId });
  await db.userProfiles.delete({ user_id: userId });

  // Soft delete (for billing/legal hold)
  // await db.users.update({ id: userId }, { deleted_at: new Date() });
}
```

### Data Minimization

```typescript
// GDPR: Only collect/store necessary data

interface DataMinimization {
  unnecessary: [
    "User's mother's maiden name (for what?)",
    "Exact office location (use city instead)",
    "Phone number (if not needed)",
  ],

  necessary: [
    "Name (for order fulfillment)",
    "Email (for contact)",
    "Address (for shipping)",
    "Payment info (for billing)",
  ],
}
```

---

## Encryption Best Practices

```typescript
interface EncryptionBestPractices {
  // 1. Encrypt at the source
  strategy: "Encrypt data before sending to server",
  benefit: "Server never sees plaintext",

  // 2. Separate data and keys
  practice: "Never store encryption key with encrypted data",
  example: "Store key in KMS, encrypted data in database",

  // 3. Rotate keys regularly
  frequency: "Annual key rotation recommended",
  process: [
    "Generate new key in KMS",
    "Re-encrypt all data with new key",
    "Delete old key",
  ],

  // 4. Use strong algorithms
  algorithms: {
    encryption: "AES-256 (not DES, not MD5)",
    hashing: "bcrypt, argon2, PBKDF2",
    key_exchange: "Elliptic Curve Diffie-Hellman (ECDH)",
  },

  // 5. Audit encryption access
  logging: "Log all encryption/decryption operations",
  alerting: "Alert on unusual access patterns",
}
```

---

## Resources

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [OWASP Encryption](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Let's Encrypt for Free SSL](https://letsencrypt.org/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/)
