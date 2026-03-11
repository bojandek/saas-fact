/**
 * Deploy endpoint for Coolify integration
 * Triggers deployment via Coolify API
 */

export async function POST(request: Request) {
  const { projectId, repository, branch } = await request.json()

  const coolifyToken = process.env.COOLIFY_API_TOKEN
  const coolifyUrl = process.env.COOLIFY_URL

  if (!coolifyToken || !coolifyUrl) {
    return Response.json(
      { error: 'Coolify not configured' },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(`${coolifyUrl}/api/v1/deploy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${coolifyToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository,
        branch,
        auto_deploy: true,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return Response.json({ error: data.error }, { status: response.status })
    }

    return Response.json({ 
      success: true, 
      deploymentId: data.id,
      message: 'Deployment initiated'
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to trigger deployment' },
      { status: 500 }
    )
  }
}
