# SaaS Factory 🏭

SaaS Factory is an autonomous AI system that generates complete, production-ready SaaS applications from a single CLI command. It uses a multi-agent "War Room" architecture to handle everything from database schema design to landing page copywriting, compliance checking, and market simulation.

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

The easiest way to run the Factory Control Center dashboard:

```bash
# 1. Clone the repository
git clone https://github.com/bojandek/saas-fact.git
cd saas-fact

# 2. Copy the environment file and add your API keys
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY and SUPABASE_URL

# 3. Start the Control Center
docker-compose up -d
```

Then open `http://localhost:3000` in your browser to access the Factory Control Center.

### Option 2: Local Setup Wizard

If you prefer to run the CLI directly on your machine:

```bash
# Run the interactive setup wizard
./setup.sh

# The wizard will install dependencies, build the project, and configure your API keys.
```

## 🛠️ Usage (CLI)

Once installed, you can use the `factory` CLI command:

```bash
# List all 19 predefined SaaS niches
factory niche-list

# See the architecture blueprint for a specific niche
factory niche-map --niche "teretana-crm"

# Generate a complete SaaS application
factory generate --niche "teretana-crm" --name moj-gym --style apple --color '#007AFF'
```

Generated applications are saved in the `apps/` directory.

## 🧠 Architecture: The War Room

SaaS Factory uses a parallel multi-agent pipeline to build your app:

1. **ThemeAgent**: Selects design tokens based on expert knowledge (Apple HIG, Refactoring UI).
2. **ArchitectAgent**: Designs the SQL schema and API specification.
3. **AssemblerAgent**: Writes the Next.js/React code with TailwindCSS.
4. **GrowthHackerAgent**: Creates SEO audits, content gaps, and a 30-day growth plan.
5. **ComplianceAgent**: Checks for GDPR, SOC2, HIPAA, and PCI-DSS compliance.
6. **QAAgent**: Writes Playwright E2E tests based on the testing pyramid.
7. **LegalAgent**: Generates Terms of Service and Privacy Policies.
8. **PricingIntelligenceAgent**: Determines the optimal pricing tiers and strategy.
9. **MirofishAgent**: Simulates 1000+ AI users to predict churn, feature adoption, and market fit.

## ✨ Advanced Features

- **MetaClaw Learning Loop**: A genetic algorithm that evaluates generated apps and improves the agent prompts for the next generation. The system gets smarter with every app it builds.
- **Mirofish Market Simulation**: Before you even launch, 1000+ AI personas "use" your app to predict market behavior and revenue.
- **Anthropic Knowledge Work Plugins**: Agents use structured frameworks for Architecture Decision Records (ADRs), Code Reviews, and Sprint Planning.
- **Factory Control Center**: A beautiful web dashboard to monitor generations, view the fleet of apps, and analyze MetaClaw learning metrics.

## 📦 Project Structure

- `apps/`: Generated SaaS applications and the Factory Control Center.
- `blocks/`: Reusable, pre-built modules (auth, payments, database, mirofish, etc.).
- `factory-brain/`: The core AI engine, agents, memory, and knowledge base.

## 📄 License

MIT License
