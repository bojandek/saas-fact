import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface PromotePrimaryRequest {
  region: string
  reason?: string
}

interface PromotePrimaryResponse {
  success: boolean
  message: string
  previousPrimary?: string
  newPrimary: string
  timestamp: string
  details?: Record<string, any>
}

/**
 * Admin API: Promote secondary region to primary
 * POST /api/admin/promote-primary/{region}
 *
 * Required headers:
 * - X-Admin-Key: Admin API key from environment
 *
 * Use cases:
 * - Manual failover during maintenance
 * - Regional promotion after primary failure
 * - Load balancing across regions
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { region?: string } }
) {
  const startTime = Date.now()

  try {
    // 1. Validate admin authentication
    const adminKey = req.headers.get('X-Admin-Key')
    const expectedKey = process.env.HA_ADMIN_KEY

    if (!adminKey || !expectedKey || adminKey !== expectedKey) {
      console.warn('[Admin API] Unauthorized promote-primary attempt')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Extract region from params or body
    let targetRegion = params?.region
    let body: Partial<PromotePrimaryRequest> = {}

    if (!targetRegion && req.body) {
      try {
        body = await req.json()
        targetRegion = body.region
      } catch {
        // Body parse error, continue
      }
    }

    if (!targetRegion) {
      return NextResponse.json(
        { success: false, error: 'Region parameter required' },
        { status: 400 }
      )
    }

    // 3. Import FailoverController singleton
    const { getFailoverController } = await import('@saas-factory/operations')
    const failoverController = getFailoverController()

    // 4. Execute promotion
    const result = await failoverController.promoteRegionToPrimary(targetRegion)

    if (!result.success) {
      console.error('[Admin API] Promotion failed:', result.error)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to promote region: ${result.error}`,
          details: result,
        },
        { status: 500 }
      )
    }

    // 5. Log audit trail
    console.log(
      `[Admin API] Region promoted: ${targetRegion} (reason: ${body.reason || 'manual'}, latency: ${Date.now() - startTime}ms)`
    )

    const response: PromotePrimaryResponse = {
      success: true,
      message: `Region ${targetRegion} promoted to primary`,
      previousPrimary: result.previousPrimary,
      newPrimary: targetRegion,
      timestamp: new Date().toISOString(),
      details: {
        executionTime: `${Date.now() - startTime}ms`,
        reason: body.reason || 'manual',
        replicationLag: result.replicationLag || 0,
      },
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Admin API] promote-primary error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Admin API: Get promotion status
 * GET /api/admin/promote-primary
 */
export async function GET(req: NextRequest) {
  try {
    // Validate authentication
    const adminKey = req.headers.get('X-Admin-Key')
    const expectedKey = process.env.HA_ADMIN_KEY

    if (!adminKey || !expectedKey || adminKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current region status
    const { getFailoverController } = await import('@saas-factory/operations')
    const failoverController = getFailoverController()

    const regionStatus = await failoverController.getRegionStatus()

    return NextResponse.json(
      {
        success: true,
        regions: regionStatus,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('[Admin API] promote-primary GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
