# Agency Agents — The Factory Team

26 specijalizovanih AI agenata iz [The Agency](https://github.com/msitarzewski/agency-agents) (55k ⭐) integrisanih u SaaS Factory.

Svaki agent ima:
- **Personalitet** — jedinstven stil i pristup
- **Core Mission** — specifičan set zadataka
- **Critical Rules** — pravila kojih se drži
- **Success Metrics** — mjerljivi KPI-evi
- **Technical Deliverables** — konkretni outputi

---

## Dostupni agenti

### Engineering (8)
| Agent | Uloga |
|---|---|
| `engineering-frontend-developer` | React/TypeScript, pixel-perfect UI |
| `engineering-backend-architect` | API dizajn, skalabilnost |
| `engineering-software-architect` | Sistemski dizajn, arhitektura |
| `engineering-security-engineer` | Sigurnosni audit, OWASP |
| `engineering-database-optimizer` | SQL optimizacija, indeksi |
| `engineering-devops-automator` | CI/CD, deployment |
| `engineering-code-reviewer` | Code review, best practices |
| `engineering-rapid-prototyper` | Brzi MVP, iteracija |

### Marketing (5)
| Agent | Uloga |
|---|---|
| `marketing-growth-hacker` | Viralni rast, K-faktor > 1.0 |
| `marketing-seo-specialist` | SEO strategija, keyword targeting |
| `marketing-content-creator` | Content marketing |
| `marketing-reddit-community-builder` | Reddit community, ne marketing |
| `marketing-twitter-engager` | Twitter/X engagement |

### Product (3)
| Agent | Uloga |
|---|---|
| `product-manager` | Roadmap, sprint planning |
| `product-sprint-prioritizer` | RICE, MoSCoW prioritizacija |
| `product-feedback-synthesizer` | User feedback analiza |

### Design (4)
| Agent | Uloga |
|---|---|
| `design-ui-designer` | UI sistem, komponente |
| `design-ux-researcher` | User research, testiranje |
| `design-brand-guardian` | Brand konzistentnost |
| `design-whimsy-injector` | Micro-interactions, delight |

### Testing (4)
| Agent | Uloga |
|---|---|
| `testing-reality-checker` | Realna procjena, default: NEEDS WORK |
| `testing-api-tester` | API testiranje |
| `testing-performance-benchmarker` | Performance metrike |
| `testing-evidence-collector` | Dokazi, ne pretpostavke |

### Sales (2)
| Agent | Uloga |
|---|---|
| `sales-outbound-strategist` | Outbound prodaja |
| `sales-proposal-strategist` | Prijedlozi, closing |

---

## Korištenje u kodu

```typescript
import { SaaSAgencyTeam, runAgentTask, listAgents } from '../agency-agent-loader'

// Preddefinirani SaaS tim
const growthPlan = await SaaSAgencyTeam.growthPlan('MojGym', 'teretana-crm', ['bookings', 'payments'])
const uiReview = await SaaSAgencyTeam.uiReview('MojGym', ['Dashboard', 'BookingWidget'])
const realityCheck = await SaaSAgencyTeam.realityCheck('MojGym', generationSummary)

// Direktan poziv bilo kojeg agenta
const result = await runAgentTask('marketing-reddit-community-builder', 'Create Reddit strategy for gym SaaS')

// Lista svih agenata
const agents = listAgents()
```

## Korištenje u CLI-u

```bash
# Lista svih agenata
factory agents

# Pokreni specifičnog agenta
factory agent --name "marketing-growth-hacker" --task "Create growth plan for my gym SaaS"

# SaaS tim (svi agenti za jedan projekat)
factory generate --niche "teretana-crm" --name moj-gym --full-team
```
