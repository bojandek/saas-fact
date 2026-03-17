/**
 * Cost Summary API Route
 * Returns AI API usage and cost breakdown for the dashboard.
 * Protected: requires authentication.
 */
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '../../../lib/api-helpers'
import { costTracker, CostTracker } from '../../../../factory-brain/src/cost-tracker'

export const GET = withAuth(async (request: NextRequest, { userId }) => {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId') || undefined
  // Scope cost summary to the authenticated user by default
  const tenantId = searchParams.get('tenantId') || userId

  const summary = costTracker.getSummary({ projectId, tenantId })
  const records = costTracker.getRecords({ projectId, tenantId }).slice(-50)

  return NextResponse.json({
    summary: {
      ...summary,
      totalCostFormatted: CostTracker.formatCost(summary.totalCostUSD),
    },
    recentRecords: records.map((r) => ({
      ...r,
      costFormatted: CostTracker.formatCost(r.costUSD),
    })),
  })
})
