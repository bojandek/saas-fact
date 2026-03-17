/**
 * GET /api/billing/usage
 * Returns usage summary for the current org in the billing period.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUsageBillingService } from '@saas-factory/factory-brain/billing/usage-billing'
import type { BillingTier } from '@saas-factory/factory-brain/billing/usage-billing'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.headers.get('x-user-id')
  const orgId = request.headers.get('x-org-id')

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // In production: fetch tier from org record in database
  const tier: BillingTier = (request.headers.get('x-org-tier') as BillingTier) ?? 'free'

  try {
    const billingService = getUsageBillingService()
    const [summary, allowed] = await Promise.all([
      billingService.getUsageSummary(orgId, tier),
      billingService.checkGenerationAllowed(orgId, tier),
    ])

    return NextResponse.json({
      summary,
      canGenerate: allowed.allowed,
      upgradeRequired: !allowed.allowed,
      upgradeUrl: allowed.upgradeUrl,
      upgradeReason: allowed.reason,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
