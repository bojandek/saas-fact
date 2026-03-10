"use client"

import { getTenantBySubdomain } from '@saas-factory/blocks-database';
import { Button } from '@saas-factory/ui';

export default async function BookingPage() {
  // Stub booking calendar
  const tenant = await getTenantBySubdomain('salon1'); // example

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Booking Kalendar</h1>
        <p>Tenant: {tenant?.name}</p>
        <Button className="mt-4">
          Rezerviši termin
        </Button>
      </div>
    </div>
  )
}
