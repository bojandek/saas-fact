import { NextResponse } from 'next/server';
import { applyRateLimit } from '../../../lib/rate-limit';
import { LandingPageGenerator } from '../../../../factory-brain/src/landing-page-generator';

export async function POST(request: Request) {
  // Rate limit: 10 AI generation requests per minute per IP
  const limited = applyRateLimit(request, { limit: 10, window: 60 });
  if (limited) return limited;

  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Description parameter is missing' }, { status: 400 });
    }

    const landingPageGenerator = new LandingPageGenerator();
    const content = await landingPageGenerator.generateContent(description);

    return NextResponse.json(content);
  } catch (error) {
    console.error('Landing Page Generation API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
