# 🎯 Skill Store - 152k+ Expert Prompts

Skill Store gives your AI agents access to 152,000+ expert prompts from prompts.chat. Instead of generic agents, you can install specialized "personalities" that instantly have deep expertise.

## Features

- **152k+ Expert Prompts**: Entire prompts.chat library
- **Instant Specialization**: Install skills directly into agents
- **Role-Based Prompts**: CEO, Engineer, Designer, Marketer, etc.
- **Searchable**: Find relevant prompts by domain/intention
- **Agent Installation**: One-click skill loading
- **Version Control**: Track skill updates

## Available Skill Categories

- **Business**: CEO, CFO, Business Analyst, Product Manager
- **Engineering**: Senior Dev, DevOps, Architect, Security Lead
- **Design**: UX Designer, Visual Designer, Design System Lead
- **Marketing**: Growth Marketer, Copywriter, CMO
- **Sales**: Sales Director, Sales Engineer, Account Manager
- **Finance**: CFO, Accountant, Analyst
- **HR**: Recruiter, Manager, Culture Lead
- **Legal**: Contract Lawyer, Compliance Officer
- **And 100+ more specializations...**

## Usage

```typescript
import { SkillStore } from '@saas-factory/skill-store'

const store = new SkillStore({
  cachePath: './skills-cache'
})

// Install a skill into an agent
const copywriterSkill = await store.getSkill('expert-copywriter')
const contentAgent = await agent.installSkill(copywriterSkill)

// Search for skills
const marketingSkills = await store.search('marketing', 'growth-hacking')

// Get skill by category
const engineeringSkills = await store.getCategory('engineering')

// Apply multiple skills (stack)
const superAgent = await agent
  .installSkill('expert-accountant')
  .installSkill('financial-analyst')
  .installSkill('cfo-mindset')
```

## Skill Format

```json
{
  "id": "expert-copywriter",
  "name": "Expert Copywriter",
  "description": "Master copywriter specialized in B2B SaaS conversion",
  "prompt": "You are a world-class copywriter...",
  "tags": ["marketing", "copywriting", "conversion"],
  "rating": 4.8,
  "uses": 24500,
  "expertiseArea": "copywriting"
}
```

## Cost: $0 - Local caching, API from prompts.chat
