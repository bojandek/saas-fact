import { resend } from '../lib/resend-client';
import Welcome from '../templates/Welcome';

export async function sendWelcomeEmail(to: string, name: string, url: string) {
  await resend.emails.send({
    from: 'no-reply@saas-factory.com',
    to,
    subject: 'Welcome!',
    react: Welcome({ name, url }),
  });
}
