import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const paymentErrors = new Rate('payment_errors');
const checkoutDuration = new Trend('checkout_duration');
const successfulPayments = new Counter('successful_payments');
const failedPayments = new Counter('failed_payments');

export const options = {
  stages: [
    { duration: '2m', target: 25 },   // Ramp up to 25 users
    { duration: '5m', target: 25 },   // Stay at 25
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500', 'p(99)<3000'],
    'payment_errors': ['rate<0.02'],
    'checkout_duration': ['p(95)<1200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';
const STRIPE_KEY = __ENV.STRIPE_KEY || 'pk_test_xxx';

function generateCartPayload() {
  return {
    items: [
      {
        productId: `prod-${Math.floor(Math.random() * 100)}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: (Math.random() * 500 + 50).toFixed(2),
      },
    ],
    customer: {
      email: `test-${Math.random()}@saas-factory.dev`,
      name: 'Test Customer',
    },
  };
}

export default function () {
  group('E-Commerce Checkout Flow', () => {
    // Step 1: Create cart and validate
    let cartPayload = JSON.stringify(generateCartPayload());
    let cartRes = http.post(`${BASE_URL}/api/cart/create`, cartPayload, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'CreateCart' },
    });

    let cartSuccess = check(cartRes, {
      'cart created': (r) => r.status === 201,
      'has cart id': (r) => r.json('cartId') !== null,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });

    if (!cartSuccess) {
      paymentErrors.add(true);
      failedPayments.add(1);
      return;
    }

    let cartId = cartRes.json('cartId');
    sleep(0.5);

    // Step 2: Get cart details and pricing
    let getCartRes = http.get(`${BASE_URL}/api/cart/${cartId}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      tags: { name: 'GetCart' },
    });

    check(getCartRes, {
      'cart retrieved': (r) => r.status === 200,
      'has total': (r) => r.json('total') !== null,
    });

    sleep(0.5);

    // Step 3: Apply coupon (optional)
    let couponRes = http.post(
      `${BASE_URL}/api/cart/${cartId}/apply-coupon`,
      JSON.stringify({ code: 'LOADTEST10' }),
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'ApplyCoupon' },
      }
    );

    check(couponRes, {
      'coupon applied or invalid': (r) => r.status === 200 || r.status === 400,
    });

    sleep(0.3);

    // Step 4: Initiate payment intent (Stripe)
    let paymentIntentRes = http.post(
      `${BASE_URL}/api/payments/create-intent`,
      JSON.stringify({ cartId, currency: 'usd' }),
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'CreatePaymentIntent' },
      }
    );

    let intentSuccess = check(paymentIntentRes, {
      'intent created': (r) => r.status === 200,
      'has client secret': (r) => r.json('clientSecret') !== null,
    });

    if (!intentSuccess) {
      paymentErrors.add(true);
      failedPayments.add(1);
      return;
    }

    let clientSecret = paymentIntentRes.json('clientSecret');
    sleep(0.5);

    // Step 5: Confirm payment with card token
    let confirmPaymentRes = http.post(
      `${BASE_URL}/api/payments/confirm`,
      JSON.stringify({
        clientSecret,
        paymentMethodId: 'pm_card_visa', // Test token
      }),
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'ConfirmPayment' },
      }
    );

    let paymentSuccess = check(confirmPaymentRes, {
      'payment succeeded or requires action': (r) =>
        r.status === 200 || r.status === 202,
      'has payment id': (r) => r.json('paymentId') !== null,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    checkoutDuration.add(confirmPaymentRes.timings.duration);

    if (paymentSuccess) {
      successfulPayments.add(1);
    } else {
      paymentErrors.add(true);
      failedPayments.add(1);
    }

    sleep(1);
  });

  group('Payment Verification', () => {
    // Verify webhook was received and order created
    sleep(2); // Give webhook time to process

    // Query orders to verify payment was recorded
    let ordersRes = http.get(`${BASE_URL}/api/orders?limit=5`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      tags: { name: 'ListOrders' },
    });

    check(ordersRes, {
      'orders retrieved': (r) => r.status === 200,
      'has recent order': (r) =>
        Array.isArray(r.json('data')) && r.json('data').length > 0,
    });
  });
}

export function handleSummary(data) {
  return {
    'stdout': generateSummary(data),
    'payment-summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      successfulPayments: data.metrics.successful_payments?.value || 0,
      failedPayments: data.metrics.failed_payments?.value || 0,
      errorRate:
        ((data.metrics.payment_errors?.value || 0) * 100).toFixed(2) + '%',
      avgDuration:
        Math.round(data.metrics.checkout_duration?.values?.avg || 0) + 'ms',
      p95Duration:
        Math.round(data.metrics.checkout_duration?.values?.['p(95)'] || 0) +
        'ms',
    }),
  };
}

function generateSummary(data) {
  let summary = '\n\n=== PAYMENT FLOW LOAD TEST ===\n\n';
  if (data.metrics) {
    summary += `Successful Payments: ${data.metrics.successful_payments?.value || 0}\n`;
    summary += `Failed Payments: ${data.metrics.failed_payments?.value || 0}\n`;
    summary += `Error Rate: ${((data.metrics.payment_errors?.value || 0) * 100).toFixed(2)}%\n`;
    summary += `Avg Duration: ${Math.round(data.metrics.checkout_duration?.values?.avg || 0)}ms\n`;
    summary += `P95 Duration: ${Math.round(data.metrics.checkout_duration?.values?.['p(95)'] || 0)}ms\n`;
  }
  return summary;
}
