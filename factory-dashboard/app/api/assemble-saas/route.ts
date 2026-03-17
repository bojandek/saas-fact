import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '../../../lib/rate-limit'
import { withAuth, withValidation, AssembleSaasSchema } from '../../../lib/api-helpers'
import { AssemblerAgent } from '../../../../factory-brain/src/assembler-agent'

export const POST = withAuth(
  withValidation(AssembleSaasSchema, async (req: NextRequest, { body }) => {
    // Stricter rate limit for full assembly (expensive operation)
    const limited = applyRateLimit(req, { limit: 3, window: 60 })
    if (limited) return limited

    const { appName, description, blueprint, theme } = body
    const assemblerAgent = new AssemblerAgent()
    const result = await assemblerAgent.assemble({
      appName,
      saasDescription: description,
      theme: theme ?? {},
      blueprint,
    })
    return NextResponse.json({ message: result })
  })
)
