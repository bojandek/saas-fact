/**
 * Niche-to-Blocks Mapping Engine
 *
 * Automatically selects the right blocks for a given niche/vertical.
 * This is the "brain" that turns `factory generate --niche "teretana-crm"`
 * into a concrete list of blocks, features and database tables.
 *
 * Usage:
 *   const mapper = new NicheMapper()
 *   const blueprint = await mapper.mapNiche('teretana-crm')
 *   // => { blocks: ['auth', 'payments', 'calendar', ...], tables: [...], features: [...] }
 */

import OpenAI from 'openai'
import { logger } from './utils/logger.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NicheBlueprint {
  niche: string
  normalizedNiche: string
  category: NicheCategory
  blocks: string[]
  coreFeatures: string[]
  databaseTables: string[]
  suggestedAppName: string
  suggestedTagline: string
  pricingModel: 'subscription' | 'usage-based' | 'freemium' | 'one-time'
  targetPersona: string
  estimatedComplexity: 'simple' | 'medium' | 'complex'
  confidence: number // 0-1
}

export type NicheCategory =
  | 'fitness-wellness'
  | 'hospitality-booking'
  | 'ecommerce-retail'
  | 'professional-services'
  | 'education-learning'
  | 'healthcare'
  | 'real-estate'
  | 'finance-accounting'
  | 'hr-recruitment'
  | 'marketing-analytics'
  | 'project-management'
  | 'communication'
  | 'other'

// ─── Static Niche Knowledge Base ─────────────────────────────────────────────

