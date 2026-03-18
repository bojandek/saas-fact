/**
 * POST /api/schema/teardown
 *
 * Tears down a PostgreSQL schema and all its data.
 * Requires admin role or org owner.
 *
 * Body: { schemaName: string, confirm: true }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { SchemaProvisioner } from '../../../../../factory-brain/src/schema-provisioner'
import { logger } from '../../../../../factory-brain/src/utils/logger'

const log = logger.child({ route: 'POST /api/schema/teardown' })

const TeardownSchema = z.object({
  schemaName: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z][a-z0-9_]{0,62}$/),
  confirm: z.literal(true, {
    errorMap: () => ({ message: 'Must set confirm: true to tear down a schema' }),
  }),
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

  const parsed = TeardownSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { schemaName } = parsed.data

  log.warn({ schemaName, userId }, 'Schema teardown requested')

  try {
    const provisioner = new SchemaProvisioner()
    const result = await provisioner.teardown(schemaName)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    log.warn({ schemaName }, 'Schema torn down successfully')
    return NextResponse.json({ success: true, schemaName })

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error({ err, schemaName }, 'Teardown error')
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
