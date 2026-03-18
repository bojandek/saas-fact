/**
 * POST /api/schema/provision
 *
 * Provisions a new PostgreSQL schema for a SaaS app.
 * Called by the CLI's `factory create --provision-schema` flag
 * and by the AssemblerAgent during autonomous generation.
 *
 * Body:
 *   {
 *     schemaName: string,   // e.g. "teretana_crm"
 *     appName: string,      // e.g. "teretana-crm"
 *     orgId?: string,       // UUID
 *     niche?: string,       // e.g. "teretana-crm"
 *     blocks?: string[],    // e.g. ["auth", "payments", "calendar"]
 *     migrationSQL?: string // Optional SQL to run after provisioning
 *   }
 *
 * Response:
 *   { success: true, schemaName, provisionedAt, migrationsRun }
 *   { success: false, error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SchemaProvisioner } from '../../../../../factory-brain/src/schema-provisioner'
import { logger } from '../../../../../factory-brain/src/utils/logger'

const log = logger.child({ route: 'POST /api/schema/provision' })

const ProvisionSchema = z.object({
  schemaName: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z][a-z0-9_]{0,62}$/, 'Schema name must match ^[a-z][a-z0-9_]{0,62}$'),
  appName: z.string().min(1).max(100),
  orgId: z.string().uuid().optional(),
  niche: z.string().optional(),
  blocks: z.array(z.string()).optional(),
  migrationSQL: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ProvisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { schemaName, appName, orgId, niche, blocks, migrationSQL } = parsed.data

  log.info({ schemaName, appName, orgId, userId }, 'Schema provision request')

  try {
    const provisioner = new SchemaProvisioner()
    const result = await provisioner.provision({
      schemaName,
      appName,
      orgId,
      niche,
      blocks,
      migrationSQL,
    })

    if (!result.success) {
      log.warn({ schemaName, error: result.error }, 'Schema provisioning failed')
      return NextResponse.json({ success: false, error: result.error }, { status: 409 })
    }

    log.info({ schemaName, migrationsRun: result.migrationsRun }, 'Schema provisioned')
    return NextResponse.json(result)

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error({ err, schemaName }, 'Unexpected error')
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}

/**
 * GET /api/schema/provision?orgId=<uuid>
 *
 * Lists all provisioned schemas for an org.
 */
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = req.nextUrl.searchParams.get('orgId') || undefined

  try {
    const provisioner = new SchemaProvisioner()
    const schemas = await provisioner.listSchemas(orgId)
    return NextResponse.json({ schemas })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error({ err }, 'Failed to list schemas')
    return NextResponse.json({ error }, { status: 500 })
  }
}
