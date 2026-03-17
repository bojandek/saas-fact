import { NextResponse } from 'next/server';
import { QaAgent } from '../../../../factory-brain/src/qa-agent';
import { AgentContext } from '../../../../factory-brain/src/war-room-orchestrator';

export async function POST(req: Request) {
  try {
    const { saasDescription, appName, generatedTheme, generatedBlueprint, generatedLandingPage, generatedGrowthPlan, context } = await req.json();

    if (!saasDescription || !appName || !generatedTheme || !generatedBlueprint || !generatedLandingPage || !generatedGrowthPlan) {
      return NextResponse.json({ error: 'Missing required fields for QA test generation' }, { status: 400 });
    }

    const qaAgent = new QaAgent(context);
    const { tests, messages, context: newContext } = await qaAgent.generateTests({
      saasDescription,
      appName,
      generatedTheme,
      generatedBlueprint,
      generatedLandingPage,
      generatedGrowthPlan,
      context,
    });

    return NextResponse.json({ tests, messages, context: newContext });
  } catch (error) {
    console.error('Error generating QA tests:', error);
    return NextResponse.json({ error: 'Failed to generate QA tests' }, { status: 500 });
  }
}
