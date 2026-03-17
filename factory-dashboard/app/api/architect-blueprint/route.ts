import { NextResponse } from 'next/server';
import { applyRateLimit } from '../../../lib/rate-limit';
import { ArchitectAgent } from '../../../../factory-brain/src/architect-agent';

export async function POST(request: Request) {
  // Rate limit: 10 AI generation requests per minute per IP
  const limited = applyRateLimit(request, { limit: 10, window: 60 });
  if (limited) return limited;

  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description parameter is missing' }, { status: 400 });
    }

    const architectAgent = new ArchitectAgent();
    const blueprint = await architectAgent.generateBlueprint(description);

    return NextResponse.json(blueprint);
  } catch (error) {
    console.error('Architect Agent API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
