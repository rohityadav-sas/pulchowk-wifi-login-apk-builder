export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const runId = searchParams.get('run_id')

  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const token = process.env.GITHUB_TOKEN

  // If run_id is provided, find the release created by that run
  if (runId) {
    // First, get the run details to find the tag
    const runRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      },
    )

    if (!runRes.ok) {
      return new Response(await runRes.text(), { status: runRes.status })
    }

    const run = await runRes.json()
    // The tag format is "apk-{run_id}" as defined in build-apk.yml
    const expectedTag = `apk-${runId}`

    // Find release with this tag
    const relRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/tags/${expectedTag}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        cache: 'no-store',
      },
    )

    if (!relRes.ok) {
      // Release might not exist yet
      return Response.json(
        { ok: false, error: 'Release not found yet' },
        { status: 404 },
      )
    }

    const rel = await relRes.json()
    const asset = (rel.assets || []).find((a: any) =>
      (a.name || '').toLowerCase().endsWith('.apk'),
    )

    if (!asset) {
      return Response.json(
        { ok: false, error: 'No APK found in release' },
        { status: 404 },
      )
    }

    return Response.json({
      ok: true,
      url: asset.browser_download_url,
      name: asset.name,
      tag: expectedTag,
    })
  }

  // Fallback: get the latest release (for backward compatibility)
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
    },
  )

  if (!r.ok) return new Response(await r.text(), { status: r.status })

  const rel = await r.json()
  const asset = (rel.assets || []).find((a: any) =>
    (a.name || '').toLowerCase().endsWith('.apk'),
  )

  if (!asset)
    return Response.json(
      { ok: false, error: 'No APK found in latest release' },
      { status: 404 },
    )

  return Response.json({
    ok: true,
    url: asset.browser_download_url,
    name: asset.name,
  })
}
