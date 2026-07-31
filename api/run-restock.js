// Vercel serverless function — start the burn-engine workflow on demand.
//
// Called by the HQ Restock panel: automatically after a VA uploads a new
// Amazon export, and from the manual "Refresh" button. It asks the existing
// GitHub Actions workflow (burn-engine-daily.yml, which already supports manual
// triggers) to run now, so the panel can refresh without waiting for the 7am /
// 1pm scheduled runs.
//
// The GitHub token lives ONLY here (server side, never shipped to the browser).
// It should be a fine-grained PAT scoped to the haven-turnover repo with
// Actions: read and write — its entire power is starting this one workflow.
// Set it as GITHUB_DISPATCH_TOKEN in the HQ project's Vercel env.

const OWNER = 'stephensilverknights-gif'
const REPO = 'haven-turnover'
const WORKFLOW = 'burn-engine-daily.yml'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN
  if (!token) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'GITHUB_DISPATCH_TOKEN is not set on the HQ project.',
    })
  }

  try {
    const gh = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'haven-hq-restock',
        },
        body: JSON.stringify({ ref: 'main' }),
      }
    )

    // GitHub returns 204 (No Content) on success; accept any 2xx.
    if (gh.status >= 200 && gh.status < 300) {
      return res.status(202).json({ ok: true })
    }

    const body = await gh.text().catch(() => '')
    return res.status(502).json({
      error: 'dispatch_failed',
      status: gh.status,
      message: body.slice(0, 300) || 'GitHub rejected the dispatch.',
    })
  } catch (e) {
    return res.status(502).json({
      error: 'dispatch_error',
      message: String(e?.message ?? e).slice(0, 300),
    })
  }
}
