import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const bookingDuration = new Trend('booking_duration');
const successfulBookings = new Counter('successful_bookings');
const activeUsers = new Gauge('active_users');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 500 },   // Ramp up to 500
    { duration: '5m', target: 500 },   // Stay at 500
    { duration: '2m', target: 1000 },  // Ramp up to 1000
    { duration: '5m', target: 1000 },  // Stay at 1000
    { duration: '3m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'errors': ['rate<0.1'],
    'booking_duration': ['p(95)<300'],
  },
  noConnectionReuse: false,
  userAgent: 'SaaS-Factory-LoadTest/1.0',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  activeUsers.add(1);

  group('Read Bookings', () => {
    // Test: Get all bookings
    let res = http.get(`${BASE_URL}/api/bookings`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: {
        name: 'GetAllBookings',
      },
    });

    let success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 500ms': (r) => r.timings.duration < 500,
      'has booking data': (r) => r.json('data') !== null,
    });

    errorRate.add(!success);
    bookingDuration.add(res.timings.duration);
    if (success) successfulBookings.add(1);
  });

  group('Get Single Booking', () => {
    // Test: Get specific booking
    let bookingId = Math.floor(Math.random() * 10000) + 1;
    let res = http.get(`${BASE_URL}/api/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      tags: {
        name: 'GetBooking',
      },
    });

    let success = check(res, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 300ms': (r) => r.timings.duration < 300,
    });

    errorRate.add(!success);
    bookingDuration.add(res.timings.duration);
  });

  group('Filter Bookings', () => {
    // Test: Filter bookings by status
    let res = http.get(
      `${BASE_URL}/api/bookings?status=confirmed&limit=50&offset=0`,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        tags: {
          name: 'FilterBookings',
        },
      }
    );

    let success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
      'returns array': (r) => Array.isArray(r.json('data')),
    });

    errorRate.add(!success);
    bookingDuration.add(res.timings.duration);
  });

  group('Search Bookings', () => {
    // Test: Search with query parameters
    let res = http.get(
      `${BASE_URL}/api/bookings/search?q=customer&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        tags: {
          name: 'SearchBookings',
        },
      }
    );

    let success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 800ms': (r) => r.timings.duration < 800,
    });

    errorRate.add(!success);
    bookingDuration.add(res.timings.duration);
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
  const color = (text, colorCode) =>
    enableColors ? `\x1b[${colorCode}m${text}\x1b[0m` : text;

  let summary = '\n\n=== LOAD TEST SUMMARY ===\n\n';

  if (data.metrics) {
    summary += `${indent}HTTP Requests:\n`;
    summary += `${indent}  Total: ${data.metrics.http_reqs?.value || 0}\n`;
    summary += `${indent}  Duration: ${data.metrics.http_req_duration?.values?.max || 0}ms max\n`;
    summary += `${indent}  P95: ${data.metrics.http_req_duration?.values?.['p(95)'] || 0}ms\n`;
    summary += `${indent}  P99: ${data.metrics.http_req_duration?.values?.['p(99)'] || 0}ms\n`;
    summary += `${indent}  Failed: ${data.metrics.http_req_failed?.value || 0}\n\n`;

    summary += `${indent}Bookings:\n`;
    summary += `${indent}  Successful: ${data.metrics.successful_bookings?.value || 0}\n`;
    summary += `${indent}  Error Rate: ${((data.metrics.errors?.value || 0) * 100).toFixed(2)}%\n`;
    summary += `${indent}  Avg Duration: ${
      data.metrics.booking_duration?.values?.avg || 0
    }ms\n`;
  }

  summary += `\n${indent}Test completed at ${new Date().toISOString()}\n`;
  return summary;
}
