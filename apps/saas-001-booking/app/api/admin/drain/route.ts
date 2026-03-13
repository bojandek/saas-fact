import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface DrainRequest {
  region: string
  gracePeriodSeconds?: number
  reason?: string
}

interface DrainResponse {
  success: boolean
  message: string
  region: string
  drainStarted: string
  gracePeriod: number
  estimatedDrainTime: string
  activeConnections?: number
  timestamp: string
}

/**
 * Admin API: Drain traffic from region before failover
 * POST /api/admin/drain/{region}
 *
 * Signals to load balancer that this region should stop accepting new connections
 * Existing connections continue until timeout or explicit close
 *
 * Required headers:
 * - X-Admin-Key: Admin API key
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
      console.warn('[Admin API] Unauthorized drain attempt')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Extract region and options
    let targetRegion = params?.region
    let body: Partial<DrainRequest> = {}

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

    const gracePeriodSeconds = body.gracePeriodSeconds || 30

    // 3. Import FailoverController to initiate drain
    const { getFailoverController } = await import('@saas-factory/operations')
    const failoverController = getFailoverController()

    // 4. Start draining region
    const drainResult = await failoverController.drainRegion(
      targetRegion,
      gracePeriodSeconds
    )

    if (!drainResult.success) {
      console.error('[Admin API] Drain failed:', drainResult.error)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to drain region: ${drainResult.error}`,
        },
        { status: 500 }
      )
    }

    // 5. Calculate estimated drain time (grace period + buffer for graceful shutdown)
    const estimatedDrainMs = (gracePeriodSeconds + 10) * 1000

    // 6. Log audit trail
    console.log(
      `[Admin API] Drain initiated: ${targetRegion} (grace_period: ${gracePeriodSeconds}s, reason: ${body.reason || 'manual'})`
    )

    const response: DrainResponse = {
      success: true,
      message: `Draining traffic from region ${targetRegion}`,
      region: targetRegion,
      drainStarted: new Date().toISOString(),
      gracePeriod: gracePeriodSeconds,
      estimatedDrainTime: `${Math.ceil(estimatedDrainMs / 1000)}s`,
      activeConnections: drainResult.activeConnections,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      status: 202, // 202 Accepted - operation in progress
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Retry-After': Math.ceil(estimatedDrainMs / 1000).toString(),
      },
    })
  } catch (error) {
    console.error('[Admin API] drain error:', error)
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
 * Admin API: Get drain status
 * GET /api/admin/drain/{region}
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { region?: string } }
) {
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

    const targetRegion = params?.region

    if (!targetRegion) {
      return NextResponse.json(
        { success: false, error: 'Region parameter required' },
        { status: 400 }
      )
    }

    // Get drain status from FailoverController
    const { getFailoverController } = await import('@saas-factory/operations')
    const failoverController = getFailoverController()

    const drainStatus = await failoverController.getDrainStatus(targetRegion)

    return NextResponse.json(
      {
        success: true,
        region: targetRegion,
        draining: drainStatus.draining,
        activeConnections: drainStatus.activeConnections,
        drainStartTime: drainStatus.drainStartTime,
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
    console.error('[Admin API] drain GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
