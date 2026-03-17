import { NextResponse } from 'next/server';
import { applyRateLimit } from '../../../lib/rate-limit';
import { AssemblerAgent } from '../../../../factory-brain/src/assembler-agent';

export async function POST(request: Request) {
  // Rate limit: 10 AI generation requests per minute per IP
  const limited = applyRateLimit(request, { limit: 10, window: 60 });
  if (limited) return limited;

  try {
    const { appName, saasDescription, theme, blueprint } = await request.json();

    if (!appName || !saasDescription || !theme || !blueprint) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const assemblerAgent = new AssemblerAgent();
    const result = await assemblerAgent.assemble({ appName, saasDescription, theme, blueprint });

    return NextResponse.json({ message: result });
  } catch (error) {
    console.error('Assembler Agent API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
