import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation, SaasDescriptionSchema } from '../../../lib/api-helpers'
import { SqlGenerator } from '../../../../factory-brain/src/sql-generator'

export const POST = withAuth(
  withValidation(SaasDescriptionSchema, async (req: NextRequest, { body }) => {
    const limited = applyRateLimit(req, { limit: 10, window: 60 })
    if (limited) return limited

    const sqlGenerator = new SqlGenerator()
    const sqlSchema = await sqlGenerator.generateSqlSchema(body.description)
    return NextResponse.json({ sql: sqlSchema })
  })
)
