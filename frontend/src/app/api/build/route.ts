import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const workflow = process.env.WORKFLOW_FILE
  const token = process.env.GITHUB_TOKEN

  // Parse credentials from request body
  let username = ''
  let password = ''

  try {
    const body = await request.json()
    username = body.username || ''
    password = body.password || ''
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!username || !password) {
    return new Response('Username and password are required', { status: 400 })
  }

  // Get current time before dispatch (to filter runs created after this)
  const dispatchTime = new Date().toISOString()

  // Dispatch the workflow
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          username,
          password,
        },
      }),
    },
  )

  if (!r.ok) {
    return new Response(await r.text(), { status: r.status })
  }

  // Poll to find the newly created run (GitHub doesn't return run_id from dispatch)
  // We look for runs created after our dispatch time
  let runId: number | null = null

  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500)) // Wait 1.5s between attempts

    const runsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=5&created=>${dispatchTime}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      },
    )

    if (runsRes.ok) {
      const data = await runsRes.json()
      // Find a run that was created after our dispatch
      const run = data.workflow_runs?.find(
        (r: any) => new Date(r.created_at) >= new Date(dispatchTime),
      )
      if (run) {
        runId = run.id
        break
      }
    }
  }

  if (!runId) {
    // Fallback: get the most recent run if we couldn't find the exact one
    const fallbackRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs?per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      },
    )
    if (fallbackRes.ok) {
      const data = await fallbackRes.json()
      runId = data.workflow_runs?.[0]?.id || null
    }
  }

  return Response.json({ ok: true, runId })
}
