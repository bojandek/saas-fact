"use client"

import { useAuth } from '@saas-factory/blocks-auth';
import { Button } from '@saas-factory/ui';

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <p>Dobrodošli, {user?.email}</p>
        <Button onClick={signOut} variant="destructive" className="mt-4">
          Logout
        </Button>
        <div className="mt-8">
          <a href="/booking" className="text-blue-500 hover:underline">
            Idi na booking
          </a>
        </div>
      </div>
    </div>
  )
}
