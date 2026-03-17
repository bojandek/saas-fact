import { NextResponse } from 'next/server';
import { createServerClient } from '@saas-factory/auth';
import { createTenantUser, getTenantById } from '@saas-factory/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, role, tenantId } = await request.json();

    if (!email || !role || !tenantId) {
      return NextResponse.json({ error: 'Missing required fields: email, role, tenantId' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check if the current user has permission to invite (e.g., is admin/owner of the tenant)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real app, you'd fetch the inviting user's role and tenant_id from the database
    // For now, we'll assume the user making the request is authorized for the given tenantId
    // and that the tenantId passed in the body is the correct one for the inviting user.
    // This needs to be hardened with RLS and proper auth checks.

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Create a user record in public.users, but without an auth.users entry yet
    // The user will be created in auth.users when they accept the invitation
    const newUser = await createTenantUser({
      email,
      name: email.split('@')[0], // Default name
      tenant_id: tenantId,
      role,
    });

    // Generate an invitation token (e.g., using JWT or a simple UUID stored in DB)
    // For simplicity, we'll just use the new user's ID for now, but a proper token is better
    const invitationToken = newUser.id; 
    const invitationLink = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/join?token=${invitationToken}`;

    await resend.emails.send({
      from: 'onboarding@saas-factory.com',
      to: email,
      subject: `You've been invited to join ${tenant.name}`,
      html: `
        <p>Hi ${newUser.name},</p>
        <p>You've been invited to join the workspace <strong>${tenant.name}</strong> on SaaS Factory.</p>
        <p>Click the link below to accept the invitation and set up your account:</p>
        <p><a href="${invitationLink}">Accept Invitation</a></p>
        <p>If you have any questions, please contact your team administrator.</p>
        <p>Best regards,</p>
        <p>The SaaS Factory Team</p>
      `,
    });

    return NextResponse.json({ message: 'Invitation sent successfully', userId: newUser.id });
  } catch (error) {
    console.error('Invite API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