const NICHE_KNOWLEDGE_BASE: Record<string, Partial<NicheBlueprint>> = {
  // ── Fitness & Wellness ──────────────────────────────────────────────────────
  'teretana-crm': {
    category: 'fitness-wellness',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'analytics', 'advanced-multi-tenant'],
    coreFeatures: [
      'Member management with subscription tracking',
      'Class scheduling and booking',
      'Attendance tracking with QR codes',
      'Trainer assignment and management',
      'Monthly billing and payment history',
      'Progress tracking and body measurements',
      'Push notifications for class reminders',
    ],
    databaseTables: ['members', 'subscriptions', 'classes', 'bookings', 'trainers', 'attendance', 'measurements'],
    pricingModel: 'subscription',
    targetPersona: 'Gym owner managing 50-500 members',
    estimatedComplexity: 'medium',
  },
  'gym-crm': {
    category: 'fitness-wellness',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'analytics', 'advanced-multi-tenant'],
    coreFeatures: [
      'Member management with subscription tracking',
      'Class scheduling and booking',
      'Attendance tracking',
      'Monthly billing',
      'Progress tracking',
    ],
    databaseTables: ['members', 'subscriptions', 'classes', 'bookings', 'trainers', 'attendance'],
    pricingModel: 'subscription',
    targetPersona: 'Gym owner managing 50-500 members',
    estimatedComplexity: 'medium',
  },
  'yoga-studio': {
    category: 'fitness-wellness',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'feature-flags'],
    coreFeatures: ['Class booking', 'Membership packages', 'Instructor profiles', 'Waitlist management'],
    databaseTables: ['students', 'classes', 'instructors', 'memberships', 'bookings', 'waitlist'],
    pricingModel: 'subscription',
    targetPersona: 'Yoga studio owner with 20-200 students',
    estimatedComplexity: 'simple',
  },

  // ── Hospitality & Booking ───────────────────────────────────────────────────
  'salon-booking': {
    category: 'hospitality-booking',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'analytics'],
    coreFeatures: [
      'Online appointment booking',
      'Staff management and availability',
      'Service catalog with pricing',
      'Client history and notes',
      'Automated SMS/email reminders',
      'Revenue reporting',
    ],
    databaseTables: ['clients', 'staff', 'services', 'appointments', 'payments', 'reviews'],
    pricingModel: 'subscription',
    targetPersona: 'Salon owner with 2-10 staff members',
    estimatedComplexity: 'medium',
  },
  'restaurant-management': {
    category: 'hospitality-booking',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'analytics', 'webhooks'],
    coreFeatures: ['Table reservations', 'Menu management', 'Order tracking', 'Staff scheduling', 'Inventory management'],
    databaseTables: ['tables', 'reservations', 'menu_items', 'orders', 'staff', 'inventory'],
    pricingModel: 'subscription',
    targetPersona: 'Restaurant owner or manager',
    estimatedComplexity: 'complex',
  },
  'hotel-management': {
    category: 'hospitality-booking',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'analytics', 'advanced-multi-tenant', 'webhooks'],
    coreFeatures: ['Room booking', 'Check-in/out management', 'Housekeeping tasks', 'Guest profiles', 'Revenue management'],
    databaseTables: ['rooms', 'reservations', 'guests', 'housekeeping', 'payments', 'amenities'],
    pricingModel: 'subscription',
    targetPersona: 'Hotel manager or property owner',
    estimatedComplexity: 'complex',
  },

  // ── E-commerce & Retail ─────────────────────────────────────────────────────
  'online-store': {
    category: 'ecommerce-retail',
    blocks: ['auth', 'payments', 'storage', 'analytics', 'notifications', 'webhooks'],
    coreFeatures: ['Product catalog', 'Shopping cart', 'Order management', 'Inventory tracking', 'Shipping integration'],
    databaseTables: ['products', 'categories', 'orders', 'order_items', 'customers', 'inventory', 'shipping'],
    pricingModel: 'subscription',
    targetPersona: 'Small business owner selling products online',
    estimatedComplexity: 'complex',
  },
  'subscription-box': {
    category: 'ecommerce-retail',
    blocks: ['auth', 'payments', 'notifications', 'analytics', 'webhooks'],
    coreFeatures: ['Subscription management', 'Box customization', 'Recurring billing', 'Shipment tracking'],
    databaseTables: ['subscribers', 'subscriptions', 'boxes', 'products', 'shipments', 'billing'],
    pricingModel: 'subscription',
    targetPersona: 'Subscription box business owner',
    estimatedComplexity: 'medium',
  },

  // ── Professional Services ───────────────────────────────────────────────────
  'freelancer-crm': {
    category: 'professional-services',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'analytics', 'storage'],
    coreFeatures: ['Client management', 'Project tracking', 'Invoice generation', 'Time tracking', 'Contract management'],
    databaseTables: ['clients', 'projects', 'invoices', 'time_entries', 'contracts', 'payments'],
    pricingModel: 'subscription',
    targetPersona: 'Freelancer or small agency owner',
    estimatedComplexity: 'medium',
  },
  'law-firm-crm': {
    category: 'professional-services',
    blocks: ['auth', 'payments', 'calendar', 'storage', 'notifications', 'advanced-multi-tenant'],
    coreFeatures: ['Case management', 'Client portal', 'Document management', 'Billing and time tracking', 'Court date reminders'],
    databaseTables: ['cases', 'clients', 'documents', 'billing', 'time_entries', 'court_dates'],
    pricingModel: 'subscription',
    targetPersona: 'Law firm partner or solo practitioner',
    estimatedComplexity: 'complex',
  },
  'accounting-saas': {
    category: 'finance-accounting',
    blocks: ['auth', 'payments', 'analytics', 'notifications', 'webhooks', 'storage'],
    coreFeatures: ['Invoice management', 'Expense tracking', 'Tax reporting', 'Bank reconciliation', 'Financial dashboards'],
    databaseTables: ['invoices', 'expenses', 'transactions', 'accounts', 'tax_records', 'reports'],
    pricingModel: 'subscription',
    targetPersona: 'Small business owner or accountant',
    estimatedComplexity: 'complex',
  },

  // ── Education & Learning ────────────────────────────────────────────────────
  'online-course-platform': {
    category: 'education-learning',
    blocks: ['auth', 'payments', 'storage', 'notifications', 'analytics', 'feature-flags'],
    coreFeatures: ['Course creation and management', 'Video hosting', 'Student progress tracking', 'Quizzes and certificates', 'Discussion forums'],
    databaseTables: ['courses', 'lessons', 'students', 'enrollments', 'progress', 'quizzes', 'certificates'],
    pricingModel: 'subscription',
    targetPersona: 'Online educator or training company',
    estimatedComplexity: 'complex',
  },
  'tutoring-platform': {
    category: 'education-learning',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'analytics'],
    coreFeatures: ['Tutor profiles', 'Session booking', 'Video calls integration', 'Progress reports', 'Payment processing'],
    databaseTables: ['tutors', 'students', 'sessions', 'subjects', 'reviews', 'payments'],
    pricingModel: 'usage-based',
    targetPersona: 'Tutoring marketplace or individual tutor',
    estimatedComplexity: 'medium',
  },

  // ── Healthcare ──────────────────────────────────────────────────────────────
  'clinic-management': {
    category: 'healthcare',
    blocks: ['auth', 'payments', 'calendar', 'notifications', 'storage', 'advanced-multi-tenant'],
    coreFeatures: ['Patient records', 'Appointment scheduling', 'Prescription management', 'Billing and insurance', 'Lab results'],
    databaseTables: ['patients', 'appointments', 'prescriptions', 'billing', 'lab_results', 'doctors'],
    pricingModel: 'subscription',
    targetPersona: 'Clinic owner or healthcare administrator',
    estimatedComplexity: 'complex',
  },

  // ── Real Estate ─────────────────────────────────────────────────────────────
  'property-management': {
    category: 'real-estate',
    blocks: ['auth', 'payments', 'notifications', 'storage', 'analytics', 'advanced-multi-tenant'],
    coreFeatures: ['Property listings', 'Tenant management', 'Rent collection', 'Maintenance requests', 'Lease management'],
    databaseTables: ['properties', 'tenants', 'leases', 'payments', 'maintenance_requests', 'documents'],
    pricingModel: 'subscription',
    targetPersona: 'Property manager or landlord with 5+ units',
    estimatedComplexity: 'complex',
  },

  // ── HR & Recruitment ────────────────────────────────────────────────────────
  'hr-management': {
    category: 'hr-recruitment',
    blocks: ['auth', 'payments', 'notifications', 'storage', 'analytics', 'advanced-multi-tenant'],
    coreFeatures: ['Employee profiles', 'Leave management', 'Payroll processing', 'Performance reviews', 'Onboarding workflows'],
    databaseTables: ['employees', 'departments', 'leave_requests', 'payroll', 'performance_reviews', 'onboarding'],
    pricingModel: 'subscription',
    targetPersona: 'HR manager at a 10-200 person company',
    estimatedComplexity: 'complex',
  },
  'ats-recruiting': {
    category: 'hr-recruitment',
    blocks: ['auth', 'notifications', 'storage', 'analytics', 'webhooks', 'email-workflows'],
    coreFeatures: ['Job postings', 'Applicant tracking', 'Interview scheduling', 'Offer management', 'Onboarding'],
    databaseTables: ['jobs', 'applicants', 'applications', 'interviews', 'offers', 'pipeline_stages'],
    pricingModel: 'subscription',
    targetPersona: 'Recruiter or HR team at a growing company',
    estimatedComplexity: 'complex',
  },

  // ── Marketing & Analytics ───────────────────────────────────────────────────
  'email-marketing': {
    category: 'marketing-analytics',
    blocks: ['auth', 'payments', 'analytics', 'email-workflows', 'webhooks', 'feature-flags'],
    coreFeatures: ['Campaign management', 'Contact lists', 'Email templates', 'A/B testing', 'Analytics and reporting'],
    databaseTables: ['campaigns', 'contacts', 'lists', 'templates', 'sends', 'events', 'ab_tests'],
    pricingModel: 'usage-based',
    targetPersona: 'Marketer or small business owner',
    estimatedComplexity: 'complex',
  },

  // ── Project Management ──────────────────────────────────────────────────────
  'project-management': {
    category: 'project-management',
    blocks: ['auth', 'payments', 'notifications', 'analytics', 'webhooks', 'feature-flags'],
    coreFeatures: ['Project boards', 'Task management', 'Team collaboration', 'Time tracking', 'Reporting'],
    databaseTables: ['projects', 'tasks', 'teams', 'members', 'comments', 'time_entries', 'milestones'],
    pricingModel: 'subscription',
    targetPersona: 'Team lead or project manager',
    estimatedComplexity: 'complex',
  },
}

