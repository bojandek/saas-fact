import { NextResponse } from 'next/server';
import { CoolifyDeployAgent } from '../../../../factory-brain/src/coolify-deploy-agent';

export async function POST(request: Request) {
  try {
    const { appName, gitRepository, branch, environment, domain } = await request.json();

    if (!appName || !gitRepository || !branch || !environment) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const coolifyDeployAgent = new CoolifyDeployAgent();
    const result = await coolifyDeployAgent.deployApplication({
      appName,
      gitRepository,
      branch,
      environment,
      domain,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Deploy API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get('deploymentId');

    if (!deploymentId) {
      return NextResponse.json({ error: 'deploymentId parameter is missing' }, { status: 400 });
    }

    const coolifyDeployAgent = new CoolifyDeployAgent();
    const result = await coolifyDeployAgent.checkDeploymentStatus(deploymentId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Deploy status check API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
