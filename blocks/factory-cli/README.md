# 🏭 Factory CLI - Master Control Center

Command-line interface for SaaS Factory OS. Orchestrates all 6 modules into a unified workflow.

## Installation

```bash
npm install -g @saas-factory/factory-cli
```

## Quick Start

```bash
# Initialize a new SaaS project
factory init dental-saas-001

# Create marketing campaign with market research
factory firecrawl input "dental-niche" --research

# Initialize agent team
factory agenthub init --team architect,coder,designer,marketer

# Run full agency workflow
factory agency run --sprint 2-weeks

# Unlock uncensored analysis
factory heretic analyze market --target "dentists"

# Install expert skills
factory skills install "expert-copywriter" "growth-marketer"

# Keep infrastructure at $0
factory free-for-dev optimize

# Full orchestration
factory orchestrate --project dental-saas-001
```

## Commands

### `factory init <project-id>`
Initialize new SaaS project with recommended stack

```bash
factory init dental-saas-001
# Creates:
# - AgentHub workspace
# - AI Agency team
# - Free-for-Dev stack
# - Firecrawl market research
```

### `factory firecrawl <command>`
Web scraping for market research

```bash
factory firecrawl input "dental-niche"
factory firecrawl crawl "https://competitor.com"
factory firecrawl analyze "market-data.json"
```

### `factory agenthub <command>`
Manage agent collaboration

```bash
factory agenthub init --team architect,coder,designer
factory agenthub propose <artifact-file>
factory agenthub merge <artifact-id>
factory agenthub status
```

### `factory agency <command>`
Run 50-person AI team workflows

```bash
factory agency run --sprint 2-weeks
factory agency engineering-sprint --features payment,dashboard
factory agency marketing-campaign --type launch --budget 5000
factory agency design-system
factory agency stats
```

### `factory heretic <command>`
Uncensored AI analysis

```bash
factory heretic analyze market --target dentists
factory heretic critique business --model subscription --price 99
factory heretic psychology --target dentists --mode manipulation
factory heretic survival --runway 6 --mrr 5000 --burn 8000
```

### `factory skills <command>`
Install & manage expert prompts

```bash
factory skills search "copywriter"
factory skills install "expert-copywriter"
factory skills list --category marketing
factory skills trending
factory skills apply "expert-copywriter" --to agent-1
```

### `factory free-for-dev <command>`
Zero-cost infrastructure optimization

```bash
factory free-for-dev recommend --users 1000 --data 10GB
factory free-for-dev status
factory free-for-dev migrate --from provider-1 --to provider-2
factory free-for-dev estimate --project dental-saas-001
```

### `factory orchestrate <command>`
Full SaaS Factory workflow automation

```bash
# Run complete workflow: Research → Architecture → Design → Code → Marketing
factory orchestrate --project dental-saas-001

# Run specific phase
factory orchestrate --phase firecrawl --project dental-saas-001
factory orchestrate --phase design --project dental-saas-001
factory orchestrate --phase code --project dental-saas-001
factory orchestrate --phase marketing --project dental-saas-001

# Monitor execution
factory orchestrate status --project dental-saas-001

# Get report
factory orchestrate report --project dental-saas-001
```

## Terminal Workflow

The complete SaaS Factory OS workflow:

```bash
# 1. RESEARCH: Crawl competitors and market
factory firecrawl input "dental-niche" \
  && factory firecrawl crawl "https://competitor-1.com" \
  && factory firecrawl crawl "https://competitor-2.com"

# 2. AGENTHUB: Initialize collaboration workspace
factory agenthub init --team architect,coder,designer,marketer

# 3. HERETIC: Get brutal honest analysis
factory heretic analyze market --target "dentists" \
  && factory heretic critique business --model subscription --price 99

# 4. AGENCY: Run 50-person team
factory agency engineering-sprint --features "payment,dashboard,appointments" \
  && factory agency design-system \
  && factory agency marketing-campaign --type launch --budget 5000

# 5. SKILLS: Install expert personalities
factory skills install "expert-copywriter" \
  && factory skills install "growth-marketer" \
  && factory skills install "ux-designer-expert"

# 6. FREE-FOR-DEV: Zero-cost infrastructure
factory free-for-dev recommend --users 1000 --data 10GB
factory free-for-dev optimize

# 7. ORCHESTRATE: Full automation
factory orchestrate --project dental-saas-001
```

## Configuration

Create `factory.config.json` in project root:

```json
{
  "projectId": "dental-saas-001",
  "niche": "dental-practices",
  "targetMarket": "small-dentistry-offices",
  "budget": 0,
  "timeline": "90-days",
  "team": ["architect", "coder", "designer", "marketer"],
  "autoOptimize": true,
  "enableHeretic": true
}
```

## Cost Monitoring

All commands respect zero-cost philosophy:

```bash
factory free-for-dev status     # Show current costs
factory costs --all             # Show total projected costs
factory costs --project dental-saas-001
```

## Status Check

```bash
factory status
# Output:
# ✓ AgentHub: 4 agents active
# ✓ AI Agency: Engineering/Design/Marketing teams ready
# ✓ Heretic: Enabled
# ✓ Skill Store: 8 skills installed
# ✓ Free-for-Dev: $0/month
# ✓ Storage: 2.3GB used
```

## Logs & Debugging

```bash
factory logs --tail 50
factory debug --verbose
factory debug --trace orchestrate
```

## Examples

### Launch complete SaaS in 1 command

```bash
factory orchestrate \
  --project "dental-saas" \
  --niche "dental-practices" \
  --budget 0 \
  --timeline "90-days" \
  --auto
```

### Build AI-powered marketing machine

```bash
factory init marketing-saas && \
factory firecrawl input "marketing-industry" && \
factory heretic analyze market && \
factory skills install "expert-copywriter" "growth-marketer" && \
factory agency marketing-campaign --budget 0 --type viral
```

### Build with exact specifications

```bash
factory agency engineering-sprint \
  --features "api,webhooks,dashboard,onboarding" \
  --deadline "2-weeks" && \
factory skills install "senior-engineer" "security-architect" && \
factory free-for-dev recommend --users 10000 --data 50GB
```

## Cost Philosophy

- **$0/month default**: All commands optimize for free tier
- **Auto-upgrade alerts**: Warns before hitting limits
- **Stack swapping**: Automatically switch providers when hitting caps
- **Resource warnings**: Alerts when approaching capacity
