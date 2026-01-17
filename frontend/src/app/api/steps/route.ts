export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('run_id')

  if (!runId) {
    return Response.json({ error: 'run_id is required' }, { status: 400 })
  }

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN

  // Get jobs for the workflow run
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
    },
  )

  if (!r.ok) {
    return new Response(await r.text(), { status: r.status })
  }

  const data = await r.json()
  const job = data.jobs?.[0]

  if (!job) {
    return Response.json({ steps: [], jobStatus: 'pending' })
  }

  // Map steps to our format
  const steps = (job.steps || []).map((step: any) => ({
    name: step.name,
    status: step.status, // queued | in_progress | completed
    conclusion: step.conclusion, // success | failure | skipped | null
  }))

  return Response.json({
    steps,
    jobStatus: job.status,
    jobConclusion: job.conclusion,
  })
}
