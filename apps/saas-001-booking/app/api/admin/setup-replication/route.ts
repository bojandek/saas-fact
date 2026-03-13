import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface SetupReplicationRequest {
  sourceRegion: string
  targetRegion: string
  replicationMode?: 'logical' | 'physical' | 'streaming'
  priority?: number
}

interface SetupReplicationResponse {
  success: boolean
  message: string
  sourceRegion: string
  targetRegion: string
  replicationMode: string
  status: 'initializing' | 'syncing' | 'active'
  replicationLag?: number
  timestamp: string
  details?: Record<string, any>
}

/**
 * Admin API: Setup replication between regions
 * POST /api/admin/setup-replication
 *
 * Initializes cross-region replication from source to target.
 * Uses ReplicationCoordinator to sync data with conflict resolution.
 *
 * Required headers:
 * - X-Admin-Key: Admin API key
 *
 * Use cases:
 * - Add new region to replication topology
 * - Add tertiary region for disaster recovery
 * - Re-establish replication after network partition
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Validate admin authentication
    const adminKey = req.headers.get('X-Admin-Key')
    const expectedKey = process.env.HA_ADMIN_KEY

    if (!adminKey || !expectedKey || adminKey !== expectedKey) {
      console.warn('[Admin API] Unauthorized setup-replication attempt')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    let body: Partial<SetupReplicationRequest> = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      )
    }

    // 3. Validate required parameters
    const { sourceRegion, targetRegion, replicationMode = 'streaming', priority = 10 } = body

    if (!sourceRegion || !targetRegion) {
      return NextResponse.json(
        {
          success: false,
          error: 'sourceRegion and targetRegion are required',
        },
        { status: 400 }
      )
    }

    if (sourceRegion === targetRegion) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source and target regions must be different',
        },
        { status: 400 }
      )
    }

    // 4. Import ReplicationCoordinator and FailoverController
    const { getReplicationCoordinator } = await import('@saas-factory/db')
    const { getFailoverController } = await import('@saas-factory/operations')

    const replicationCoordinator = getReplicationCoordinator()
    const failoverController = getFailoverController()

    // 5. Validate regions are known
    const regionStatus = await failoverController.getRegionStatus()
    const validRegions = Object.keys(regionStatus || {})

    if (!validRegions.includes(sourceRegion)) {
      return NextResponse.json(
        {
          success: false,
          error: `Source region "${sourceRegion}" not found. Valid regions: ${validRegions.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (!validRegions.includes(targetRegion)) {
      return NextResponse.json(
        {
          success: false,
          error: `Target region "${targetRegion}" not found. Valid regions: ${validRegions.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // 6. Setup replication link
    const setupResult = await replicationCoordinator.setupReplicationLink(
      sourceRegion,
      targetRegion,
      {
        mode: replicationMode as any,
        priority,
      }
    )

    if (!setupResult.success) {
      console.error('[Admin API] Replication setup failed:', setupResult.error)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to setup replication: ${setupResult.error}`,
        },
        { status: 500 }
      )
    }

    // 7. Wait for initial sync to complete or reach acceptable replication lag
    const maxWaitMs = 30000 // 30 seconds max wait
    const startSync = Date.now()
    let replicationLag = setupResult.replicationLag || 0

    while (replicationLag > 1000 && Date.now() - startSync < maxWaitMs) {
      // Check every 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const lagCheck = await replicationCoordinator.getReplicationLag(sourceRegion, targetRegion)
      replicationLag = lagCheck || 0
    }

    // 8. Log audit trail
    console.log(
      `[Admin API] Replication setup: ${sourceRegion} → ${targetRegion} (mode: ${replicationMode}, lag: ${replicationLag}ms, total_time: ${Date.now() - startTime}ms)`
    )

    const response: SetupReplicationResponse = {
      success: true,
      message: `Replication link established: ${sourceRegion} → ${targetRegion}`,
      sourceRegion,
      targetRegion,
      replicationMode,
      status: replicationLag < 5000 ? 'active' : replicationLag < 30000 ? 'syncing' : 'initializing',
      replicationLag,
      timestamp: new Date().toISOString(),
      details: {
        executionTime: `${Date.now() - startTime}ms`,
        syncTime: `${Date.now() - startSync}ms`,
        priority,
      },
    }

    return NextResponse.json(response, {
      status: 201, // 201 Created
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Admin API] setup-replication error:', error)
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
 * Admin API: Get replication status
 * GET /api/admin/setup-replication?source={sourceRegion}&target={targetRegion}
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

    // Extract query parameters
    const { searchParams } = new URL(req.url)
    const sourceRegion = searchParams.get('source')
    const targetRegion = searchParams.get('target')

    if (!sourceRegion || !targetRegion) {
      return NextResponse.json(
        {
          success: false,
          error: 'source and target query parameters required',
        },
        { status: 400 }
      )
    }

    // Get replication status
    const { getReplicationCoordinator } = await import('@saas-factory/db')
    const replicationCoordinator = getReplicationCoordinator()

    const lag = await replicationCoordinator.getReplicationLag(sourceRegion, targetRegion)
    const eventCount = await replicationCoordinator.getEventQueueLength(sourceRegion, targetRegion)

    return NextResponse.json(
      {
        success: true,
        sourceRegion,
        targetRegion,
        replicationLag: lag,
        pendingEvents: eventCount,
        healthy: lag! < 5000,
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
    console.error('[Admin API] setup-replication GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
