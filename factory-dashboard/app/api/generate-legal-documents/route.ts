/**
 * API Route for Legal & Terms Generation
 * Generates GDPR-compliant legal documents for new SaaS applications
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation } from '../../../lib/api-helpers'
import { LegalTermsGenerator } from '../../../../factory-brain/src/legal-terms-generator'

const LegalDocsSchema = z.object({
  companyName: z.string().min(2).max(200),
  companyEmail: z.string().email('Invalid company email'),
  companyAddress: z.string().max(500).optional(),
  appName: z.string().min(2).max(100),
  appDescription: z.string().max(2000).optional(),
  dataProcessing: z.array(z.string()).max(20).optional(),
  thirdPartyServices: z.array(z.string()).max(20).optional(),
  jurisdiction: z.enum(['EU', 'US', 'UK', 'GLOBAL']).optional().default('EU'),
})

export const POST = withAuth(
  withValidation(LegalDocsSchema, async (req: NextRequest, { body }) => {
    const limited = applyRateLimit(req, { limit: 5, window: 60 })
    if (limited) return limited

    const {
      companyName,
      companyEmail,
      companyAddress,
      appName,
      appDescription,
      dataProcessing,
      thirdPartyServices,
      jurisdiction,
    } = body

    const documents = LegalTermsGenerator.generateAllDocuments({
      companyName,
      companyEmail,
      companyAddress: companyAddress ?? 'Not provided',
      appName,
      appDescription: appDescription ?? 'A SaaS application',
      dataProcessing: dataProcessing ?? ['user_emails', 'usage_analytics'],
      thirdPartyServices: thirdPartyServices ?? ['stripe', 'supabase'],
      jurisdiction,
    })

    return NextResponse.json({
      success: true,
      documents: documents.map((doc) => ({
        type: doc.type,
        content: doc.content,
        lastUpdated: doc.lastUpdated,
      })),
      timestamp: new Date().toISOString(),
    })
  })
)
