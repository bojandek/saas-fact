import { LoginForm } from '@saas-factory/blocks-auth';
import { CheckoutButton } from '@saas-factory/blocks-payments';
import { Button } from '@saas-factory/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 space-y-8">
      <h1 className="text-4xl font-bold">SaaS Factory Foundation Blocks Test</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Auth Block</h2>
          <LoginForm />
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Payments Block</h2>
          <CheckoutButton priceId="price_123" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Database & Emails (console log)</h2>
        <Button onClick={() => console.log('DB query & send email stub')}>
          Test DB/Email
        </Button>
      </div>
    </main>
  )
}
