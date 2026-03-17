import { NextResponse } from 'next/server';
import { ArchitectAgent } from '../../../../factory-brain/src/architect-agent';

export async function POST(request: Request) {
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
