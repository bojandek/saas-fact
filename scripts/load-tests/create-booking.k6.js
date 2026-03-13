import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('write_errors');
const createDuration = new Trend('create_duration');
const successfulCreates = new Counter('successful_creates');
const failedCreates = new Counter('failed_creates');
const activeUsers = new Gauge('active_users');

export const options = {
  stages: [
    { duration: '2m', target: 50 },    // Ramp up to 50 users
    { duration: '5m', target: 50 },    // Stay at 50
    { duration: '2m', target: 200 },   // Ramp up to 200
    { duration: '5m', target: 200 },   // Stay at 200
    { duration: '2m', target: 500 },   // Ramp up to 500
    { duration: '5m', target: 500 },   // Stay at 500
    { duration: '3m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'write_errors': ['rate<0.05'],
    'create_duration': ['p(95)<800'],
  },
  noConnectionReuse: false,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

function generateBookingPayload() {
  const now = new Date();
  return {
    customerId: `cust-${Math.floor(Math.random() * 100000)}`,
    serviceId: `srv-${Math.floor(Math.random() * 1000)}`,
    bookingDate: new Date(now.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    duration: Math.floor(Math.random() * 4) + 1, // 1-4 hours
    status: 'pending',
    notes: `Load test booking ${Math.random()}`,
  };
}

export default function () {
  activeUsers.add(1);

  group('Create New Booking', () => {
    let payload = JSON.stringify(generateBookingPayload());

    let res = http.post(`${BASE_URL}/api/bookings`, payload, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: {
        name: 'CreateBooking',
      },
    });

    let success = check(res, {
      'status is 201': (r) => r.status === 201,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
      'has booking id': (r) => r.json('id') !== null,
      'status is pending': (r) => r.json('status') === 'pending',
    });

    errorRate.add(!success);
    createDuration.add(res.timings.duration);
    if (success) {
      successfulCreates.add(1);
    } else {
      failedCreates.add(1);
    }
  });

  group('Update Booking', () => {
    let bookingId = Math.floor(Math.random() * 10000) + 1;
    let updatePayload = JSON.stringify({
      status: 'confirmed',
      notes: 'Updated by load test',
    });

    let res = http.patch(
      `${BASE_URL}/api/bookings/${bookingId}`,
      updatePayload,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        tags: {
          name: 'UpdateBooking',
        },
      }
    );

    let success = check(res, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 800ms': (r) => r.timings.duration < 800,
    });

    errorRate.add(!success);
    createDuration.add(res.timings.duration);
  });

  group('Bulk Create Bookings', () => {
    let payloads = [];
    for (let i = 0; i < 5; i++) {
      payloads.push(generateBookingPayload());
    }
    let bulkPayload = JSON.stringify({ bookings: payloads });

    let res = http.post(`${BASE_URL}/api/bookings/bulk`, bulkPayload, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: {
        name: 'BulkCreateBookings',
      },
    });

    let success = check(res, {
      'status is 201': (r) => r.status === 201,
      'response time < 2000ms': (r) => r.timings.duration < 2000,
      'created multiple': (r) => r.json('created') >= 5,
    });

    errorRate.add(!success);
    createDuration.add(res.timings.duration);
    if (success) {
      successfulCreates.add(5);
    } else {
      failedCreates.add(5);
    }
  });

  sleep(1);
  activeUsers.add(-1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options;

  let summary = '\n\n=== WRITE LOAD TEST SUMMARY ===\n\n';

  if (data.metrics) {
    summary += `${indent}Create Operations:\n`;
    summary += `${indent}  Successful: ${data.metrics.successful_creates?.value || 0}\n`;
    summary += `${indent}  Failed: ${data.metrics.failed_creates?.value || 0}\n`;
    summary += `${indent}  Error Rate: ${((data.metrics.write_errors?.value || 0) * 100).toFixed(2)}%\n`;
    summary += `${indent}  Avg Duration: ${
      data.metrics.create_duration?.values?.avg || 0
    }ms\n`;
    summary += `${indent}  P95: ${data.metrics.create_duration?.values?.['p(95)'] || 0}ms\n`;
  }

  summary += `\n${indent}Test completed at ${new Date().toISOString()}\n`;
  return summary;
}
