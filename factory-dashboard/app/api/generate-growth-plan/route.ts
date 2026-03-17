import { NextResponse } from 'next/server';
import { applyRateLimit } from '../../../lib/rate-limit';
import { GrowthHackerAgent } from '../../../../factory-brain/src/growth-hacker-agent';

export async function POST(request: Request) {
  // Rate limit: 10 AI generation requests per minute per IP
  const limited = applyRateLimit(request, { limit: 10, window: 60 });
  if (limited) return limited;

  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description parameter is missing' }, { status: 400 });
    }

    const growthHackerAgent = new GrowthHackerAgent();
    const plan = await growthHackerAgent.generateGrowthPlan(description);

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Growth Plan Generation API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
