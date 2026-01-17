export async function GET() {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    // latest release
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
        },
        cache: "no-store",
    });

    if (!r.ok) return new Response(await r.text(), { status: r.status });

    const rel = await r.json();
    const asset = (rel.assets || []).find((a: any) => (a.name || "").toLowerCase().endsWith(".apk"));

    if (!asset) return Response.json({ ok: false, error: "No APK found in latest release" }, { status: 404 });

    // Use browser_download_url for direct download
    return Response.json({ ok: true, url: asset.browser_download_url, name: asset.name });
}
