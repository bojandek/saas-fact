import { CheckoutButton } from '@saas-factory/blocks-payments';
import { Button } from '@saas-factory/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Test Payments Block</h1>
      <div className="space-y-4">
        <CheckoutButton priceId="price_123" />
        <Button variant="outline">Upgrade Plan</Button>
      </div>
    </main>
  )
}