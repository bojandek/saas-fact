import { NextResponse } from 'next/server';
import { ComplianceCheckerAgent } from '../../../../factory-brain/src/compliance-checker-agent';

export async function POST(request: Request) {
  try {
    const { saasDescription, generatedTheme, generatedBlueprint, generatedLandingPage, generatedGrowthPlan } = await request.json();

    if (!saasDescription) {
      return NextResponse.json({ error: 'SaaS description is missing' }, { status: 400 });
    }

    const complianceCheckerAgent = new ComplianceCheckerAgent();
    const results = await complianceCheckerAgent.checkCompliance(
      saasDescription,
      generatedTheme,
      generatedBlueprint,
      generatedLandingPage,
      generatedGrowthPlan
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Compliance Check API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
