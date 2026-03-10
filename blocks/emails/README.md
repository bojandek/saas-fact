# @saas-factory/blocks-emails

Emails with Resend + React Email.

## Usage

```ts
import { sendWelcomeEmail } from '@saas-factory/blocks-emails';

await sendWelcomeEmail('user@example.com', 'John', 'https://app.com/onboarding');
```

## Env

```
RESEND_API_KEY=re_...
```

Templates in src/templates/.
