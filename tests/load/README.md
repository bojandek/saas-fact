# Load Tests

Performance and load tests for SaaS Factory using [k6](https://k6.io).

## Prerequisites

```bash
# Install k6
brew install k6                    # macOS
sudo snap install k6               # Ubuntu
choco install k6                   # Windows
```

## Running Tests

### Quick smoke test (1 VU, 1 min)
```bash
k6 run --env SCENARIO=smoke tests/load/saas-generation.k6.js
```

### Against production
```bash
k6 run \
  --env BASE_URL=https://your-app.coolify.io \
  --env API_TOKEN=your-token \
  tests/load/saas-generation.k6.js
```

### Rate limit validation
```bash
k6 run tests/load/api-rate-limit.k6.js
```

### Full stress test (all scenarios)
```bash
k6 run tests/load/saas-generation.k6.js
```

## Scenarios

| Scenario | VUs | Duration | Purpose |
|----------|-----|----------|---------|
| `smoke` | 1 | 1 min | Sanity check |
| `average_load` | 5 | 8 min | Normal traffic |
| `stress` | 30 | 16 min | Find breaking point |
| `spike` | 50 | 1.5 min | Sudden burst |

## Thresholds

The test **fails** if:
- p(95) generation time > 30s
- p(99) health check time > 500ms  
- Generation success rate < 90%
- Overall error rate > 5%
- Queue wait time p(95) > 10s

## Output

k6 outputs results to stdout. For CI/CD integration:

```bash
k6 run --out json=results.json tests/load/saas-generation.k6.js
```

For Grafana dashboard:
```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/saas-generation.k6.js
```