// ─── Niche Mapper Class ───────────────────────────────────────────────────────

export class NicheMapper {
  private openai: OpenAI
  private log = logger.child({ module: 'NicheMapper' })

  constructor() {
    this.openai = new OpenAI()
  }

  /**
   * Maps a niche string to a full NicheBlueprint.
   * First checks static knowledge base, then falls back to LLM.
   */
  async mapNiche(niche: string): Promise<NicheBlueprint> {
    const normalized = this.normalizeNiche(niche)
    this.log.info({ niche, normalized }, 'Mapping niche to blueprint')

    // 1. Check static knowledge base first (fast, free)
    const staticMatch = this.findStaticMatch(normalized)
    if (staticMatch && staticMatch.confidence! > 0.8) {
      this.log.info({ niche, confidence: staticMatch.confidence }, 'Found high-confidence static match')
      return staticMatch
    }

    // 2. Fall back to LLM for unknown niches
    this.log.info({ niche }, 'No static match found, using LLM to map niche')
    return this.mapNicheWithLLM(niche, normalized)
  }

  /**
   * Normalize niche string: lowercase, replace spaces/underscores with hyphens
   */
  private normalizeNiche(niche: string): string {
    return niche
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  }

  /**
   * Find best match in static knowledge base using fuzzy matching
   */
  private findStaticMatch(normalized: string): NicheBlueprint | null {
    // Exact match
    if (NICHE_KNOWLEDGE_BASE[normalized]) {
      return this.buildBlueprint(normalized, NICHE_KNOWLEDGE_BASE[normalized], 1.0)
    }

    // Partial match — check if any key contains the normalized niche
    for (const [key, data] of Object.entries(NICHE_KNOWLEDGE_BASE)) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return this.buildBlueprint(normalized, data, 0.85)
      }
    }

    // Keyword match — check individual words
    const words = normalized.split('-')
    let bestMatch: { key: string; data: Partial<NicheBlueprint>; score: number } | null = null

    for (const [key, data] of Object.entries(NICHE_KNOWLEDGE_BASE)) {
      const keyWords = key.split('-')
      const matchCount = words.filter(w => keyWords.includes(w)).length
      const score = matchCount / Math.max(words.length, keyWords.length)

      if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { key, data, score }
      }
    }

    if (bestMatch) {
      return this.buildBlueprint(normalized, bestMatch.data, bestMatch.score * 0.8)
    }

    return null
  }

  /**
   * Build a complete NicheBlueprint from partial data
   */
  private buildBlueprint(
    niche: string,
    data: Partial<NicheBlueprint>,
    confidence: number
  ): NicheBlueprint {
    const appName = this.generateAppName(niche)
    return {
      niche,
      normalizedNiche: niche,
      category: data.category || 'other',
      blocks: data.blocks || ['auth', 'payments', 'analytics'],
      coreFeatures: data.coreFeatures || [],
      databaseTables: data.databaseTables || ['users', 'organizations'],
      suggestedAppName: appName,
      suggestedTagline: this.generateTagline(niche, data.category || 'other'),
      pricingModel: data.pricingModel || 'subscription',
      targetPersona: data.targetPersona || 'Small business owner',
      estimatedComplexity: data.estimatedComplexity || 'medium',
      confidence,
    }
  }

  /**
   * Use LLM to map unknown niches
   */
  private async mapNicheWithLLM(niche: string, normalized: string): Promise<NicheBlueprint> {
    const availableBlocks = [
      'auth', 'payments', 'calendar', 'notifications', 'analytics',
      'storage', 'webhooks', 'email-workflows', 'feature-flags',
      'advanced-multi-tenant', 'ai-chat', 'social-media-integration',
    ]

    const prompt = `You are a SaaS architect. Map the following niche to a SaaS blueprint.

Niche: "${niche}"

Available blocks: ${availableBlocks.join(', ')}

Respond with a JSON object (no markdown) with these exact fields:
{
  "category": "one of: fitness-wellness|hospitality-booking|ecommerce-retail|professional-services|education-learning|healthcare|real-estate|finance-accounting|hr-recruitment|marketing-analytics|project-management|communication|other",
  "blocks": ["array of 3-7 blocks from available list"],
  "coreFeatures": ["array of 5-8 core features as strings"],
  "databaseTables": ["array of 5-10 table names in snake_case"],
  "suggestedAppName": "A catchy 2-word app name",
  "suggestedTagline": "A one-line value proposition",
  "pricingModel": "subscription|usage-based|freemium|one-time",
  "targetPersona": "Who is the primary user",
  "estimatedComplexity": "simple|medium|complex"
}`

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(content)

    return {
      niche,
      normalizedNiche: normalized,
      category: parsed.category || 'other',
      blocks: parsed.blocks || ['auth', 'payments'],
      coreFeatures: parsed.coreFeatures || [],
      databaseTables: parsed.databaseTables || ['users'],
      suggestedAppName: parsed.suggestedAppName || this.generateAppName(niche),
      suggestedTagline: parsed.suggestedTagline || '',
      pricingModel: parsed.pricingModel || 'subscription',
      targetPersona: parsed.targetPersona || 'Small business owner',
      estimatedComplexity: parsed.estimatedComplexity || 'medium',
      confidence: 0.75,
    }
  }

  private generateAppName(niche: string): string {
    const words = niche.split('-')
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + 'App'
  }

  private generateTagline(niche: string, category: string): string {
    const taglines: Record<string, string> = {
      'fitness-wellness': 'Manage your fitness business with ease',
      'hospitality-booking': 'Streamline bookings and delight your customers',
      'ecommerce-retail': 'Sell more, manage less',
      'professional-services': 'Run your practice like a pro',
      'education-learning': 'Educate, engage, and grow',
      'healthcare': 'Better care through better software',
      'real-estate': 'Manage properties, not paperwork',
      'finance-accounting': 'Your finances, under control',
      'hr-recruitment': 'Build great teams, effortlessly',
      'marketing-analytics': 'Data-driven growth for modern businesses',
      'project-management': 'Ship faster, collaborate better',
    }
    return taglines[category] || `The modern platform for ${niche.replace(/-/g, ' ')}`
  }
}
