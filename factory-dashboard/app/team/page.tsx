import { useState, useEffect } from 'react';
import { Button } from '@saas-factory/ui';
import { useAuth } from '@saas-factory/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'owner';
}

export default function TeamPage() {
  const { user, loading: authLoading } = useAuth();
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchTeamMembers = async () => {
    if (!user?.tenant_id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/users?tenantId=${user.tenant_id}`); // Assuming an API to fetch tenant users
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const data = await response.json();
      setTeamMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      fetchTeamMembers();
    }
  }, [user, authLoading]);

  const handleInvite = async () => {
    if (!user?.tenant_id || !inviteEmail) return;
    setInviteLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          tenantId: user.tenant_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      setSuccessMessage('Invitation sent successfully!');
      setInviteEmail('');
      // Re-fetch team members to update the list, or add the new member to the state
      fetchTeamMembers(); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-6">Please log in to view this page.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Team Management</h1>

      <div className="mb-8 p-6 border rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Invite New Member</h2>
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Member's Email"
            className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail}>
            {inviteLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
        {error && <p className="text-red-500 mt-2">Error: {error}</p>}
        {successMessage && <p className="text-green-500 mt-2">{successMessage}</p>}
      </div>

      <div className="p-6 border rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Current Team Members</h2>
        {teamMembers.length === 0 ? (
          <p className="text-gray-500">No team members yet. Invite someone!</p>
        ) : (
          <ul className="space-y-3">
            {teamMembers.map((member) => (
              <li key={member.id} className="flex justify-between items-center p-3 border rounded-md">
                <div>
                  <p className="font-medium">{member.name || member.email}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
