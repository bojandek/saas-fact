/**
 * Cost Summary API Route
 * Returns AI API usage and cost breakdown for the dashboard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { costTracker, CostTracker } from '../../../../factory-brain/src/cost-tracker'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId') || undefined
  const tenantId = searchParams.get('tenantId') || undefined

  const summary = costTracker.getSummary({ projectId, tenantId })
  const records = costTracker.getRecords({ projectId, tenantId }).slice(-50) // Last 50 records

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
}
