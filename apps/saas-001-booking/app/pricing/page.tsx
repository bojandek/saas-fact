import { CheckoutButton } from '@saas-factory/blocks-payments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@saas-factory/ui';

export default function PricingPage() {
  return (
    <div className="min-h-screen py-24 px-8">
      <h1 className="text-4xl font-bold text-center mb-16">Pricing</h1>
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <CardDescription>Basic booking</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold">$0/mo</h2>
            <CheckoutButton priceId="price_free" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>Unlimited appointments</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold">$29/mo</h2>
            <CheckoutButton priceId="price_pro" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>Custom features</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <h2 className="text-3xl font-bold">$99/mo</h2>
            <CheckoutButton priceId="price_enterprise" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
